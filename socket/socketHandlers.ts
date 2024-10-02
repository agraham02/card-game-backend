// backend/socket/socketHandlers.ts
import { Server, Socket } from "socket.io";
import { games, handleGameEvents } from "./gameEvents";

export function setupSocketHandlers(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log("New connection attempt");
        socket.on("error", (err) => {
            console.error("Socket error:", err);
        });

        console.log(`User connected: ${socket.id}`);

        handleGameEvents(io, socket); // Delegate game events to a separate module

        socket.on("disconnect", () => {
            // Handle disconnection in a separate function
            
            for (const roomId in games) {
                const game = games[roomId];
                game.removePlayer(socket.id);
                io.to(roomId).emit(
                    "player_list",
                    game.players.map((p) => ({ id: p.id, name: p.name }))
                );
                if (game.players.length === 0) {
                    delete games[roomId]; // Clean up empty games
                }
            }
            
            console.log(`User disconnected: ${socket.id}`);
        });
    });
}
