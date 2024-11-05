import { BaseGame } from "./Game";

export class Dominoes extends BaseGame {
    startGame(): void {
        throw new Error("Method not implemented.");
    }
    endGame(): void {
        throw new Error("Method not implemented.");
    }

    handlePlayerAction(playerId: string, action: any) {
        console.log(`Player ${playerId} performed action in Dominoes:`, action);
    }

    getGameState() {
        return { game: "Dominoes", players: this.players };
    }
}
