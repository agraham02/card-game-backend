// SpadesGame.ts

import { Room } from "../room/Room";
import { Card } from "./Card";
import { BaseGame } from "./Game";
import { SpadesGameData } from "./SpadesGameData";
import { Deck } from "./Deck";
import { GameState, PlayerAction } from "./SpadesGameEnums";

interface SpadesGameState {
    phase: GameState.BIDDING | GameState.TRICK_TAKING | GameState.GAME_OVER;
    currentTurnIndex: number;
    scores: { [teamId: string]: number };
    bids: { [playerId: string]: number | null };
    currentTrick: { playerId: string; card: Card }[];
    tricksWon: { [playerId: string]: number };
    tricksPlayed: number; // Add this line
    spadesBroken: boolean;
}

const defaultGameState: SpadesGameState = {
    phase: GameState.BIDDING,
    currentTurnIndex: 0,
    scores: { 1: 0, 2: 0 },
    bids: {},
    currentTrick: [],
    tricksWon: {},
    tricksPlayed: 0,
    spadesBroken: false,
};

export class SpadesGame extends BaseGame {
    teams: { [teamId: string]: string[] };
    deck: Deck;
    gameState: SpadesGameState;

    constructor(room: Room) {
        super(room); // Initialize BaseGame
        this.teams = { 1: [], 2: [] };
        this.deck = new Deck();
        this.gameState = defaultGameState;
    }

    startGame(): void {
        if (
            Object.keys(this.players).length < 4 ||
            this.turnOrder.length != 4
        ) {
            throw new Error("Spades requires exactly 4 players.");
        }
        this.initializeSpadesPlayers();
        this.assignTeams();
        this.initializeGameState();
    }

    async handlePlayerAction(playerId: string, action: any): Promise<void> {
        switch (action.type) {
            case PlayerAction.PLACE_BID:
                this.makeBid(playerId, action.bid);
                break;
            case PlayerAction.PLAY_CARD:
                await this.handlePlayCard(playerId, action.card);
                break;
            default:
                throw new Error("Invalid player action.");
        }
    }

    getGameState(): SpadesGameState {
        return this.gameState;
    }

    endGame(): void {
        this.gameState = defaultGameState;
        this.gameState.phase = GameState.GAME_OVER;
        // Optionally, notify players
        this.broadcastToAllPlayers("GAME_ENDED", { gameId: this.gameId });
    }

    getInitialGameState() {
        const playersInOrder = this.turnOrder.map((id) =>
            this.players[id].toPublicObject()
        );
        return {
            teams: this.teams,
            players: playersInOrder,
        };
    }

    getGameStateForPlayer(playerId: string): any {
        const spadesData = this.players[playerId].gameData[
            "spades"
        ] as SpadesGameData;

        // Public information
        const gameStateForPlayer = {
            phase: this.gameState.phase,
            currentTurnIndex: this.gameState.currentTurnIndex,
            currentTurnPlayerId:
                this.turnOrder[this.gameState.currentTurnIndex],
            scores: this.gameState.scores,
            // bids: this.getPublicBids(),
            bids: this.gameState?.bids,
            tricksWon: this.gameState.tricksWon,
            currentTrick: this.gameState.currentTrick.map(
                ({ playerId, card }, index) => ({
                    playerId,
                    // Reveal cards that have been played
                    card:
                        index < this.gameState.currentTrick.length
                            ? card
                            : null,
                })
            ),
            hand: spadesData.hand, // Player's own hand
        };

        return gameStateForPlayer;
    }

    private assignTeams(): void {
        // Assign players to teams
        // Assuming players[0] & players[2] are Team 1, players[1] & players[3] are Team 2
        for (let i = 0; i < this.turnOrder.length; i++) {
            const playerId = this.turnOrder[i];
            // console.log(`Player ${playerId} assigned to team ${i % 2 + 1}`);
            this.teams[(i % 2) + 1].push(playerId);
        }
        this.gameState.scores[1] = 0;
        this.gameState.scores[2] = 0;
    }

