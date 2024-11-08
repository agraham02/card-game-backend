// tests/RoomToGameIntegration.test.ts

import { Server } from "socket.io";
import Client, { Socket as ClientSocket } from "socket.io-client";
import { createServer, Server as HttpServer } from "http";
import { setupRoomNamespace } from "../../socket/namespaces/roomNamespace";
import { RoomManager } from "../../models/room/RoomManager";
import { AddressInfo } from "net";

describe("Room to Game Integration Tests", () => {
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

    test("should initialize the game when the party leader starts it", (done) => {
        const roomName = "testRoom";
        const playerNames = ["Alice", "Bob", "Charlie", "Diana"];
        const port =
            httpServerAddr && typeof httpServerAddr !== "string"
                ? httpServerAddr.port
                : 0;

        let connectedClients = 0;
        let gameStartedClients = 0;

        playerNames.forEach((name, index) => {
            const clientSocket = Client(`http://localhost:${port}`, {
                path: "/socket.io",
            });
            clientSockets.push(clientSocket);

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
            });

            clientSocket.on("ROOM_STATE_UPDATED", ({ roomState }) => {
                if (roomState.players.length === 4) {
                    // All players have joined; party leader starts the game
                    clientSockets[0].emit("START_GAME", {
                        roomId: roomName,
                        playerId: clientSockets[0].id,
                        gameType: "spades"
                    });
                }
            });

            clientSocket.on("GAME_STARTED", ({ roomId, gameType, playerId }) => {
                // Verify that each client receives the game state
                const room = roomManager.getRoom(roomId);
                expect(room).toBeDefined();
                expect(room?.gameInstance).toBeDefined();
                expect(room?.gameInstance).not.toBeNull();
                gameStartedClients++;
                if (gameStartedClients === 4) {
                    done();
                }
            });

            clientSocket.on("ERROR", (data) => {
                done(new Error(`Received error: ${data.message}`));
            });
        });
    });
});
