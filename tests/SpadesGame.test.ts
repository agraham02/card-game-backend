// tests/SpadesGame.test.ts

import { SpadesGame } from "../src/game/SpadesGame";
import { Room } from "../src/room/Room";
import { Player } from "../src/player/Player";

describe("SpadesGame - startGame", () => {
    let room: Room;
    let players: Player[];

    beforeEach(() => {
        room = new Room("room1");
        players = [
            new Player("player1", "Alice", null),
            new Player("player2", "Bob", null),
            new Player("player3", "Charlie", null),
            new Player("player4", "Diana", null),
        ];
        players.forEach((player) => room.addPlayer(player));
    });

    test("should initialize the game correctly with 4 players", () => {
        const spadesGame = new SpadesGame(room);
        spadesGame.startGame();

        // Check that teams are assigned
        expect(Object.keys(spadesGame.teams)).toHaveLength(2);
        expect(spadesGame.teams[1]).toContain(players[0]);
        expect(spadesGame.teams[1]).toContain(players[2]);
        expect(spadesGame.teams[2]).toContain(players[1]);
        expect(spadesGame.teams[2]).toContain(players[3]);

        // Check that the deck has been created and shuffled
        expect(spadesGame.deck.length).toBe(0); // Deck should be empty after dealing

        // Check that hands have been dealt
        players.forEach((player) => {
            expect(spadesGame.hands[player.id].length).toBe(13);
        });

        // Check that the game state is initialized
        const gameState = spadesGame.getGameState();
        expect(gameState.currentTurn).toBeDefined();
        expect(gameState.scores).toEqual({ team1: 0, team2: 0 });
    });

    test("should throw an error when starting the game with less than 4 players", () => {
        room.removePlayer("player4");
        const spadesGame = new SpadesGame(room);

        expect(() => {
            spadesGame.startGame();
        }).toThrow("Spades requires exactly 4 players.");
    });
});

describe("SpadesGame - handlePlayerAction", () => {
    let room: Room;
    let players: Player[];
    let spadesGame: SpadesGame;

    beforeEach(() => {
        room = new Room("room1");
        players = [
            new Player("player1", "Alice", null),
            new Player("player2", "Bob", null),
            new Player("player3", "Charlie", null),
            new Player("player4", "Diana", null),
        ];
        players.forEach((player) => room.addPlayer(player));
        spadesGame = new SpadesGame(room);
        spadesGame.startGame();
    });

    test("should handle a valid card play", () => {
        const currentPlayerId = spadesGame.gameState.currentTurn;
        const playerHand = spadesGame.hands[currentPlayerId];
        const cardToPlay = playerHand[0];

        const action = { type: "PLAY_CARD", card: cardToPlay };

        spadesGame.handlePlayerAction(currentPlayerId, action);

        // Verify that the card is removed from the player's hand
        expect(spadesGame.hands[currentPlayerId]).not.toContainEqual(
            cardToPlay
        );

        // Verify that the game state is updated (e.g., current turn changes)
        expect(spadesGame.gameState.currentTurn).not.toBe(currentPlayerId);
    });

    test("should not allow a player to play when it's not their turn", () => {
        const currentPlayerId = spadesGame.gameState.currentTurn;
        const otherPlayerId = players.find((p) => p.id !== currentPlayerId)!.id;
        const playerHand = spadesGame.hands[otherPlayerId];
        const cardToPlay = playerHand[0];

        const action = { type: "PLAY_CARD", card: cardToPlay };

        expect(() => {
            spadesGame.handlePlayerAction(otherPlayerId, action);
        }).toThrow("It's not your turn.");
    });

    test("should not allow a player to play a card they do not have", () => {
        const currentPlayerId = spadesGame.gameState.currentTurn;
        const invalidCard = { suit: "hearts", rank: 2 }; // Assuming the player doesn't have this card

        const action = { type: "PLAY_CARD", card: invalidCard };

        expect(() => {
            spadesGame.handlePlayerAction(currentPlayerId, action);
        }).toThrow("You don't have that card.");
    });
});

describe("SpadesGame - getGameState", () => {
    let room: Room;
    let players: Player[];
    let spadesGame: SpadesGame;

    beforeEach(() => {
        room = new Room("room1");
        players = [
            new Player("player1", "Alice", null),
            new Player("player2", "Bob", null),
            new Player("player3", "Charlie", null),
            new Player("player4", "Diana", null),
        ];
        players.forEach((player) => room.addPlayer(player));
        spadesGame = new SpadesGame(room);
        spadesGame.startGame();
    });

    test("should return the current game state", () => {
        const gameState = spadesGame.getGameState();

        expect(gameState).toBeDefined();
        expect(gameState.currentTurn).toBeDefined();
        expect(gameState.scores).toEqual({ team1: 0, team2: 0 });
        // Add more assertions as needed
    });
});

describe("SpadesGame - endGame", () => {
    let room: Room;
    let players: Player[];
    let spadesGame: SpadesGame;

    beforeEach(() => {
        room = new Room("room1");
        players = [
            new Player("player1", "Alice", null),
            new Player("player2", "Bob", null),
            new Player("player3", "Charlie", null),
            new Player("player4", "Diana", null),
        ];
        players.forEach((player) => room.addPlayer(player));
        spadesGame = new SpadesGame(room);
        spadesGame.startGame();
    });

    test("should end the game and clean up resources", () => {
        spadesGame.endGame();

        // Verify that game state is reset or marked as ended
        expect(spadesGame.gameState).toBeNull();
        // Or if you set an 'ended' flag
        // expect(spadesGame.gameState.ended).toBe(true);
    });
});

