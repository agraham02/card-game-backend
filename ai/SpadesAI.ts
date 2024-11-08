// Basic implementation of the Spades AI player using Minimax
import { Card } from "./Card"; // Assume a Card class with `suit` and `value` properties
import { SpadesGame } from "./SpadesGame";
import { Player } from "../player/Player";

export class SpadesAI {
    game: SpadesGame;
    playerId: string;

    constructor(game: SpadesGame, playerId: string) {
        this.game = game;
        this.playerId = playerId;
    }

    /**
     * Make the best move using the Minimax algorithm.
     */
    makeMove(): Card {
        const hand = this.game.players[this.playerId].gameData["spades"]
            .hand as Card[];
        let bestScore = -Infinity;
        let bestMove: Card | null = null;

        hand.forEach((card) => {
            // Play the card temporarily to evaluate it
            this.playCardTemporarily(card);
            const score = this.minimax(3, false);
            this.undoPlayCard(card);

            if (score > bestScore) {
                bestScore = score;
                bestMove = card;
            }
        });

        // Make the best move
        if (bestMove) {
            this.game.handlePlayerAction(this.playerId, {
                type: "PLAY_CARD",
                card: bestMove,
            });
        }
        return bestMove!;
    }

    /**
     * Minimax algorithm to determine the best play.
     * @param depth - Depth limit to control recursion.
     * @param isMaximizingPlayer - True if AI is maximizing its score.
     */
    minimax(depth: number, isMaximizingPlayer: boolean): number {
        if (depth === 0 || this.game.isGameOver()) {
            return this.evaluateGameState();
        }

        const currentPlayer = isMaximizingPlayer
            ? this.playerId
            : this.game.getOpponentPlayer(this.playerId);
        const hand = this.game.players[currentPlayer].gameData["spades"]
            .hand as Card[];
        let bestScore = isMaximizingPlayer ? -Infinity : Infinity;

        hand.forEach((card) => {
            // Simulate playing the card
            this.playCardTemporarily(card);
            const score = this.minimax(depth - 1, !isMaximizingPlayer);
            this.undoPlayCard(card);

            if (isMaximizingPlayer) {
                bestScore = Math.max(bestScore, score);
            } else {
                bestScore = Math.min(bestScore, score);
            }
        });

        return bestScore;
    }

    /**
     * Evaluate the game state from the AI's perspective.
     * Positive values indicate a better state for the AI.
     */
    evaluateGameState(): number {
        const tricksWon = this.game.gameState.tricksWon[this.playerId];
        const opponentTricksWon = this.getOpponentTricksWon();
        // A simple evaluation based on the number of tricks won
        return tricksWon - opponentTricksWon;
    }

    /**
     * Play the card temporarily (for minimax evaluation purposes).
     */
    playCardTemporarily(card: Card): void {
        this.game.gameState.currentTrick.push({
            playerId: this.playerId,
            card,
        });
        const playerHand = this.game.players[this.playerId].gameData["spades"]
            .hand as Card[];
        const index = playerHand.findIndex(
            (c) => c.suit === card.suit && c.value === card.value
        );
        playerHand.splice(index, 1); // Remove the card from the hand
    }

    /**
     * Undo the card played temporarily.
     */
    undoPlayCard(card: Card): void {
        this.game.gameState.currentTrick =
            this.game.gameState.currentTrick.filter(
                (trick) => trick.card !== card
            );
        this.game.players[this.playerId].gameData["spades"].hand.push(card);
    }

    /**
     * Helper method to get the opponent player in a two-player scenario.
     */
    getOpponentPlayer(playerId: string): string {
        return Object.keys(this.game.players).find((id) => id !== playerId)!;
    }

    /**
     * Get opponent tricks won for evaluation.
     */
    getOpponentTricksWon(): number {
        return Object.keys(this.game.players)
            .filter((id) => id !== this.playerId)
            .reduce(
                (total, opponentId) =>
                    total + this.game.gameState.tricksWon[opponentId],
                0
            );
    }
}
