import { Room } from "./Room";
import { Player } from "../player/Player";

export class RoomManager {
    private rooms: { [roomId: string]: Room } = {};
    private playerRoomMap: { [socketId: string]: string } = {};

    createRoom(roomId: string): Room {
        const newRoom = new Room(roomId);
        this.rooms[roomId] = newRoom;
        return newRoom;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms[roomId];
    }

    deleteRoom(roomId: string): void {
        delete this.rooms[roomId];
    }

    getAllRooms(): Room[] {
        return Object.values(this.rooms);
    }

    addPlayerToRoom(roomId: string, player: Player): boolean {
        const room = this.getRoom(roomId);
        if (room && room.canJoinRoom()) {
            // Ensure room is open for new players
            room.addPlayer(player);
            this.playerRoomMap[player.id] = roomId;
            return true;
        }
        return false;
    }

    removePlayerFromRoom(playerId: string): string {
        const roomId = this.playerRoomMap[playerId];
        const room = this.getRoom(roomId);
        if (room) {
            room.removePlayer(playerId);
            delete this.playerRoomMap[playerId];
            console.log(`Player ${playerId} removed from room ${roomId}`);

            if (room.getAllPlayers().length === 0) {
                this.deleteRoom(roomId); // Clean up empty rooms
                console.log(`Room ${roomId} is empty and removed.`);
            }
        }
        return roomId;
    }
}
