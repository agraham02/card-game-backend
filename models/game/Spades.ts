// SpadesGame.ts

import { Room } from "../room/Room";
import { Player } from "../player/Player";
import { Card } from "./Card";
import { BaseGame } from "./Game";
import { SpadesGameData } from "./SpadesGameData";
import { Deck } from "./Deck";

interface GameState {
    currentTurnIndex: number; // playerId
    scores: { [teamId: string]: number };
    // bids: { [playerId: string]: number };
    // tricksWon: { [playerId: string]: number };
    // Additional state properties as needed
}

export class SpadesGame extends BaseGame {
    teams: { [teamId: string]: Player[] };
    deck: Deck;
    gameState: GameState;

    constructor(room: Room) {
        super(room); // Initialize BaseGame
        this.teams = {};
        this.deck = new Deck();
        this.gameState = {
            currentTurnIndex: 0,
            scores: {},
        };
    }

    startGame(): void {
        this.assignTeams();
        this.initializeGameState();
        this.initializeSpadesPlayers();
        // this.initializeDeck();
        // this.dealCards();

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
                player?.socket?.emit("ERROR", {
                    message: "Invalid action type.",
                });
        }
    }

    getGameState(): any {
        return this.gameState;
    }

    endGame(): void {
        // Clean up resources and notify players
        this.broadcastToAllPlayers("GAME_ENDED", { gameId: this.gameId });
        // Additional cleanup if necessary
    }

    private assignTeams(): void {
        // Assign players to teams
        // Assuming players[0] & players[2] are Team 1, players[1] & players[3] are Team 2
        this.teams["team1"] = [this.players[0], this.players[2]];
        this.teams["team2"] = [this.players[1], this.players[3]];
        this.gameState.scores["team1"] = 0;
        this.gameState.scores["team2"] = 0;
    }

    determineFirstPlayer(): number {
        // The player with the 2 of clubs starts
        for (const playerId in this.players) {
            const spadesData = this.players[playerId].gameData["spades"] as SpadesGameData;
            const hasTwoOfClubs = spadesData.hand.some(
                (card) => card.suit === "Clubs" && card.value === "2"
            );
            if (hasTwoOfClubs) {
                return this.turnOrder.indexOf(playerId);
            }
        }
        return -1;
    }

    private initializeGameState(): void {
        this.gameState = {
            // teams: this.teams,
            currentTurnIndex: this.determineFirstPlayer(),
            scores: { team1: 0, team2: 0 },
            // Other game state properties
        };
    }

    initializeSpadesPlayers() {
        const hands: Card[][] = [[], [], [], []];

        for (let i = 0; i < 52; i++) {
            hands[i % 4].push(this.deck.cards[i]);
        }

        for (const playerId in this.players) {
            const playerIndex = this.turnOrder.indexOf(playerId); 
            const spadesData = new SpadesGameData(hands[playerIndex]);
            this.players[playerId].gameData["spades"] = spadesData;
        }
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

    getGameStateForPlayer(playerId: string) {
        const spadesData = this.room.players[playerId].gameData[
            "spades"
        ] as SpadesGameData;
        return {
            currentTurn: this.gameState.currentTurnIndex,
            scores: this.gameState.scores,
            bids: this.gameState.bids,
            tricksWon: this.gameState.tricksWon,
            hand: spadesData.hand,
            // Exclude other players' hands
        };
    }

    // Method to handle 'PLAY_CARD' events
    handlePlayCard(data: any, socket: Socket) {
        // Validate that it's the player's turn
        if (this.gameState.currentTurnIndex !== playerId) {
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
        this.gameState.currentTurnIndex = this.getNextPlayerId(playerId);
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
