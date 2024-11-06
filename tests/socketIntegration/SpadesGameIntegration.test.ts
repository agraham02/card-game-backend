// tests/SpadesGameIntegration.test.ts

import { Server } from "socket.io";
import Client, { Socket as ClientSocket } from "socket.io-client";
import { createServer, Server as HttpServer } from "http";
import { setupRoomNamespace } from "../../socket/namespaces/roomNamespace";
import { RoomManager } from "../../models/room/RoomManager";
import { AddressInfo } from "net";
import { Card } from "../../models/game/Card";
import { SpadesGame } from "../../models/game/SpadesGame";

describe("SpadesGame Integration Tests", () => {
    let ioServer: Server;
    let httpServer: HttpServer;
    let httpServerAddr: AddressInfo | string | null;
    let roomManager: RoomManager;
    let clientSockets: ClientSocket[] = [];

    beforeAll((done) => {
        // Create HTTP server
        httpServer = createServer();
        httpServer.listen(() => {
            httpServerAddr = httpServer.address();

            // Create Socket.IO server
            ioServer = new Server(httpServer, {
                path: "/socket.io",
                cors: {
                    origin: "*",
                },
            });

            // Initialize RoomManager
            roomManager = new RoomManager();

            // Initialize the room namespace
            setupRoomNamespace(ioServer, roomManager);

            done();
        });
    });

    afterAll((done) => {
        ioServer.close();
        httpServer.close();
        done();
    });

    afterEach((done) => {
        // Disconnect clients
        clientSockets.forEach((socket) => {
            if (socket.connected) {
                socket.disconnect();
            }
        });
        clientSockets = [];
        roomManager.clearAllRooms();
        done();
    });

    test("should simulate a full game of Spades using sockets", (done) => {
        const roomName = "testRoom";
        const playerNames = ["Alice", "Bob", "Charlie", "Diana"];
        const port =
            httpServerAddr && typeof httpServerAddr !== "string"
                ? httpServerAddr.port
                : 0;

        const playerSockets: { [playerName: string]: ClientSocket } = {};
        const playerIds: { [playerName: string]: string } = {};
        const playerHands: { [playerName: string]: Card[] } = {};

        // Bids for each player
        const bids: { [playerName: string]: number } = {
            Alice: 3,
            Bob: 4,
            Charlie: 2,
            Diana: 4,
        };

        let connectedClients = 0;
        let gameStartedClients = 0;
        let bidsMade = 0;
        let cardsPlayed = 0;
        let gameEndedClients = 0;

        // Set up clients
        playerNames.forEach((name, index) => {
            const clientSocket = Client(`http://localhost:${port}/room`, {
                path: "/socket.io",
            });
            clientSockets.push(clientSocket);
            playerSockets[name] = clientSocket;

            clientSocket.on("connect", () => {
                if (index === 0) {
                    // First player creates the room
                    clientSocket.emit("CREATE_ROOM", {
                        roomName,
                        playerName: name,
                    });
                } else {
                    // Other players join the room
                    clientSocket.emit("JOIN_ROOM", {
                        roomId: roomName,
                        playerName: name,
                    });
                }
            });

            clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
                expect(roomId).toBe(roomName);
                playerIds[name] = playerId;
            });

            clientSocket.on("ROOM_JOINED", ({ roomId, playerId }) => {
                expect(roomId).toBe(roomName);
                playerIds[name] = playerId;
            });

            clientSocket.on("ROOM_STATE_UPDATED", ({ roomState }) => {
                if (roomState.players.length === 4) {
                    connectedClients++;
                    if (connectedClients === 4) {
                        // All players have joined; start the game
                        const leaderSocket = playerSockets[playerNames[0]];
                        leaderSocket.emit("START_GAME", {
                            roomId: roomName,
                            playerId: playerIds[playerNames[0]],
                        });
                    }
                }
            });

            clientSocket.on("GAME_STARTED", ({ gameState }) => {
                // Verify that each client receives their hand
                expect(gameState.hand.length).toBe(13);
                expect(gameState.currentTurnIndex).toBeDefined();
                playerHands[name] = gameState.hand;

                gameStartedClients++;
                if (gameStartedClients === 4) {
                    // All clients have received the game started event
                    // Start bidding
                    startBidding();
                }
            });

            clientSocket.on("BID_MADE", () => {
                bidsMade++;
                if (bidsMade === 4) {
                    // All bids have been made, start playing tricks
                    playTricks();
                }
            });

            clientSocket.on("TRICK_COMPLETED", () => {
                // Wait for all tricks to be played
                if (cardsPlayed === 4 * 13) {
                    // All cards have been played
                    // Wait for scores to be calculated and game to end
                }
            });

            clientSocket.on("GAME_ENDED", () => {
                gameEndedClients++;
                if (gameEndedClients === 4) {
                    done();
                }
            });

            clientSocket.on("ERROR", (data) => {
                done(new Error(`Received error: ${data.message}`));
            });
        });

        // Function to simulate bidding
        function startBidding() {
            const room = roomManager.getRoom(roomName);
            if (!room) {
                done(new Error("Room not found"));
                return;
            }
            const spadesGame = room.gameInstance as SpadesGame;
            if (!spadesGame) {
                done(new Error("Game instance not found"));
                return;
            }

            // Simulate bidding phase
            makeNextBid();
        }

        function makeNextBid() {
            const room = roomManager.getRoom(roomName);
            const spadesGame = room?.gameInstance as SpadesGame;
            if (!spadesGame) return;

            const currentPlayerIndex = spadesGame.gameState.currentTurnIndex;
            const currentPlayerId = spadesGame.turnOrder[currentPlayerIndex];
            const currentPlayerName = Object.keys(playerIds).find(
                (name) => playerIds[name] === currentPlayerId
            )!;
            const bid = bids[currentPlayerName];

            const clientSocket = playerSockets[currentPlayerName];

            clientSocket.emit("PLAYER_ACTION", {
                type: "MAKE_BID",
                bid: bid,
            });
        }

        // Function to simulate playing tricks
        function playTricks() {
            // Start playing the first card
            playNextCard();
        }

        function playNextCard() {
            const room = roomManager.getRoom(roomName);
            const spadesGame = room?.gameInstance as SpadesGame;
            if (!spadesGame) return;

            const currentPlayerIndex = spadesGame.gameState.currentTurnIndex;
            const currentPlayerId = spadesGame.turnOrder[currentPlayerIndex];
            const currentPlayerName = Object.keys(playerIds).find(
                (name) => playerIds[name] === currentPlayerId
            )!;
            const clientSocket = playerSockets[currentPlayerName];
            const hand = playerHands[currentPlayerName];

            if (hand.length === 0) {
                // No more cards to play
                return;
            }

            const cardToPlay = hand.shift(); // Remove the card from the player's hand

            clientSocket.emit("PLAYER_ACTION", {
                type: "PLAY_CARD",
                card: cardToPlay,
            });

            cardsPlayed++;

            if (cardsPlayed === 4 * 13) {
                // All cards have been played
                // Calculate scores and end game
                setTimeout(() => {
                    // Allow some time for the last trick to be processed
                    const spadesGame = room?.gameInstance as SpadesGame;
                    spadesGame.calculateScores();
                    spadesGame.endGame();
                }, 1000);
            } else {
                // Wait for the next turn
                clientSocket.on("CARD_PLAYED", () => {
                    playNextCard();
                });
            }
        }
    });
});
