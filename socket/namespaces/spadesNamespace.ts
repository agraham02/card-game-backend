// socket/namespaces/spadesNamespace.ts

import { Namespace, Server, Socket } from "socket.io";
import { SpadesGame } from "../../models/game/SpadesGame";
import { RoomManager } from "../../models/room/RoomManager";
import { Player } from "../../models/player/Player";

export function setupSpadesNamespace(io: Server, roomManager: RoomManager) {
    const spadesNamespace: Namespace = io.of("/spades");

    spadesNamespace.on("connection", (socket: Socket) => {
        console.log(`Player connected to Spades namespace: ${socket.id}`);

        // Handle events here

        // Player joins a game room
        socket.on("JOIN_GAME", ({ roomId, playerId }) => {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                socket.emit("ERROR", { message: "Room not found." });
                return;
            }

            const player = room.players[playerId];
            if (!player) {
                socket.emit("ERROR", {
                    message: "Player not found in the room.",
                });
                return;
            }

            // Add the socket to the room in the namespace
            socket.join(roomId);

            // Attach the socket to the player
            player.socket = socket;

            socket.emit("JOINED_GAME", { roomId, playerId });
        });

        // Handle player actions
        socket.on("PLAYER_ACTION", ({ roomId, playerId, action }) => {
            const room = roomManager.getRoom(roomId);
            if (!room || !room.gameInstance) {
                socket.emit("ERROR", { message: "Game not found." });
                return;
            }

            const game = room.gameInstance as SpadesGame;

            try {
                game.handlePlayerAction(playerId, action);
            } catch (error) {
                console.error("Error handling player action:", error);
                socket.emit("ERROR", { message: error.message });
            }
        });

        // Handle disconnection
        socket.on("disconnect", () => {
            console.log(
                `Player disconnected from Spades namespace: ${socket.id}`
            );

            // Handle player disconnection logic if necessary
            const player = findPlayerBySocketId(socket.id);
            if (player) {
                player.socket = null;
                // Optionally, handle disconnection logic like pausing the game or assigning AI
            }
        });
    });

    function findPlayerBySocketId(socketId: string): Player | null {
        for (const room of roomManager.getAllRooms()) {
            const player = room.players[socketId];
            if (player) {
                return player;
            }
        }
        return null;
    }
}
