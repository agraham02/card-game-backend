import { Player } from "../player/Player";
import { Room } from "../room/Room";

export interface Game {
    gameId: string;
    room: Room;
    players: Player[]; // Use a Player type for better structure
    gameState: any;

    startGame(): void;
    handlePlayerAction(playerId: string, action: any): void;
    getGameState(): any;
    endGame(): void;
}

interface GameState {
    // players: { id: string; name: string; teamId: number }[];
    // teams: { [teamId: number]: Player[] };
    // currentTurn: string;
    // scores: { [teamId: string]: number };
    // // Add other properties as needed
}

interface PlayerAction {
    type: string;
    [key: string]: any;
}

export abstract class BaseGame implements Game {
    gameId: string;
    room: Room;
    players: Player[];
    gameState: GameState;

    constructor(room: Room) {
        this.gameId = Math.random().toString(36).substring(2, 10);
        this.room = room;
        this.players = Object.values(room.players);
        this.gameState = {};
    }

    abstract startGame(): void;
    abstract handlePlayerAction(playerId: string, action: PlayerAction): void;
    abstract getGameState(): GameState;
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
