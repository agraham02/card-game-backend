import { Game } from "./Game";
import { SpadesGame } from "./SpadesGame";
import { Dominoes } from "./Dominoes";
import { Room } from "../room/Room";

export class GameFactory {
    static createGame(gameType: string, room: Room): Game {
        switch (gameType) {
            case "spades":
                return new SpadesGame(room);
            case "dominoes":
                return new Dominoes(room);
            default:
                throw new Error("Unknown game type");
        }
    }
}
