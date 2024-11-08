// tests/SpadesGame.test.ts

import { SpadesGame } from "../../models/game/SpadesGame";
import { Room } from "../../models/room/Room";
import { Player } from "../../models/player/Player";
import { SpadesGameData } from "../../models/game/SpadesGameData";
import { Card } from "../../models/game/Card";

describe("Spades Game Mechanics", () => {
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

    test("should initialize game state and assign teams", () => {
        expect(Object.keys(spadesGame.teams)).toHaveLength(2);
        expect(spadesGame.teams[1]).toContain(players[0]);
        expect(spadesGame.teams[1]).toContain(players[2]);
    });

    test("should handle bidding correctly", () => {
        const bids: { [playerId: string]: number } = {
            player1: 3,
            player2: 4,
            player3: 2,
            player4: 4,
        };
        for (const playerId in bids) {
            spadesGame.makeBid(playerId, bids[playerId]);
        }
        expect(Object.values(spadesGame.gameState.bids)).toEqual([3, 4, 2, 4]);
    });

    // test("should handle trick-taking and determine winner", () => {
    //     const card1 = { suit: "Spades", value: "A" };
    //     const card2 = { suit: "Spades", value: "K" };
    //     const card3 = { suit: "Hearts", value: "2" };
    //     const card4 = { suit: "Diamonds", value: "3" };

    //     spadesGame.handlePlayerAction("player1", {
    //         type: "PLAY_CARD",
    //         card: card1,
    //     });
    //     spadesGame.handlePlayerAction("player2", {
    //         type: "PLAY_CARD",
    //         card: card2,
    //     });
    //     spadesGame.handlePlayerAction("player3", {
    //         type: "PLAY_CARD",
    //         card: card3,
    //     });
    //     spadesGame.handlePlayerAction("player4", {
    //         type: "PLAY_CARD",
    //         card: card4,
    //     });

    //     expect(spadesGame.gameState.currentTrick).toEqual([]);
    //     // Additional assertions to check the trick winner logic
    // });

    // test("should calculate scores and end game at winning score", () => {
    //     spadesGame.gameState.scores = { team1: 500, team2: 450 };
    //     spadesGame.calculateScores();
    //     expect(spadesGame.gameState).toBeNull();
    // });
});

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
        expect(spadesGame.deck.getSize()).toBe(0); // Deck should be empty after dealing

        // Check that hands have been dealt
        players.forEach((player) => {
            expect(
                (player.gameData["spades"] as SpadesGameData).hand.length
            ).toBe(13);
        });

        // Check that the game state is initialized
        const gameState = spadesGame.getGameState();
        expect(gameState.currentTurnIndex).toBeDefined();
        expect(gameState.scores).toEqual({ 1: 0, 2: 0 });
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
        const currentTurnIndex = spadesGame.gameState.currentTurnIndex;
        const currentPlayerId = spadesGame.turnOrder[currentTurnIndex];
        const playerHand =
            spadesGame.getGameStateForPlayer(currentPlayerId).hand;
        const cardToPlay = playerHand[0];

        const action = { type: "PLAY_CARD", card: cardToPlay };
        spadesGame.handlePlayerAction(currentPlayerId, action);

        // Verify that the card is removed from the player's hand
        expect(
            spadesGame.getGameStateForPlayer(currentPlayerId).hand
        ).not.toContainEqual(cardToPlay);

        // Verify that the game state is updated (e.g., current turn changes)
        expect(spadesGame.gameState.currentTurnIndex).not.toBe(
            currentTurnIndex
        );
    });

    test("should not allow a player to play when it's not their turn", () => {
        const currentTurnIndex = spadesGame.gameState.currentTurnIndex;
        const currentPlayerId = spadesGame.turnOrder[currentTurnIndex];
        const otherPlayerId = players.find((p) => p.id !== currentPlayerId)!.id;
        const playerHand = spadesGame.getGameStateForPlayer(otherPlayerId).hand;
        const cardToPlay = playerHand[0];

        const action = { type: "PLAY_CARD", card: cardToPlay };

        expect(() => {
            spadesGame.handlePlayerAction(otherPlayerId, action);
        }).toThrow("It's not your turn to play.");
    });

    test("should not allow a player to play a card they do not have", () => {
        const currentTurnIndex = spadesGame.gameState.currentTurnIndex;
        const currentPlayerId = spadesGame.turnOrder[currentTurnIndex];
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
        expect(gameState.currentTurnIndex).toBeDefined();
        expect(gameState.scores).toEqual({ 1: 0, 2: 0 });
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
        expect(spadesGame.gameState).toBeDefined();
        expect(spadesGame.gameState.currentTurnIndex).toBe(0);
        expect(spadesGame.gameState.currentTrick).toEqual([]);
        expect(spadesGame.gameState.scores).toEqual({ 1: 0, 2: 0 });
        expect(spadesGame.gameState.bids).toEqual({});
        expect(spadesGame.gameState.tricksWon).toEqual({});
    });
});

