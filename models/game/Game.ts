import { Player, PublicPlayer } from "../player/Player";
import { Room } from "../room/Room";

export interface Game {
    gameId: string;
    roomId: string;
    players: { [id: string]: Player }; // Use a Player type for better structure
    turnOrder: string[];
    gameState: any;

    startGame(): void;
    handlePlayerAction(playerId: string, action: any): void;
    getGameState(): any;
    endGame(): void;
    getGameStateForPlayer(playerId: string): any;
}

interface PlayerAction {
    type: string;
    [key: string]: any;
}

export abstract class BaseGame implements Game {
    gameId: string;
    roomId: string;
    players: { [id: string]: Player };
    turnOrder: string[];
    gameState: any;

    constructor(room: Room) {
        this.gameId = Math.random().toString(36).substring(2, 10);
        this.roomId = room.id;
        this.players = room.players;
        this.turnOrder = room.turnOrder;
        this.gameState = {};
    }

    abstract startGame(): void;
    abstract handlePlayerAction(playerId: string, action: PlayerAction): void;
    abstract getGameState(): any;
    abstract endGame(): void;
    abstract getGameStateForPlayer(playerId: string): any;

    getAllPlayers(): PublicPlayer[] {
        return Object.values(this.players).map((player) =>
            player.toPublicObject()
        );
    }

    // Common methods that can be shared across games
    protected broadcastToPlayer(
        playerId: string,
        event: string,
        data: any
    ): void {}

    protected broadcastToAllPlayers(event: string, data: any): void {
        for (const player of Object.values(this.players)) {
            player.socket?.emit(event, data);
        }
    }
}
