import { Game } from "./Game";
import { Spades } from "./Spades";
import { Dominoes } from "./Dominoes";

export class GameFactory {
    static createGame(gameType: string, roomId: string): Game {
        switch (gameType) {
            case "spades":
                return new Spades(roomId);
            case "dominoes":
                return new Dominoes(roomId);
            default:
                throw new Error("Unknown game type");
        }
    }
}
