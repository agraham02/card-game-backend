import { BaseGame } from "./Game";

export class Dominoes extends BaseGame {
    start() {
        console.log("Starting Dominoes game in room:", this.roomId);
    }

    handlePlayerAction(playerId: string, action: any) {
        console.log(`Player ${playerId} performed action in Dominoes:`, action);
    }

    getGameState() {
        return { game: "Dominoes", players: this.players };
    }
}
