// backend/utils/validation.ts
import { Player } from "../game/Player";
import Game from "../game/Game";
import { Card, Value } from "../game/Card";

export function validatePlay(game: Game, player: Player, card: Card): boolean {
    const isInHand = player.hand.some(
        (c) => c.suit === card.suit && c.value === card.value
    );
    if (!isInHand) return false;

    if (game.currentTrick.length === 0) {
        // Player is leading the trick
        if (card.suit === "Spades" && !game.spadesBroken) {
            // Spades cannot be led until broken
            const hasOnlySpades = player.hand.every((c) => c.suit === "Spades");
            if (!hasOnlySpades) {
                return false;
            } else {
                game.spadesBroken = true;
            }
        }
        game.leadingSuit = card.suit;
    } else {
        // Player must follow suit if possible
        if (card.suit !== game.leadingSuit) {
            const hasLeadingSuit = player.hand.some(
                (c) => c.suit === game.leadingSuit
            );
            if (hasLeadingSuit) {
                return false;
            }
        }
    }

    // Spades are broken when a spade is played
    if (card.suit === "Spades") {
        game.spadesBroken = true;
    }

    return true;
}

export function evaluateTrick(game: Game): number {
    let winningCard = game.currentTrick[0];
    for (const play of game.currentTrick) {
        if (play.card.suit === winningCard.card.suit) {
            if (
                compareCardValues(play.card.value, winningCard.card.value) > 0
            ) {
                winningCard = play;
            }
        } else if (play.card.suit === "Spades") {
            if (
                winningCard.card.suit !== "Spades" ||
                compareCardValues(play.card.value, winningCard.card.value) > 0
            ) {
                winningCard = play;
            }
        }
    }
    // Return the index of the winning player
    return game.players.findIndex((p) => p.id === winningCard.playerId);
}

export function compareCardValues(value1: Value, value2: Value): number {
    const order: Value[] = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "J",
        "Q",
        "K",
        "A",
    ];
    return order.indexOf(value1) - order.indexOf(value2);
}

export function calculateScores(game: Game): void {
    game.players.forEach((player) => {
        let score = 0;
        if (player.tricksWon === player.bid) {
            score = player.bid * 10;
        } else if (player.tricksWon < player.bid) {
            score = player.bid * -10;
        } else {
            score = player.bid * 10 + (player.tricksWon - player.bid); // Overtricks
        }
        // You can maintain a total score in the player object
        player["totalScore"] = (player["totalScore"] ?? 0) + score;
    });
}

export function calculateTeamScores(game: Game): void {
    Object.values(game.teams).forEach((team) => {
        const teamBid = team.players.reduce(
            (sum, player) => sum + player.bid,
            0
        );
        const teamTricksWon = team.players.reduce(
            (sum, player) => sum + player.tricksWon,
            0
        );

        let teamScore = 0;
        if (teamTricksWon >= teamBid) {
            teamScore += teamBid * 10;
            teamScore += teamTricksWon - teamBid; // Overtricks
        } else {
            teamScore -= teamBid * 10;
        }
        team.score += teamScore;
    });
}