describe("SpadesGame - simulate a full game", () => {
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

    test("should simulate a full game from bidding to game end", () => {
        // Simulate bidding phase
        const bids: { [playerId: string]: number } = {
            player1: 3,
            player2: 4,
            player3: 2,
            player4: 4,
        };

        // Players make their bids
        for (let i = 0; i < 4; i++) {
            const currentTurnIndex = spadesGame.gameState.currentTurnIndex;
            const playerId = spadesGame.turnOrder[currentTurnIndex];
            const bid = bids[playerId];
            spadesGame.makeBid(playerId, bid);
        }

        // Ensure that all bids are recorded
        expect(Object.values(spadesGame.gameState.bids)).toEqual([3, 4, 2, 4]);

        // Simulate trick-taking phase
        for (let i = 0; i < 13; i++) {
            // 13 tricks in a round
            const trickCards: { [playerId: string]: Card } = {};

            for (let j = 0; j < 4; j++) {
                const currentPlayerIndex =
                    spadesGame.gameState.currentTurnIndex;
                const currentPlayerId =
                    spadesGame.turnOrder[currentPlayerIndex];
                const playerHand =
                    spadesGame.getGameStateForPlayer(currentPlayerId).hand;

                // For simplicity, play the first card in hand
                const cardToPlay = playerHand[0];

                // Record the card played for the trick
                trickCards[currentPlayerId] = cardToPlay;

                // Player plays the card
                spadesGame.handlePlayerAction(currentPlayerId, {
                    type: "PLAY_CARD",
                    card: cardToPlay,
                });
            }

            // After each trick, check that the trick winner is determined
            expect(spadesGame.gameState.currentTrick).toEqual([]);

            // You can add assertions to check the trick winner if you implement that logic
        }

        // After all tricks are played, calculate scores
        spadesGame.calculateScores();

        // Check that scores are updated (example, actual scoring logic may vary)
        expect(spadesGame.gameState.scores).toBeDefined();

        // Check if the game ends (you might need to loop through rounds until a team reaches the winning score)
        const winningScore = 500;
        let gameOver = false;

        while (!gameOver) {
            // Reset for next round
            spadesGame.startNewRound();

            // Simulate bidding
            for (let i = 0; i < 4; i++) {
                const currentPlayerIndex =
                    spadesGame.gameState.currentTurnIndex;
                const playerId = spadesGame.turnOrder[currentPlayerIndex];
                const bid = bids[playerId]; // Use the same bids for simplicity
                spadesGame.makeBid(playerId, bid);
            }

            // Simulate trick-taking
            for (let i = 0; i < 13; i++) {
                for (let j = 0; j < 4; j++) {
                    const currentPlayerIndex =
                        spadesGame.gameState.currentTurnIndex;
                    const currentPlayerId =
                        spadesGame.turnOrder[currentPlayerIndex];
                    const playerHand = (
                        players.find((p) => p.id === currentPlayerId)!.gameData[
                            "spades"
                        ] as SpadesGameData
                    ).hand;

                    if (playerHand.length === 0) {
                        continue; // Skip if the player has no cards left
                    }

                    const cardToPlay = playerHand[0];
                    spadesGame.handlePlayerAction(currentPlayerId, {
                        type: "PLAY_CARD",
                        card: cardToPlay,
                    });
                }
            }

            // Calculate scores after the round
            spadesGame.calculateScores();

            // Check if any team has reached the winning score
            const teamScores = Object.values(spadesGame.gameState.scores);
            if (teamScores.some((score) => score >= winningScore)) {
                gameOver = true;
            }
        }

        // End the game
        spadesGame.endGame();

        // Verify that the game has ended
        expect(spadesGame.gameState).toBeDefined();
        expect(spadesGame.gameState.currentTurnIndex).toBe(0);
        expect(spadesGame.gameState.currentTrick).toEqual([]);
        expect(spadesGame.gameState.scores).toEqual({ 1: 0, 2: 0 });
        expect(spadesGame.gameState.bids).toEqual({});
        expect(spadesGame.gameState.tricksWon).toEqual({});
    });
});