    determineFirstPlayer(): number {
        // The player with the 2 of clubs starts
        for (const playerId in this.players) {
            const spadesData = this.players[playerId].gameData[
                "spades"
            ] as SpadesGameData;
            const hasTwoOfClubs = spadesData.hand.some(
                (card) => card.suit === "Clubs" && card.value === "2"
            );
            if (hasTwoOfClubs) {
                return this.turnOrder.indexOf(playerId);
            }
        }
        return -1;
    }

    makeBid(playerId: string, bid: number): void {
        // Validate that it's the player's turn to bid
        const currentPlayerId = this.turnOrder[this.gameState.currentTurnIndex];
        if (playerId !== currentPlayerId) {
            throw new Error("It's not your turn to bid.");
        }

        // Validate the bid
        if (bid < 0 || bid > 13) {
            throw new Error("Invalid bid. Must be between 0 and 13.");
        }

        // Record the bid
        this.gameState.bids[playerId] = bid;
        const spadesData = this.players[playerId].gameData[
            "spades"
        ] as SpadesGameData;
        spadesData.bid = bid;

        // Advance the turn to the next player
        this.advanceTurn();

        // Notify all players of the bid made
        this.broadcastToAllPlayers("BID_MADE", {
            playerId,
            bid,
            currentTurnIndex: this.gameState.currentTurnIndex,
            bids: this.gameState.bids,
        });

        // Check if all bids have been made
        const allBidsMade = Object.values(this.gameState.bids).every(
            (b) => b !== null
        );
        if (allBidsMade) {
            this.startTrickTakingPhase();
        }
    }

    private startTrickTakingPhase(): void {
        // Set currentTurnIndex to the player who has the 2 of clubs
        this.gameState.currentTurnIndex = this.determineFirstPlayer();
        this.gameState.phase = GameState.TRICK_TAKING;

        // Notify all players that the trick-taking phase has started
        this.broadcastToAllPlayers("TRICK_TAKING_STARTED", {
            currentTurnIndex: this.gameState.currentTurnIndex,
        });
    }

    private advanceTurn(): void {
        this.gameState.currentTurnIndex =
            (this.gameState.currentTurnIndex + 1) % this.turnOrder.length;
    }

    private initializeGameState(): void {
        const bids: { [playerId: string]: number | null } = {};
        const tricksWon: { [playerId: string]: number } = {};
        for (const playerId of this.turnOrder) {
            bids[playerId] = null;
            tricksWon[playerId] = 0;
        }

        this.gameState = {
            phase: GameState.BIDDING,
            currentTurnIndex: 0,
            scores: { 1: 0, 2: 0 },
            bids: bids,
            currentTrick: [],
            tricksWon: tricksWon,
            tricksPlayed: 0, // Initialize to 0
            spadesBroken: false,
        };
    }

    initializeSpadesPlayers() {
        const hands: Card[][] = [[], [], [], []];
        this.deck.shuffle();

        for (let i = 0; i < 52; i++) {
            hands[i % 4].push(this.deck.cards.pop()!);
        }

        for (const playerId in this.players) {
            const playerIndex = this.turnOrder.indexOf(playerId);
            const spadesData = new SpadesGameData(
                this.deck.sortHand(hands[playerIndex])
            );
            this.players[playerId].gameData["spades"] = spadesData;
        }
    }

