// SpadesGame.ts

import { Room } from "../../game/Room";
import { Player } from "../../player/Player";
import { Card } from "./Card";
import { BaseGame } from "./Game";

export class SpadesGame extends BaseGame {
    teams: { [teamId: number]: Player[] };
    deck: Card[];
    hands: { [playerId: string]: Card[] };

    constructor(room: Room) {
        super(room); // Initialize BaseGame
        this.teams = {};
        this.deck = [];
        this.hands = {};
        // Initialize other properties
    }

    startGame(): void {
        this.assignTeams();
        this.initializeDeck();
        this.dealCards();
        this.initializeGameState();

        // Send initial game state to all players
        this.sendInitialGameState();
    }

    handlePlayerAction(playerId: string, action: any): void {
        switch (action.type) {
            case "PLAY_CARD":
                this.handlePlayCard(playerId, action.card);
                break;
            // Handle other action types
            default:
                const player = this.findPlayerById(playerId);
                player?.socket.emit("ERROR", {
                    message: "Invalid action type.",
                });
        }
    }

    getGameState(): any {
        return this.gameState;
    }

    endGame(): void {
        // Clean up resources and notify players
        this.broadcastToPlayers("GAME_ENDED", { gameId: this.gameId });
        // Additional cleanup if necessary
    }

    private assignTeams(): void {
        // Assign players to teams
        this.teams = {
            1: [this.players[0], this.players[2]],
            2: [this.players[1], this.players[3]],
        };
        this.players[0].teamId = 1;
        this.players[2].teamId = 1;
        this.players[1].teamId = 2;
        this.players[3].teamId = 2;
    }

    private initializeDeck(): void {
        this.deck = this.createDeck();
        this.shuffleDeck();
    }

    private createDeck(): Card[] {
        const suits = ["hearts", "diamonds", "clubs", "spades"];
        const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        const deck: Card[] = [];
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({ suit, rank });
            }
        }
        return deck;
    }

    private shuffleDeck(): void {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    private dealCards(): void {
        const cardsPerPlayer = 13;
        for (const player of this.players) {
            this.hands[player.id] = this.deck.splice(0, cardsPerPlayer);
        }
    }

    private initializeGameState(): void {
        this.gameState = {
            players: this.players.map((player) => ({
                id: player.id,
                name: player.name,
                teamId: player.teamId,
            })),
            teams: this.teams,
            currentTurn: this.determineFirstPlayer(),
            scores: { team1: 0, team2: 0 },
            // Other game state properties
        };
    }

    private sendInitialGameState(): void {
        for (const player of this.players) {
            const playerHand = this.hands[player.id];
            player.socket.emit("GAME_STARTED", {
                gameState: {
                    ...this.gameState,
                    hand: playerHand,
                },
            });
        }
    }

    getHandsForPlayers() {
        // Return hands with only the cards visible to each player
        const handsForPlayers: { [playerId: string]: Card[] } = {};
        for (const player of this.players) {
            handsForPlayers[player.id] = this.hands[player.id];
        }
        return handsForPlayers;
    }

    determineFirstPlayer() {
        // Logic to determine which player goes first
        // For simplicity, let's start with player[0]
        return this.players[0].id;
    }

    // Method to handle 'PLAY_CARD' events
    handlePlayCard(data: any, socket: Socket) {
        // Validate that it's the player's turn
        if (this.gameState.currentTurn !== playerId) {
            const player = this.findPlayerById(playerId);
            player?.socket.emit("ERROR", { message: "It's not your turn." });
            return;
        }

        // Validate that the player has the card
        const playerHand = this.hands[playerId];
        const cardIndex = playerHand.findIndex(
            (c) => c.suit === card.suit && c.rank === card.rank
        );

        if (cardIndex === -1) {
            const player = this.findPlayerById(playerId);
            player?.socket.emit("ERROR", {
                message: "You don't have that card.",
            });
            return;
        }

        // Additional game rules validation (e.g., following suit)

        // Remove the card from the player's hand
        playerHand.splice(cardIndex, 1);

        // Update game state (e.g., add card to the current trick)
        // ...

        // Broadcast the card played to all players
        this.broadcastToPlayers("CARD_PLAYED", {
            playerId,
            card,
        });

        // Update current turn
        this.gameState.currentTurn = this.getNextPlayerId(playerId);
    }

    // Additional methods for game logic...
    private getNextPlayerId(currentPlayerId: string): string {
        const currentIndex = this.players.findIndex(
            (p) => p.id === currentPlayerId
        );
        const nextIndex = (currentIndex + 1) % this.players.length;
        return this.players[nextIndex].id;
    }
}
