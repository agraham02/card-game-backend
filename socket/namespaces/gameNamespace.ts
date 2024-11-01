import { Server, Socket } from "socket.io";
import { RoomManager } from "../../models/room/RoomManager"; // Reuse room management if needed

const roomManager = new RoomManager(); // Or use a shared instance if preferred

export const setupGameNamespace = (io: Server) => {
    const gameNamespace = io.of("/game");

    gameNamespace.on("connection", (socket: Socket) => {
        console.log("Client connected to the /game namespace");

        // Handle game start
        socket.on("START_GAME", ({ roomId, playerId }) => {
            const room = roomManager.getRoom(roomId);
            if (room) {
                try {
                    room.startGame(playerId);
                    gameNamespace.to(roomId).emit("GAME_STARTED", { roomId });
                } catch (error: any) {
                    socket.emit("ERROR", { message: error.message });
                }
            } else {
                socket.emit("ERROR", { message: "Room not found" });
            }
        });

        // Handle in-game actions (example: player makes a move)
        socket.on("PLAYER_ACTION", ({ roomId, action }) => {
            console.log(`Player action received in room ${roomId}:`, action);
            // Handle player action logic here
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected from /game");
        });
    });
};
