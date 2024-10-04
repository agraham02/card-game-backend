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

                // If the disconnected player was the party leader
                if (game.partyLeaderId === socket.id) {
                    if (game.players.length > 0) {
                        // Assign the next player as the new party leader
                        game.partyLeaderId = game.players[0].id;
                    } else {
                        // No players left, remove the game
                        delete games[roomId];
                        continue;
                    }
                }

                io.to(roomId).emit("player_list", {
                    players: game.players.map((p) => ({
                        id: p.id,
                        name: p.name,
                        bid: p.bid,
                        tricksWon: p.tricksWon,
                    })),
                    partyLeaderId: game.partyLeaderId,
                });
                
                if (game.players.length === 0) {
                    delete games[roomId]; // Clean up empty games
                }
            }
            
            console.log(`User disconnected: ${socket.id}`);
        });
    });
}
