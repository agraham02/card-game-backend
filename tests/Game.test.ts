// backend/Game.test.ts

import Game, { Player } from "../Game";
import { validatePlay, evaluateTrick, compareCardValues } from "../utils/validation";
// import { createDeck, Card } from "../Game";

describe("createDeck", () => {
    it("should create a deck with 52 unique cards", () => {
        const game = new Game("test-room");
        const deck = game.createDeck();
        expect(deck.length).toBe(52);

        const uniqueCards = new Set(
            deck.map((card) => `${card.suit}-${card.value}`)
        );
        expect(uniqueCards.size).toBe(52);
    });
});

describe("shuffleDeck", () => {
    it("should shuffle the deck", () => {
        const game = new Game("test-room");
        const deck = game.createDeck();
        const deckCopy = [...deck];
        game.shuffleDeck();
        const newDeck = game.deck;
        // Check that the order has changed
        expect(newDeck).not.toEqual(deckCopy);
        // Ensure all cards are still present
        expect(new Set(deck)).toEqual(new Set(deckCopy));
    });
});

describe("validatePlay", () => {
    let game: Game;
    let player: Player;

    beforeEach(() => {
        game = new Game("test-room");
        player = {
            id: "player1",
            name: "Alice",
            hand: [],
            bid: 0,
            tricksWon: 0,
            socket: null, // Not needed for unit tests
        };
        game.players.push(player);
    });

    it("should allow leading with a non-spade when spades are not broken", () => {
        player.hand = [{ suit: "Hearts", value: "10" }];
        game.currentTrick = [];
        game.spadesBroken = false;

        const isValid = validatePlay(game, player, {
            suit: "Hearts",
            value: "10",
        });
        expect(isValid).toBe(true);
    });

    it("should not allow leading with a spade when spades are not broken and player has non-spade cards", () => {
        player.hand = [
            { suit: "Spades", value: "A" },
            { suit: "Hearts", value: "10" },
        ];
        game.currentTrick = [];
        game.spadesBroken = false;

        const isValid = validatePlay(game, player, {
            suit: "Spades",
            value: "A",
        });
        expect(isValid).toBe(false);
    });

    it("should allow leading with a spade when spades are broken", () => {
        player.hand = [{ suit: "Spades", value: "A" }];
        game.currentTrick = [];
        game.spadesBroken = true;

        const isValid = validatePlay(game, player, {
            suit: "Spades",
            value: "A",
        });
        expect(isValid).toBe(true);
    });

    it("should allow playing off-suit when player does not have leading suit", () => {
        player.hand = [{ suit: "Spades", value: "A" }];
        game.currentTrick = [
            { playerId: "player2", card: { suit: "Hearts", value: "K" } },
        ];
        game.leadingSuit = "Hearts";

        const isValid = validatePlay(game, player, {
            suit: "Spades",
            value: "A",
        });
        expect(isValid).toBe(true);
    });

    it("should not allow playing off-suit when player has the leading suit", () => {
        player.hand = [
            { suit: "Hearts", value: "2" },
            { suit: "Spades", value: "A" },
        ];
        game.currentTrick = [
            { playerId: "player2", card: { suit: "Hearts", value: "K" } },
        ];
        game.leadingSuit = "Hearts";

        const isValid = validatePlay(game, player, {
            suit: "Spades",
            value: "A",
        });
        expect(isValid).toBe(false);
    });
});

describe("evaluateTrick", () => {
    let game: Game;

    beforeEach(() => {
        game = new Game("test-room");
        const player1 = {
            id: "player1",
            name: "Alice",
            hand: [],
            bid: 0,
            tricksWon: 0,
            socket: null, // Not needed for unit tests
        };
        const player2 = {
            id: "player2",
            name: "Bob",
            hand: [],
            bid: 0,
            tricksWon: 0,
            socket: null, // Not needed for unit tests
        };
        const player3 = {
            id: "player3",
            name: "John",
            hand: [],
            bid: 0,
            tricksWon: 0,
            socket: null, // Not needed for unit tests
        };
        const player4 = {
            id: "player4",
            name: "Jane",
            hand: [],
            bid: 0,
            tricksWon: 0,
            socket: null, // Not needed for unit tests
        };

        game.players.push(player1);
        game.players.push(player2);
        game.players.push(player3);
        game.players.push(player4);
    });

    it("should correctly identify the winner of a trick", () => {
        game.currentTrick = [
            { playerId: "player1", card: { suit: "Hearts", value: "10" } },
            { playerId: "player2", card: { suit: "Hearts", value: "K" } },
            { playerId: "player3", card: { suit: "Hearts", value: "A" } },
            { playerId: "player4", card: { suit: "Hearts", value: "2" } },
        ];
        game.leadingSuit = "Hearts";

        const winnerIndex = evaluateTrick(game);
        expect(winnerIndex).toBe(2); // 'player3' wins with 'A' of Hearts
    });

    it("should consider spades when evaluating the trick", () => {
        game.currentTrick = [
            { playerId: "player1", card: { suit: "Hearts", value: "10" } },
            { playerId: "player2", card: { suit: "Spades", value: "3" } },
            { playerId: "player3", card: { suit: "Hearts", value: "A" } },
            { playerId: "player4", card: { suit: "Hearts", value: "2" } },
        ];
        game.leadingSuit = "Hearts";

        const winnerIndex = evaluateTrick(game);
        expect(winnerIndex).toBe(1); // 'player2' wins with '3' of Spades
    });
});

describe("compareCardValues", () => {
    it("should return a negative number when value1 is lower than value2", () => {
        expect(compareCardValues("2", "A")).toBeLessThan(0);
        expect(compareCardValues("9", "10")).toBeLessThan(0);
        expect(compareCardValues("J", "Q")).toBeLessThan(0);
    });

    it("should return a positive number when value1 is higher than value2", () => {
        expect(compareCardValues("A", "2")).toBeGreaterThan(0);
        expect(compareCardValues("10", "9")).toBeGreaterThan(0);
        expect(compareCardValues("K", "J")).toBeGreaterThan(0);
    });

    it("should return 0 when value1 is equal to value2", () => {
        expect(compareCardValues("2", "2")).toBe(0);
        expect(compareCardValues("A", "A")).toBe(0);
        expect(compareCardValues("10", "10")).toBe(0);
        expect(compareCardValues("K", "K")).toBe(0);
    });

    it("should handle comparison between face cards and numbered cards", () => {
        expect(compareCardValues("J", "10")).toBeGreaterThan(0);
        expect(compareCardValues("Q", "9")).toBeGreaterThan(0);
        expect(compareCardValues("K", "5")).toBeGreaterThan(0);
        expect(compareCardValues("A", "3")).toBeGreaterThan(0);

        expect(compareCardValues("10", "J")).toBeLessThan(0);
        expect(compareCardValues("9", "Q")).toBeLessThan(0);
        expect(compareCardValues("5", "K")).toBeLessThan(0);
        expect(compareCardValues("3", "A")).toBeLessThan(0);
    });
});
