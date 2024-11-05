import { Player } from "../player/Player";
import { Room } from "../room/Room";

export interface Game {
    gameId: string;
    room: Room;
    players: { [id: string]: Player }; // Use a Player type for better structure
    turnOrder: string[];
    gameState: any;

    startGame(): void;
    handlePlayerAction(playerId: string, action: any): void;
    getGameState(): any;
    endGame(): void;
}

interface PlayerAction {
    type: string;
    [key: string]: any;
}

export abstract class BaseGame implements Game {
    gameId: string;
    room: Room;
    players: { [id: string]: Player };
    turnOrder: string[];
    gameState: any;

    constructor(room: Room) {
        this.gameId = Math.random().toString(36).substring(2, 10);
        this.room = room;
        this.players = room.players;
        this.turnOrder = room.turnOrder;
        this.gameState = {};
    }

    abstract startGame(): void;
    abstract handlePlayerAction(playerId: string, action: PlayerAction): void;
    abstract getGameState(): any;
    abstract endGame(): void;

    // Common methods that can be shared across games
    protected broadcastToPlayers(event: string, data: any): void {
        // Emit event to all player sockets
        this.players.forEach((player) => {
            player.socket.emit(event, data);
        });
    }

    protected findPlayerById(playerId: string): Player | undefined {
        return this.players.find((player) => player.id === playerId);
    }
}
