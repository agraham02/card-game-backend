"use strict";
// tests/SpadesGameSocketIntegration.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const http_1 = require("http");
const roomNamespace_1 = require("../../socket/namespaces/roomNamespace");
const RoomManager_1 = require("../../models/room/RoomManager");
describe("Spades Game Socket Integration Tests", () => {
    let ioServer;
    let httpServer;
    let httpServerAddr;
    let roomManager;
    let clientSockets = [];
    beforeAll((done) => {
        // Create HTTP server
        httpServer = (0, http_1.createServer)();
        httpServer.listen(() => {
            httpServerAddr = httpServer.address();
            // Create Socket.IO server
            ioServer = new socket_io_1.Server(httpServer, {
                path: "/socket.io",
                cors: {
                    origin: "*",
                },
            });
            // Initialize RoomManager
            roomManager = new RoomManager_1.RoomManager();
            // Initialize the room namespace
            (0, roomNamespace_1.setupRoomNamespace)(ioServer, roomManager);
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
        const port = httpServerAddr && typeof httpServerAddr !== "string"
            ? httpServerAddr.port
            : 0;
        const playerSockets = {};
        const playerIds = {};
        const playerHands = {};
        // Bids for each player
        const bids = {
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
            const clientSocket = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
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
                }
                else {
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
                if (Object.keys(roomState.players).length === 4) {
                    connectedClients++;
                    if (connectedClients === 4) {
                        // All players have joined; start the game
                        const leaderSocket = playerSockets[playerNames[0]];
                        leaderSocket.emit("START_GAME", {
                            roomId: roomName,
                            playerId: playerIds[playerNames[0]],
                            gameType: "spades",
                        });
                    }
                }
            });
            clientSocket.on("GAME_STARTED", ({ roomId, gameType }) => {
                expect(roomId).toBe(roomName);
                expect(gameType).toBe("spades");
            });
            clientSocket.on("GAME_STATE_UPDATE", ({ gameState }) => {
                // Verify that each client receives their hand
                expect(gameState.hand.length).toBe(13);
                expect(gameState.currentTurnIndex).toBeDefined();
                playerHands[name] = gameState.hand;
                gameStartedClients++;
                if (gameStartedClients === 4) {
                    // All clients have received the game state
                    // Start bidding
                    startBidding();
                }
            });
            clientSocket.on("BID_MADE", ({ playerId, bid, currentTurnIndex }) => {
                bidsMade++;
                if (bidsMade === 4) {
                    // All bids have been made, start playing tricks
                    playTricks();
                }
                else {
                    makeNextBid();
                }
            });
            clientSocket.on("CARD_PLAYED", ({ playerId, card, currentTurnIndex }) => {
                // Update the hand of the player who played the card
                const playerName = Object.keys(playerIds).find((name) => playerIds[name] === playerId);
                playerHands[playerName] = playerHands[playerName].filter((c) => !(c.suit === card.suit && c.value === card.value));
                playNextCard();
            });
            clientSocket.on("TRICK_COMPLETED", ({ winningPlayerId, currentTurnIndex }) => {
                // Check if all cards have been played
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
            makeNextBid();
        }
        function makeNextBid() {
            const room = roomManager.getRoom(roomName);
            const spadesGame = room === null || room === void 0 ? void 0 : room.gameInstance;
            if (!spadesGame)
                return;
            const currentPlayerIndex = spadesGame.gameState.currentTurnIndex;
            const currentPlayerId = spadesGame.turnOrder[currentPlayerIndex];
            const currentPlayerName = spadesGame.players[currentPlayerId].name;
            const bid = bids[currentPlayerName];
            const clientSocket = playerSockets[currentPlayerName];
            clientSocket.emit("PLAYER_ACTION", {
                roomId: roomName,
                playerId: currentPlayerId,
                action: {
                    type: "MAKE_BID",
                    bid: bid,
                },
            });
        }
        // Function to simulate playing tricks
        function playTricks() {
            playNextCard();
        }
        function playNextCard() {
            const room = roomManager.getRoom(roomName);
            const spadesGame = room === null || room === void 0 ? void 0 : room.gameInstance;
            if (!spadesGame)
                return;
            if (cardsPlayed === 4 * 13) {
                // All cards have been played
                // Calculate scores and end game
                spadesGame.calculateScores();
                spadesGame.endGame();
                return;
            }
            const currentPlayerIndex = spadesGame.gameState.currentTurnIndex;
            const currentPlayerId = spadesGame.turnOrder[currentPlayerIndex];
            const currentPlayerName = spadesGame.players[currentPlayerId].name;
            const clientSocket = playerSockets[currentPlayerName];
            const hand = playerHands[currentPlayerName];
            if (hand.length === 0) {
                // No more cards to play
                return;
            }
            const cardToPlay = hand[0]; // For simplicity, play the first card
            hand.shift(); // Remove the card from the player's hand
            clientSocket.emit("PLAYER_ACTION", {
                roomId: roomName,
                playerId: currentPlayerId,
                action: {
                    type: "PLAY_CARD",
                    card: cardToPlay,
                },
            });
            cardsPlayed++;
        }
    });
});
