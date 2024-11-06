import { Room } from "./Room";
import { Player } from "../player/Player";

export class RoomManager {
    private rooms: { [roomId: string]: Room } = {};
    private playerRoomMap: { [socketId: string]: string } = {};

    createRoom(roomId: string, maxPlayers: number = 4): Room {
        const room = new Room(roomId);
        room.maxPlayers = maxPlayers;
        this.rooms[roomId] = room;
        return room;
    }

    initializeRoom(roomId: string, players: Player[] = []): void {
        const room = this.rooms[roomId];
        if (!room) throw new Error("Room does not exist");

        // Set initial properties for the room
        if (!room.partyLeaderId && players.length > 0) {
            room.partyLeaderId = players[0].id; // Assign the first player as party leader
        }

        // Additional initialization logic here if needed
        room.players = players.reduce((acc, player) => {
            acc[player.id] = player;
            return acc;
        }, {} as { [id: string]: Player });
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms[roomId];
    }

    deleteRoom(roomId: string): void {
        delete this.rooms[roomId];
    }

    public clearAllRooms() {
        this.rooms = {};
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
