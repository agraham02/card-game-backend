import { Player } from "../../models/player/Player";
import { SpadesGameData } from "../../models/game/SpadesGameData";
import { Card } from "../../models/game/Card";

describe("Player Model", () => {
    let player: Player;

    beforeEach(() => {
        player = new Player("player1", "Alice", null);
        player.gameData["spades"] = new SpadesGameData([]);
    });

    test("should initialize player with correct ID and name", () => {
        expect(player.id).toBe("player1");
        expect(player.name).toBe("Alice");
    });

    test("should initialize Spades game data correctly", () => {
        expect(player.gameData["spades"]).toBeInstanceOf(SpadesGameData);
    });

    test("should update bid correctly in Spades game data", () => {
        player.gameData["spades"].bid = 3;
        expect(player.gameData["spades"].bid).toBe(3);
    });

    test("should add and remove cards in hand correctly", () => {
        const card = { suit: "Clubs", value: "2" };
        player.gameData["spades"].hand.push(card);
        expect(player.gameData["spades"].hand.length).toBe(1);

        player.gameData["spades"].hand.pop();
        expect(player.gameData["spades"].hand.length).toBe(0);
    });
});
