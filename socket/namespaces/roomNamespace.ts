import { Server, Socket } from "socket.io";
import { RoomManager } from "../../models/room/RoomManager";
import { Player } from "../../models/player/Player";
import {
    requireEnoughPlayers,
    requirePartyLeader,
} from "../../middleware/validationMiddleware";

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
                    //TODO: Set game type and rules if needed
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

            if (room?.isPartyLeader(playerId)) {
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

            if (room?.isPartyLeader(playerId)) {
                //TODO: Set teams if needed
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

            if (room?.isPartyLeader(playerId)) {
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

            if (room?.isPartyLeader(playerId)) {
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

        socket.on("START_GAME", async ({ roomId, playerId, gameType }) => {
            try {
                requirePartyLeader(roomManager, roomId, playerId);
                requireEnoughPlayers(roomManager, roomId, 4);

                const room = roomManager.getRoom(roomId);
                if (room) {
                    room.startGame(playerId, gameType);
                    roomNamespace.to(roomId).emit("GAME_STARTED", {
                        roomId,
                        gameType,
                    });

                    console.log(`Game started in room ${roomId}`);
                }
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
