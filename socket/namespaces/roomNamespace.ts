import { Server, Socket } from "socket.io";
import { RoomManager } from "../../models/room/RoomManager";
import { Player } from "../../models/player/Player";

const roomManager = new RoomManager();

export const setupRoomNamespace = (io: Server) => {
    const roomNamespace = io.of("/room");

    roomNamespace.on("connection", (socket: Socket) => {
        console.log("Client connected to the /room");

        // Handle room creation
        socket.on("CREATE_ROOM", ({ roomName, player }) => {
            const roomId =
                roomName || Math.random().toString(36).substring(2, 10);

            if (roomManager.getRoom(roomId)) {
                socket.emit("ERROR", { message: "Room already exists" });
                return;
            }

            const room = roomManager.createRoom(roomId);
            room.addPlayer(player);
            // room.partyLeaderId = player.id; // Set party leader
            socket.join(roomId);

            // Send confirmation
            socket.emit("ROOM_CREATED", { roomId, playerId: player.id });
            console.log(`Room ${roomId} created by ${player.name}`);
        });

        // Handle player joining room
        socket.on("JOIN_ROOM", ({ roomName, playerName }) => {
            console.log(`Player ${playerName} wants to join room ${roomName}`);
            let room = roomManager.getRoom(roomName);

            if (!room) {
                room = roomManager.createRoom(roomName);
            }

            const newPlayer = new Player(socket.id, playerName, socket);
            roomManager.addPlayerToRoom(roomName, newPlayer);
            socket.join(roomName);

            roomNamespace.to(roomName).emit("ROOM_STATE_UPDATED", {
                roomState: room.getRoomState(),
            });
            console.log(`${newPlayer.name} joined room ${roomName}`);
        });

        socket.on(
            "SET_GAME_TYPE",
            ({ roomId, playerId, gameType, gameRules }) => {
                const room = roomManager.getRoom(roomId);

                if (room && room.isPartyLeader(playerId)) {
                    room.setGameType(gameType);
                    room.setGameRules(gameRules);
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

        socket.on("START_GAME", ({ roomId, playerId }) => {
            const room = roomManager.getRoom(roomId);

            if (room && room.isPartyLeader(playerId)) {
                // Initialize game instance
                // room.setGame(room.gameType);
                roomNamespace
                    .to(roomId)
                    .emit("GAME_STARTED", { gameType: room.gameType });
                console.log(`Game started in room ${roomId}`);
            } else {
                socket.emit("ERROR", {
                    message: "Only the party leader can start the game",
                });
            }
        });

        socket.on("disconnect", () => {
            const roomName = roomManager.removePlayerFromRoom(socket.id);
            const room = roomManager.getRoom(roomName);
            if (room) {
                roomNamespace.to(roomName).emit("ROOM_STATE_UPDATED", {
                    roomState: room.getRoomState(),
                });
            }
            console.log("Client disconnected from /room");
        });
    });
};
