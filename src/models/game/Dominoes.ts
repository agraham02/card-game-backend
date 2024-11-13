import { BaseGame } from "./Game";

export class Dominoes extends BaseGame {
    getInitialGameState() {
        throw new Error("Method not implemented.");
    }
    startGame(): void {
        throw new Error("Method not implemented.");
    }
    endGame(): void {
        throw new Error("Method not implemented.");
    }

    getGameStateForPlayer(playerId: string) {
        throw new Error("Method not implemented.");
    }

    handlePlayerAction(playerId: string, action: any): Promise<void> {
        console.log(`Player ${playerId} performed action in Dominoes:`, action);
        return Promise.resolve();
    }

    getGameState() {
        return { game: "Dominoes", players: this.players };
    }
}
