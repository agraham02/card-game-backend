import { Player } from "../player/Player";
import { Room } from "../room/Room";

export interface Game {
    gameId: string;
    room: Room;
    players: { [playerId: string]: Player };
    turnOrder: string[];
    gameState: any;

    startGame(): void;
    handlePlayerAction(playerId: string, action: any): void;
    getGameState(): any;
    endGame(): void;
    getPlayers(): { [playerId: string]: Player };
    getPlayersAsArray(): Player[];
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
    players: { [playerId: string]: Player };
    turnOrder: string[];
    gameState: GameState;

    constructor(room: Room) {
        this.gameId = Math.random().toString(36).substring(2, 10);
        this.room = room;
        this.turnOrder = room.turnOrder;
        this.players = room.players;
        this.gameState = {};
    }

    abstract startGame(): void;
    abstract handlePlayerAction(playerId: string, action: PlayerAction): void;
    abstract getGameState(): GameState;
    abstract endGame(): void;

    broadcastToPlayers(event: string, data: any): void {
        // Emit event to all player sockets
        this.getPlayersAsArray().forEach((player) => {
            player.socket?.emit(event, data);
        });
    }

    getPlayer(playerId: string): Player | undefined {
        return this.players[playerId];
    }

    getPlayers(): { [playerId: string]: Player } {
        return this.players;
    }

    getPlayersAsArray(): Player[] {
        return Object.values(this.players);
    }
}
