export interface Game {
    gameId: string;
    roomId: string;
    players: string[]; // Can be updated to a Player type if needed

    start(): void;
    handlePlayerAction(playerId: string, action: any): void;
    getGameState(): any;
}

export abstract class BaseGame implements Game {
    gameId: string;
    roomId: string;
    players: string[];

    constructor(roomId: string) {
        this.gameId = Math.random().toString(36).substring(2, 10);
        this.roomId = roomId;
        this.players = [];
    }

    abstract start(): void;
    abstract handlePlayerAction(playerId: string, action: any): void;
    abstract getGameState(): any;
}
