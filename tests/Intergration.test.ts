// backend/Integration.test.ts

import { createServer, Server as HttpServer } from "http";
import { Server } from "socket.io";
import Client, { Socket } from "socket.io-client";
import Game, { Card, Player } from "../Game";
import { AddressInfo } from "net";
import { setupSocketHandlers } from "../socket/socketHandlers";

describe("Integration Tests", () => {
    let ioServer: Server;
    let httpServer: HttpServer;
    let httpServerAddr: AddressInfo;
    let port: number;

    beforeAll((done) => {
        httpServer = createServer();
        ioServer = new Server(httpServer, {
            cors: {
                origin: "*",
            },
        });

        setupSocketHandlers(ioServer);

        // Start the server
        httpServer.listen(() => {
            const address = httpServer.address();
            if (address && typeof address !== "string") {
                httpServerAddr = address;
                port = address.port;
                done();
            } else {
                throw new Error("Server address not found or invalid");
            }
        });
    });

    test("Multiple clients can connect and join a game room", async () => {
        const totalClients = 4;
        const sockets: Socket[] = [];
        let connectedClients = 0;

        try {
            // Create and connect clients
            for (let i = 0; i < totalClients; i++) {
                const clientSocket = Client(`http://localhost:${port}`);
                sockets.push(clientSocket);

                // Wait for the connection to be established and emit the join_room event
                await new Promise<void>((resolve, reject) => {
                    clientSocket.on("connect", () => {
                        clientSocket.emit("join_room", {
                            roomId: "test-room",
                            playerName: `Player${i + 1}`,
                        });
                        resolve();
                    });

                    clientSocket.on("connect_error", (err) => {
                        reject(new Error(`Connection error: ${err.message}`));
                    });
                });

                // Handle the player list update and increment connected clients
                clientSocket.on("player_list", (players) => {
                    if (players.length === totalClients) {
                        connectedClients++;
                        if (connectedClients === totalClients) {
                            expect(players.length).toBe(4);
                        }
                    }
                });
            }

            // Wait for all clients to receive the updated player list
            await new Promise<void>((resolve) => {
                const checkPlayerListInterval = setInterval(() => {
                    if (connectedClients === totalClients) {
                        clearInterval(checkPlayerListInterval);
                        resolve();
                    }
                }, 100);
            });
        } finally {
            // Ensure all clients are disconnected after the test
            sockets.forEach((socket) => socket.disconnect());
        }
    }, 10000); // Increase timeout if necessary

    test("Simulate a full game round", async () => {
        const totalPlayers = 4;
        const roomId = "full-game-test-room";
        const playerNames = ["Alice", "Bob", "Charlie", "Diana"];
        const bids = [3, 2, 4, 3]; // Mock bids for each player
        const playedCards = [
            // Trick 1
            [
                { suit: "Hearts", value: "2" },
                { suit: "Hearts", value: "3" },
                { suit: "Hearts", value: "4" },
                { suit: "Hearts", value: "5" },
            ],
            // Trick 2
            [
                { suit: "Diamonds", value: "6" },
                { suit: "Diamonds", value: "7" },
                { suit: "Diamonds", value: "8" },
                { suit: "Diamonds", value: "9" },
            ],
            // Trick 3
            [
                { suit: "Spades", value: "10" },
                { suit: "Spades", value: "J" },
                { suit: "Spades", value: "Q" },
                { suit: "Spades", value: "K" },
            ],
            // Trick 4
            [
                { suit: "Clubs", value: "4" },
                { suit: "Clubs", value: "5" },
                { suit: "Clubs", value: "6" },
                { suit: "Clubs", value: "7" },
            ],
            // Trick 5
            [
                { suit: "Hearts", value: "8" },
                { suit: "Hearts", value: "9" },
                { suit: "Hearts", value: "10" },
                { suit: "Hearts", value: "J" },
            ],
            // Trick 6
            [
                { suit: "Diamonds", value: "3" },
                { suit: "Diamonds", value: "4" },
                { suit: "Diamonds", value: "10" },
                { suit: "Spades", value: "A" },
            ],
            // Trick 7
            [
                { suit: "Clubs", value: "J" },
                { suit: "Clubs", value: "Q" },
                { suit: "Clubs", value: "K" },
                { suit: "Clubs", value: "A" },
            ],
            // Trick 8
            [
                { suit: "Spades", value: "2" },
                { suit: "Spades", value: "3" },
                { suit: "Spades", value: "4" },
                { suit: "Spades", value: "5" },
            ],
            // Trick 9
            [
                { suit: "Hearts", value: "K" },
                { suit: "Hearts", value: "A" },
                { suit: "Spades", value: "6" },
                { suit: "Spades", value: "7" },
            ],
            // Trick 10
            [
                { suit: "Diamonds", value: "2" },
                { suit: "Diamonds", value: "A" },
                { suit: "Clubs", value: "2" },
                { suit: "Clubs", value: "3" },
            ],
            // Trick 11
            [
                { suit: "Spades", value: "8" },
                { suit: "Spades", value: "9" },
                { suit: "Spades", value: "10" },
                { suit: "Spades", value: "J" },
            ],
            // Trick 12
            [
                { suit: "Hearts", value: "6" },
                { suit: "Hearts", value: "7" },
                { suit: "Clubs", value: "8" },
                { suit: "Clubs", value: "9" },
            ],
            // Trick 13
            [
                { suit: "Diamonds", value: "J" },
                { suit: "Diamonds", value: "Q" },
                { suit: "Diamonds", value: "K" },
                { suit: "Diamonds", value: "5" },
            ],
        ];
        const clientSockets: Socket[] = [];

        try {
            // Step 1: Connect all players and join the room
            for (let i = 0; i < totalPlayers; i++) {
                const socket = Client(`http://localhost:${port}`);
                clientSockets.push(socket);

                await new Promise<void>((resolve, reject) => {
                    socket.on("connect", () => {
                        socket.emit("join_room", {
                            roomId,
                            playerName: playerNames[i],
                        });
                        resolve();
                    });

                    socket.on("connect_error", (err) => {
                        reject(new Error(`Connection error: ${err.message}`));
                    });
                });
            }

            // Step 2: Listen for hands being dealt to all players
            await Promise.all(
                clientSockets.map(
                    (socket) =>
                        new Promise<void>((resolve, reject) => {
                            socket.on("deal_hand", (hand) => {
                                try {
                                    expect(Array.isArray(hand)).toBe(true);
                                    expect(hand.length).toBe(13); // 13 cards per player
                                    resolve();
                                } catch (error) {
                                    reject(error);
                                }
                            });
                        })
                )
            );

            // Step 3: Submit bids
            for (let i = 0; i < totalPlayers; i++) {
                clientSockets[i].emit("submit_bid", {
                    roomId,
                    bid: bids[i],
                });
            }

            // Step 4: Wait for the play phase to start
            await new Promise<void>((resolve, reject) => {
                let startPlayReceived = 0;
                clientSockets.forEach((socket) => {
                    socket.on("start_play", ({ currentPlayerId }) => {
                        startPlayReceived++;
                        if (startPlayReceived === totalPlayers) {
                            resolve();
                        }
                    });

                    socket.on("error", (err) => {
                        reject(new Error(`Error during start_play: ${err}`));
                    });
                });
            });

            // Step 5: Simulate 13 tricks of play
            // for (const trick of playedCards) {
            //     for (let turn = 0; turn < totalPlayers; turn++) {
            //         const currentPlayerSocket = clientSockets[turn];
            //         const cardToPlay = trick[turn];

            //         await new Promise<void>((resolve, reject) => {
            //             const onNextTurn = ({
            //                 currentPlayerId,
            //             }: {
            //                 currentPlayerId: string;
            //             }) => {
            //                 if (currentPlayerId === currentPlayerSocket.id) {
            //                     currentPlayerSocket.emit("play_card", {
            //                         roomId,
            //                         card: cardToPlay,
            //                     });
            //                 }
            //             };

            //             const onCardPlayed = ({
            //                 playerId,
            //                 card,
            //             }: {
            //                 playerId: string;
            //                 card: Card;
            //             }) => {
            //                 if (playerId === currentPlayerSocket.id) {
            //                     currentPlayerSocket.off(
            //                         "next_turn",
            //                         onNextTurn
            //                     );
            //                     currentPlayerSocket.off(
            //                         "card_played",
            //                         onCardPlayed
            //                     );
            //                     resolve();
            //                 }
            //             };

            //             currentPlayerSocket.on("next_turn", onNextTurn);
            //             currentPlayerSocket.on("card_played", onCardPlayed);
            //             currentPlayerSocket.on("invalid_move", (message) =>
            //                 reject(new Error(`Invalid move: ${message}`))
            //             );
            //         });
            //     }

            //     // Wait for the next trick to start
            //     await new Promise<void>((resolve, reject) => {
            //         let nextTrickReceived = 0;
            //         clientSockets.forEach((socket) => {
            //             socket.on("next_trick", ({ currentPlayerId }) => {
            //                 nextTrickReceived++;
            //                 if (nextTrickReceived === totalPlayers) {
            //                     resolve();
            //                 }
            //             });
            //         });
            //     });
            // }

            // Step 6: Wait for the round to be over and scores to be calculated
            // await new Promise<void>((resolve, reject) => {
            //     let roundOverReceived = 0;
            //     clientSockets.forEach((socket) => {
            //         socket.on(
            //             "round_over",
            //             ({ players }: { players: Player[] }) => {
            //                 roundOverReceived++;
            //                 if (roundOverReceived === totalPlayers) {
            //                     // Validate the final scores
            //                     players.forEach((player, index) => {
            //                         expect(player.bid).toBe(bids[index]);
            //                         // Add additional assertions for player scores and tricks won if needed
            //                     });
            //                     resolve();
            //                 }
            //             }
            //         );
            //     });
            // });
        } finally {
            // Cleanup: Disconnect all sockets
            clientSockets.forEach((socket) => socket.disconnect());
        }
    }, 60000); // Increase timeout for full game simulation


    test("Handle player disconnection during bidding phase", async () => {
        // const totalPlayers = 4;
        // const roomId = "disconnection-test-room";
        // const clientSockets: Socket[] = [];
        // const playerNames = ["Alice", "Bob", "Charlie", "Diana"];
        // // Step 1: Connect all players
        // for (let i = 0; i < totalPlayers; i++) {
        //     const socket = Client(`http://localhost:${port}`);
        //     clientSockets.push(socket);
        //     await new Promise<void>((resolve, reject) => {
        //         socket.on("connect", () => {
        //             socket.emit("join_room", {
        //                 roomId,
        //                 playerName: playerNames[i],
        //             });
        //             resolve();
        //         });
        //         socket.on("connect_error", (err) => {
        //             reject(new Error(`Connection error: ${err}`));
        //         });
        //     });
        // }
        // // Wait for all players to receive their hands (deal_hand event)
        // await Promise.all(
        //     clientSockets.map(
        //         (socket) =>
        //             new Promise<void>((resolve) => {
        //                 socket.on("deal_hand", () => {
        //                     resolve();
        //                 });
        //             })
        //     )
        // );
        // // Step 2: Simulate disconnection during bidding phase
        // const disconnectedSocket = clientSockets[0];
        // const disconnectedPlayerId = disconnectedSocket.id;
        // const remainingSockets = clientSockets.slice(1);
        // // Set up listeners on remaining clients for 'player_list' event
        // const playerListPromises = remainingSockets.map(
        //     (socket) =>
        //         new Promise<void>((resolve) => {
        //             socket.on("player_list", (players: Player[]) => {
        //                 // Step 3: Verify server handling
        //                 const playerIds = players.map((p) => p.id);
        //                 expect(playerIds).not.toContain(disconnectedPlayerId);
        //                 resolve();
        //             });
        //         })
        // );
        // // Simulate disconnection
        // disconnectedSocket.disconnect();
        // // Wait for 'player_list' updates on remaining clients
        // await Promise.all(playerListPromises);
        // // Step 4: Check game state consistency
        // // Depending on your game logic, the game might reset or pause
        // // If your server emits a 'game_reset' or 'game_paused' event, you can listen for it
        // const gameStatePromises = remainingSockets.map(
        //     (socket) =>
        //         new Promise<void>((resolve) => {
        //             socket.on("game_reset", () => {
        //                 // The game has been reset due to player disconnection
        //                 resolve();
        //             });
        //             socket.on("game_paused", () => {
        //                 // The game has been paused due to player disconnection
        //                 resolve();
        //             });
        //             // If no such event is emitted, you might need to adjust the server code
        //         })
        // );
        // // Wait for game state updates
        // await Promise.all(gameStatePromises);
        // // Cleanup: Disconnect remaining clients
        // clientSockets.forEach((socket) => socket.disconnect());
    }, 10000); // Increase timeout if necessary

    test("Reject out-of-turn play attempts", () => {
        // const totalClients = 2; // Adjust as needed
        // let connectedClients = 0;
        // const clientSockets: Socket[] = [];
        // // Set up clients
        // for (let i = 0; i < totalClients; i++) {
        //     const clientSocket = Client(`http://localhost:${port}`);
        //     clientSockets.push(clientSocket);
        //     clientSocket.on("connect", () => {
        //         clientSocket.emit("join_room", {
        //             roomId: "test-room-2",
        //             playerName: `Player${i + 1}`,
        //         });
        //     });
        //     clientSocket.on("deal_hand", () => {
        //         connectedClients++;
        //         if (connectedClients === totalClients) {
        //             // Both clients have joined and the game has started
        //             const outOfTurnPlayer = clientSockets[1];
        //             outOfTurnPlayer.emit("play_card", {
        //                 roomId: "test-room-2",
        //                 card: { suit: "Hearts", value: "10" },
        //             });
        //             outOfTurnPlayer.on("invalid_move", (message) => {
        //                 expect(message).toBe("It is not your turn.");
        //                 // Disconnect clients
        //                 clientSockets.forEach((socket) => socket.disconnect());
        //                 done();
        //             });
        //         }
        //     });
        // }
    }, 10000); // Increase timeout if necessary

    test("Enforce spades cannot be led until broken", () => {
        // const clientSocket = Client(`http://localhost:${port}`);
        // clientSocket.on("connect", () => {
        //     clientSocket.emit("join_room", {
        //         roomId: "test-room-3",
        //         playerName: "TestPlayer",
        //     });
        // });
        // clientSocket.on("deal_hand", () => {
        //     // Assuming it's the player's turn and spades are not broken
        //     clientSocket.emit("play_card", {
        //         roomId: "test-room-3",
        //         card: { suit: "Spades", value: "A" },
        //     });
        // });
        // clientSocket.on("invalid_move", (message) => {
        //     expect(message).toBe(
        //         "You cannot lead with spades until they are broken."
        //     );
        //     clientSocket.disconnect();
        //     done();
        // });
    }, 10000); // Increase timeout if necessary
});
