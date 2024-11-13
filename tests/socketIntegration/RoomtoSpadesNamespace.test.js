"use strict";
// tests/RoomToGameIntegration.test.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const socket_io_client_1 = __importDefault(require("socket.io-client"));
const http_1 = require("http");
const roomNamespace_1 = require("../../socket/namespaces/roomNamespace");
const RoomManager_1 = require("../../models/room/RoomManager");
describe("Room to Game Integration Tests", () => {
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
    test("should initialize the game when the party leader starts it", (done) => {
        const roomName = "testRoom";
        const playerNames = ["Alice", "Bob", "Charlie", "Diana"];
        const port = httpServerAddr && typeof httpServerAddr !== "string"
            ? httpServerAddr.port
            : 0;
        let connectedClients = 0;
        let gameStartedClients = 0;
        playerNames.forEach((name, index) => {
            const clientSocket = (0, socket_io_client_1.default)(`http://localhost:${port}`, {
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
                expect(room === null || room === void 0 ? void 0 : room.gameInstance).toBeDefined();
                expect(room === null || room === void 0 ? void 0 : room.gameInstance).not.toBeNull();
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