    // Method to handle 'PLAY_CARD' events
    private async handlePlayCard(playerId: string, card: Card): Promise<void> {
        if (this.gameState.phase !== GameState.TRICK_TAKING) {
            throw new Error("It's not the trick-taking phase.");
        }

        // Validate that it's the player's turn
        const currentPlayerId = this.turnOrder[this.gameState.currentTurnIndex];
        if (playerId !== currentPlayerId) {
            throw new Error("It's not your turn to play.");
        }

        // Validate that the player has the card
        const playerHand = (
            this.players[playerId].gameData["spades"] as SpadesGameData
        ).hand;
        const cardIndex = playerHand.findIndex(
            (c) => c.suit === card.suit && c.value === card.value
        );
        if (cardIndex === -1) {
            throw new Error("You don't have that card.");
        }

        // Validate that the card can be played
        this.validateCardPlay(playerId, card);

        // Remove the card from the player's hand
        playerHand.splice(cardIndex, 1);

        // Update spadesBroken flag if a spade is played
        if (card.suit === "Spades" && !this.gameState.spadesBroken) {
            this.gameState.spadesBroken = true;
            this.broadcastToAllPlayers("SPADES_BROKEN", {});
        }

        // Add the card to the current trick
        this.gameState.currentTrick.push({ playerId, card });

        // Advance the turn
        this.advanceTurn();

        this.broadcastToAllPlayers("CARD_PLAYED", {
            playerId,
            card,
            currentTurnIndex: this.gameState.currentTurnIndex,
        });

        // If the trick is complete, determine the winner
        if (this.gameState.currentTrick.length === 4) {
            await this.completeTrick();
        }
    }

    private validateCardPlay(playerId: string, card: Card): void {
        const currentTrick = this.gameState.currentTrick;
        const spadesData = this.players[playerId].gameData[
            "spades"
        ] as SpadesGameData;
        const playerHand = spadesData.hand;

        if (currentTrick.length === 0) {
            // Player is leading the trick
            if (card.suit === "Spades" && !this.gameState.spadesBroken) {
                // Check if player has only spades left
                const hasOnlySpades = playerHand.every(
                    (c) => c.suit === "Spades"
                );
                if (!hasOnlySpades) {
                    throw new Error(
                        "Cannot lead with spades until they have been broken."
                    );
                }
            }
        } else {
            // Player must follow suit if possible
            const leadSuit = currentTrick[0].card.suit;
            if (card.suit !== leadSuit) {
                const hasLeadSuit = playerHand.some((c) => c.suit === leadSuit);
                if (hasLeadSuit) {
                    throw new Error(`You must follow suit: ${leadSuit}.`);
                }
            }
        }
    }

    private async completeTrick(): Promise<void> {
        const trick = this.gameState.currentTrick;
        this.broadcastToAllPlayers("GAME_STATE_UPDATE", {
            gameState: this.gameState,
        });

        // Determine the winning player
        let winningPlayerId = trick[0].playerId;
        let winningCard = trick[0].card;

        for (let i = 1; i < trick.length; i++) {
            const currentCard = trick[i].card;
            const currentPlayerId = trick[i].playerId;

            if (currentCard.suit === winningCard.suit) {
                if (
                    this.getCardRank(currentCard) >
                    this.getCardRank(winningCard)
                ) {
                    winningCard = currentCard;
                    winningPlayerId = currentPlayerId;
                }
            } else if (currentCard.suit === "Spades") {
                if (
                    winningCard.suit !== "Spades" ||
                    this.getCardRank(currentCard) >
                        this.getCardRank(winningCard)
                ) {
                    winningCard = currentCard;
                    winningPlayerId = currentPlayerId;
                }
            }
        }

        // Update tricks won for the winning player
        this.gameState.tricksWon[winningPlayerId] += 1;
        this.gameState.tricksPlayed += 1;

        // Notify players about the winner
        this.broadcastToAllPlayers("TRICK_COMPLETED", {
            winningPlayerId,
            winningPlayerName: this.players[winningPlayerId].name,
            currentTurnIndex: null,
        });

        // Wait for a delay before starting the next trick
        const delayDuration = 3000; // Delay duration in milliseconds
        await new Promise((resolve) => setTimeout(resolve, delayDuration));

        // Clear the current trick
        this.gameState.currentTrick = [];

        if (this.gameState.tricksPlayed === 13) {
            // Handle end of round logic (calculate scores, start new round, or end game)
            const { teamRoundScores, teamBids, teamTricksWon } =
                this.calculateScores();

            const roundStats = {
                teams: [
                    {
                        teamId: "1",
                        players: this.teams["1"].map((playerId) => {
                            const player = this.players[playerId];
                            return {
                                playerId,
                                name: player.name,
                                bid: this.gameState.bids[playerId],
                                tricksWon: this.gameState.tricksWon[playerId],
                            };
                        }),
                        totalBid: teamBids["1"],
                        totalTricksWon: teamTricksWon["1"],
                        roundScore: teamRoundScores["1"],
                        totalScore: this.gameState.scores["1"],
                    },
                    {
                        teamId: "2",
                        players: this.teams["2"].map((playerId) => {
                            const player = this.players[playerId];
                            return {
                                playerId,
                                name: player.name,
                                bid: this.gameState.bids[playerId],
                                tricksWon: this.gameState.tricksWon[playerId],
                            };
                        }),
                        totalBid: teamBids["2"],
                        totalTricksWon: teamTricksWon["2"],
                        roundScore: teamRoundScores["2"],
                        totalScore: this.gameState.scores["2"],
                    },
                ],
            };

            // Notify players about the end of the round
            this.broadcastToAllPlayers("ROUND_ENDED", {
                roundStats,
            });

            const delayDuration = 5000; // 5 seconds
            await new Promise((resolve) => setTimeout(resolve, delayDuration));

            this.continueRound();
        } else {
            // Set the next turn to the winner of the trick
            this.gameState.currentTurnIndex =
                this.turnOrder.indexOf(winningPlayerId);
            // Proceed to the next trick
            this.broadcastToAllPlayers("NEXT_TRICK", {
                currentTurnIndex: this.gameState.currentTurnIndex,
            });
        }
    }

