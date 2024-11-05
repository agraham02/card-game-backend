import { Server, Socket } from "socket.io";
import { RoomManager } from "../../models/room/RoomManager";
import { Player } from "../../models/player/Player";

export const setupRoomNamespace = (io: Server, roomManager: RoomManager) => {
    const roomNamespace = io.of("/room");

    roomNamespace.on("connection", (socket: Socket) => {
        // Handle room creation
        socket.on("CREATE_ROOM", ({ roomName, playerName }) => {
            const roomId =
                roomName || Math.random().toString(36).substring(2, 10);

            if (roomManager.getRoom(roomId)) {
                socket.emit("ERROR", { message: "Room already exists" });
                return;
            }

            const room = roomManager.createRoom(roomId);
            const newPlayer = new Player(socket.id, playerName, socket);
            room.addPlayer(newPlayer);
            // room.partyLeaderId = player.id; // Set party leader
            socket.join(roomId);

            // Send confirmation
            socket.emit("ROOM_CREATED", { roomId, playerId: newPlayer.id });
            console.log(`Room ${roomId} created by ${newPlayer.name}`);
        });

        // Handle player joining room
        socket.on("JOIN_ROOM", ({ roomId, playerName }) => {
            console.log(`Player ${playerName} wants to join room ${roomId}`);
            let room = roomManager.getRoom(roomId);

            if (!room) {
                room = roomManager.createRoom(roomId);
            }

            const newPlayer = new Player(socket.id, playerName, socket);
            roomManager.addPlayerToRoom(roomId, newPlayer);
            socket.join(roomId);

            roomNamespace.to(roomId).emit("ROOM_STATE_UPDATED", {
                roomState: room.getRoomState(),
            });
            console.log(`${newPlayer.name} joined room ${roomId}`);
        });

        socket.on(
            "SET_GAME_TYPE",
            ({ roomId, playerId, gameType, gameRules }) => {
                const room = roomManager.getRoom(roomId);

                if (room && room.isPartyLeader(playerId)) {
                    // room.setGameType(gameType);
                    // room.setGameRules(gameRules);
                    roomNamespace
                        .to(roomId)
                        .emit("GAME_TYPE_SET", { gameType, gameRules });
                    console.log(
                        `Game type set to ${gameType} in room ${roomId}`
                    );
                } else {
                    socket.emit("ERROR", {
                        message: "Only the party leader can set the game type",
                    });
                }
            }
        );

        socket.on("SET_TURN_ORDER", ({ roomId, playerId, turnOrder }) => {
            const room = roomManager.getRoom(roomId);

            console.log(roomId);
            console.log(playerId);
            console.log(turnOrder);
            console.log(room);
            if (room && room.isPartyLeader(playerId)) {
                room.setTurnOrder(playerId, turnOrder);
                roomNamespace.to(roomId).emit("ROOM_STATE_UPDATED", {
                    roomState: room.getRoomState(),
                });
                console.log(`Turn order set in room ${roomId}`);
            } else {
                socket.emit("ERROR", {
                    message: "Only the party leader can set the turn order",
                });
            }
        });

        socket.on("ASSIGN_TEAMS", ({ roomId, playerId, teams }) => {
            const room = roomManager.getRoom(roomId);

            if (room && room.isPartyLeader(playerId)) {
                // room.setTeams(teams);
                roomNamespace.to(roomId).emit("TEAMS_ASSIGNED", { teams });
                console.log(`Teams assigned in room ${roomId}`);
            } else {
                socket.emit("ERROR", {
                    message: "Only the party leader can assign teams",
                });
            }
        });

        socket.on("KICK_PLAYER", ({ roomId, playerId, targetPlayerId }) => {
            const room = roomManager.getRoom(roomId);

            if (room && room.isPartyLeader(playerId)) {
                room.removePlayer(targetPlayerId);
                roomNamespace
                    .to(roomId)
                    .emit("PLAYER_KICKED", { playerId: targetPlayerId });
                console.log(
                    `Player ${targetPlayerId} kicked from room ${roomId}`
                );
            } else {
                socket.emit("ERROR", {
                    message: "Only the party leader can kick players",
                });
            }
        });

        socket.on("PROMOTE_LEADER", ({ roomId, playerId, newLeaderId }) => {
            const room = roomManager.getRoom(roomId);

            if (room && room.isPartyLeader(playerId)) {
                room.partyLeaderId = newLeaderId;
                roomNamespace
                    .to(roomId)
                    .emit("PARTY_LEADER_CHANGED", { newLeaderId });
                console.log(
                    `Party leader changed to ${newLeaderId} in room ${roomId}`
                );
            } else {
                socket.emit("ERROR", {
                    message:
                        "Only the current party leader can promote a new leader",
                });
            }
        });

        socket.on("START_GAME", async ({ roomId, playerId }) => {
            const room = roomManager.getRoom(roomId);

            if (!room) {
                socket.emit("ERROR", { message: "Room not found." });
                return;
            }

            if (!room.isPartyLeader(playerId)) {
                socket.emit("ERROR", {
                    message: "Only the party leader can start the game.",
                });
                return;
            }

            try {
                // Check player count (Spades typically requires 4 players)
                if (Object.keys(room.players).length !== 4) {
                    socket.emit("ERROR", {
                        message: "Spades requires exactly 4 players.",
                    });
                    return;
                }

                room.startGame(playerId, "spades");

                // Broadcast 'GAME_STARTED' event with initial game state
                roomNamespace.to(roomId).emit("GAME_STARTED", {
                    roomState: room.getRoomState(),
                });

                // Set up game-specific event listeners
                // setupGameEventListeners(roomId, spadesGame);
            } catch (error) {
                console.error("Error starting game:", error);
                socket.emit("ERROR", { message: "Failed to start the game." });
            }
        });

        socket.on("disconnect", () => {
            const roomId = roomManager.removePlayerFromRoom(socket.id);
            const room = roomManager.getRoom(roomId);
            if (room) {
                roomNamespace.to(roomId).emit("ROOM_STATE_UPDATED", {
                    roomState: room.getRoomState(),
                });
            }
            console.log("Client disconnected from /room");
        });
    });
};

// function setupGameEventListeners(roomId: string, spadesGame: SpadesGame) {
//     const room = roomManager.getRoom(roomId);
//     if (!room) return;

//     for (const playerId in room.players) {
//         const player = room.players[playerId];
//         const socket = player.socket;

//         socket.on("PLAYER_ACTION", (action) => {
//             spadesGame.handlePlayerAction(playerId, action);
//         });

//         // Clean up event listeners when game ends
//         spadesGame.endGame = () => {
//             socket.off("PLAYER_ACTION");
//         };
//     }
// }
