"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Player_1 = require("../../models/player/Player");
const SpadesGameData_1 = require("../../models/game/SpadesGameData");
describe("Player Model", () => {
    let player;
    beforeEach(() => {
        player = new Player_1.Player("player1", "Alice", null);
        player.gameData["spades"] = new SpadesGameData_1.SpadesGameData([]);
    });
    test("should initialize player with correct ID and name", () => {
        expect(player.id).toBe("player1");
        expect(player.name).toBe("Alice");
    });
    test("should initialize Spades game data correctly", () => {
        expect(player.gameData["spades"]).toBeInstanceOf(SpadesGameData_1.SpadesGameData);
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