    continueRound(): void {
        // check if the game should end
        const winningScore = 500; // You can adjust this value
        const gameOver = Object.values(this.gameState.scores).some(
            (score) => score >= winningScore
        );

        if (gameOver) {
            this.gameState.phase = GameState.GAME_OVER;
            this.broadcastToAllPlayers("GAME_OVER", {
                scores: this.gameState.scores,
            });
            this.endGame();
        } else {
            this.startNewRound();
            this.broadcastToAllPlayers("NEW_ROUND_STARTED", {
                currentTurnIndex: this.gameState.currentTurnIndex,
            });
        }
    }

    private getCardRank(card: Card): number {
        const rankOrder = {
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5,
            "6": 6,
            "7": 7,
            "8": 8,
            "9": 9,
            "10": 10,
            J: 11,
            Q: 12,
            K: 13,
            A: 14,
        };
        return rankOrder[card.value];
    }

    calculateScores(): {
        teamRoundScores: { [teamId: string]: number };
        teamBids: { [teamId: string]: number };
        teamTricksWon: { [teamId: string]: number };
    } {
        const teamRoundScores: { [teamId: string]: number } = {};
        const teamTricksWon: { [teamId: string]: number } = { 1: 0, 2: 0 };
        const teamBids: { [teamId: string]: number } = { 1: 0, 2: 0 };

        for (const teamId in this.teams) {
            for (const playerId of this.teams[teamId]) {
                const tricksWon = this.gameState.tricksWon[playerId];
                const bid = this.gameState.bids[playerId]!;
                teamTricksWon[teamId] += tricksWon;
                teamBids[teamId] += bid;
            }
        }

        for (const teamId in this.teams) {
            const tricksWon = teamTricksWon[teamId];
            const bid = teamBids[teamId];
            let roundScore = 0;

            if (tricksWon >= bid) {
                roundScore += bid * 10;
                roundScore += tricksWon - bid; // Overtricks (bags)
            } else {
                roundScore -= bid * 10;
            }

            this.gameState.scores[teamId] += roundScore;
            teamRoundScores[teamId] = roundScore;
        }

        return { teamRoundScores, teamBids, teamTricksWon };
    }

    startNewRound(): void {
        // Reset bids and tricks won
        for (const playerId of this.turnOrder) {
            this.gameState.bids[playerId] = null;
            this.gameState.tricksWon[playerId] = 0;
        }

        // Reset deck and deal new hands
        this.deck = new Deck();
        this.initializeSpadesPlayers();
        this.gameState.spadesBroken = false;
        this.gameState.phase = GameState.BIDDING;

        // Reset currentTurnIndex to start bidding again
        this.gameState.currentTurnIndex = 0;
    }
}
