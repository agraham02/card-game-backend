"use strict";
// roomNamespace.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const roomNamespace_1 = require("../../socket/namespaces/roomNamespace");
const RoomManager_1 = require("../../models/room/RoomManager");
const http_1 = require("http");
describe("Room Namespace Socket Events", () => {
    let ioServer;
    let httpServer;
    let httpServerAddr;
    let clientSocket;
    let roomManager;
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
    beforeEach((done) => {
        // Connect a client
        if (httpServerAddr === null) {
            throw new Error("Server address not found or invalid");
        }
        const port = httpServerAddr && typeof httpServerAddr !== "string"
            ? httpServerAddr.port
            : 0;
        clientSocket = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
            path: "/socket.io",
        });
        clientSocket.on("connect", done);
    });
    afterEach((done) => {
        // Disconnect the client
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
        // Clear rooms and players
        roomManager.clearAllRooms();
        done();
    });
    test("should create a new room and set the player as party leader", (done) => {
        const playerName = "Alice";
        clientSocket.emit("CREATE_ROOM", { roomName: "testRoom", playerName });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe("testRoom");
            expect(playerId).toBe(clientSocket.id);
            // Verify that the room exists on the server
            const room = roomManager.getRoom(roomId);
            expect(room).toBeDefined();
            if (room) {
                expect(room.partyLeaderId).toBe(playerId);
                expect(Object.keys(room.players)).toContain(playerId);
            }
            done();
        });
        clientSocket.on("ERROR", (data) => {
            done(new Error(`Received error: ${data.message}`));
        });
    });
    test("should allow a player to join an existing room and receive updated room state", (done) => {
        const roomName = "testRoom";
        const player1Name = "Alice";
        // First, create the room
        clientSocket.emit("CREATE_ROOM", { roomName, playerName: player1Name });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe(roomName);
            expect(playerId).toBe(clientSocket.id);
            // Now, create a second client to join the room
            const port = httpServerAddr && typeof httpServerAddr !== "string"
                ? httpServerAddr.port
                : 0;
            const clientSocket2 = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
                path: "/socket.io",
            });
            clientSocket2.on("connect", () => {
                const player2Name = "Bob";
                clientSocket2.emit("JOIN_ROOM", {
                    roomId: roomName,
                    playerName: player2Name,
                });
            });
            let roomStateReceived = 0;
            const checkDone = () => {
                if (roomStateReceived === 2) {
                    clientSocket2.disconnect();
                    done();
                }
            };
            const expectedPlayerNames = [player1Name, "Bob"];
            clientSocket.on("ROOM_STATE_UPDATED", ({ roomState }) => {
                roomStateReceived++;
                expect(roomState.players.length).toBe(2);
                const playerNames = roomState.players.map((p) => p.name);
                expect(playerNames.sort()).toEqual(expectedPlayerNames.sort());
                checkDone();
            });
            clientSocket2.on("ROOM_STATE_UPDATED", ({ roomState }) => {
                roomStateReceived++;
                expect(roomState.players.length).toBe(2);
                const playerNames = roomState.players.map((p) => p.name);
                expect(playerNames.sort()).toEqual(expectedPlayerNames.sort());
                checkDone();
            });
            clientSocket2.on("ERROR", (data) => {
                clientSocket2.disconnect();
                done(new Error(`Received error: ${data.message}`));
            });
        });
    });
    test("should emit an error when trying to create a room that already exists", (done) => {
        const playerName = "Alice";
        const roomName = "testRoom";
        clientSocket.emit("CREATE_ROOM", { roomName, playerName });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe(roomName);
            // Attempt to create the same room again
            clientSocket.emit("CREATE_ROOM", { roomName, playerName });
            clientSocket.on("ERROR", (data) => {
                expect(data.message).toBe("Room already exists");
                done();
            });
        });
        clientSocket.on("ERROR", (data) => {
            // Ensure we don't call done() multiple times
        });
    });
    test("party leader should set turn order and update room state", (done) => {
        const roomName = "testRoom";
        const player1Name = "Alice";
        // Create the room
        clientSocket.emit("CREATE_ROOM", { roomName, playerName: player1Name });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe(roomName);
            expect(playerId).toBe(clientSocket.id);
            // Second client joins
            const port = httpServerAddr && typeof httpServerAddr !== "string"
                ? httpServerAddr.port
                : 0;
            const clientSocket2 = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
                path: "/socket.io",
            });
            clientSocket2.on("connect", () => {
                const player2Name = "Bob";
                clientSocket2.emit("JOIN_ROOM", {
                    roomId: roomName,
                    playerName: player2Name,
                });
            });
            clientSocket2.on("ROOM_STATE_UPDATED", () => {
                // Party leader sets new turn order
                const newTurnOrder = [clientSocket.id, clientSocket2.id];
                clientSocket.emit("SET_TURN_ORDER", {
                    roomId,
                    playerId: clientSocket.id,
                    turnOrder: newTurnOrder,
                });
            });
            clientSocket.on("ROOM_STATE_UPDATED", ({ roomState }) => {
                expect(roomState.turnOrder).toEqual([
                    clientSocket.id,
                    clientSocket2.id,
                ]);
                clientSocket2.disconnect();
                done();
            });
            clientSocket2.on("ERROR", (data) => {
                clientSocket2.disconnect();
                done(new Error(`Received error: ${data.message}`));
            });
        });
    });
    test("non-party leader should not be able to set turn order", (done) => {
        const roomName = "testRoom";
        const player1Name = "Alice";
        // Create the room
        clientSocket.emit("CREATE_ROOM", { roomName, playerName: player1Name });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe(roomName);
            expect(playerId).toBe(clientSocket.id);
            // Second client joins
            const port = httpServerAddr && typeof httpServerAddr !== "string"
                ? httpServerAddr.port
                : 0;
            const clientSocket2 = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
                path: "/socket.io",
            });
            clientSocket2.on("connect", () => {
                const player2Name = "Bob";
                clientSocket2.emit("JOIN_ROOM", {
                    roomId: roomName,
                    playerName: player2Name,
                });
            });
            clientSocket2.on("ROOM_STATE_UPDATED", () => {
                // Non-party leader attempts to set turn order
                const newTurnOrder = [clientSocket2.id, clientSocket.id];
                clientSocket2.emit("SET_TURN_ORDER", {
                    roomId,
                    playerId: clientSocket2.id,
                    turnOrder: newTurnOrder,
                });
            });
            clientSocket2.on("ERROR", (data) => {
                expect(data.message).toBe("Only the party leader can set the turn order");
                clientSocket2.disconnect();
                done();
            });
        });
    });
    test("party leader can start the game with enough players", (done) => {
        const roomName = "testRoom";
        const player1Name = "Alice";
        clientSocket.emit("CREATE_ROOM", { roomName, playerName: player1Name });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe(roomName);
            expect(playerId).toBe(clientSocket.id);
            // Add more players to reach 4 players
            const clientSockets = [];
            const playerNames = ["Bob", "Charlie", "Diana"];
            let connectedClients = 0;
            playerNames.forEach((name) => {
                const port = httpServerAddr && typeof httpServerAddr !== "string"
                    ? httpServerAddr.port
                    : 0;
                const newClientSocket = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
                    path: "/socket.io",
                });
                clientSockets.push(newClientSocket);
                newClientSocket.on("connect", () => {
                    newClientSocket.emit("JOIN_ROOM", {
                        roomId: roomName,
                        playerName: name,
                    });
                });
                newClientSocket.on("ROOM_STATE_UPDATED", () => {
                    connectedClients++;
                    if (connectedClients === 3) {
                        // All players are connected, attempt to start the game
                        clientSocket.emit("START_GAME", {
                            roomId,
                            playerId: clientSocket.id,
                        });
                        clientSocket.on("GAME_STARTED", ({ roomState }) => {
                            expect(roomState).toBeDefined();
                            expect(roomState.status).toBe("in_progress");
                            done();
                        });
                        // Clean up
                        clientSockets.forEach((cs) => cs.disconnect());
                        done();
                    }
                });
            });
        });
    });
    test("starting the game with insufficient players should emit an error", (done) => {
        const roomName = "testRoom";
        const player1Name = "Alice";
        clientSocket.emit("CREATE_ROOM", { roomName, playerName: player1Name });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe(roomName);
            expect(playerId).toBe(clientSocket.id);
            // Attempt to start the game with only one player
            clientSocket.emit("START_GAME", {
                roomId,
                playerId: clientSocket.id,
            });
            clientSocket.on("ERROR", (data) => {
                console.log(data);
                expect(data.message).toBe("Failed to start the game.");
                expect(data.error).toBe("This game requires at least 4 players.");
                done();
            });
        });
    });
    test("non-party leader attempting to start the game should receive an error", (done) => {
        const roomName = "testRoom";
        const player1Name = "Alice";
        clientSocket.emit("CREATE_ROOM", { roomName, playerName: player1Name });
        clientSocket.on("ROOM_CREATED", ({ roomId, playerId }) => {
            expect(roomId).toBe(roomName);
            expect(playerId).toBe(clientSocket.id);
            // Second client joins
            const port = httpServerAddr && typeof httpServerAddr !== "string"
                ? httpServerAddr.port
                : 0;
            const clientSocket2 = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
                path: "/socket.io",
            });
            clientSocket2.on("connect", () => {
                const player2Name = "Bob";
                clientSocket2.emit("JOIN_ROOM", {
                    roomId: roomName,
                    playerName: player2Name,
                });
                console.log("p2 joined room in test");
            });
            clientSocket2.on("ROOM_STATE_UPDATED", () => {
                console.log("ROOM_STATE_UPDATED in test");
                // Non-party leader attempts to start the game
                clientSocket2.emit("START_GAME", {
                    roomId,
                    playerId: clientSocket2.id,
                });
            });
            clientSocket2.on("ERROR", (data) => {
                expect(data.message).toBe("Failed to start the game.");
                expect(data.error).toBe("Only the party leader can perform this action.");
                clientSocket2.disconnect();
                done();
            });
        });
    });
});
