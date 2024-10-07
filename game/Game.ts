// backend/game/Game.ts
import { Player } from "./Player";
import { Card, Suit, Value } from "./Card";
import { shuffleDeck } from "../utils/shuffle";

export default class Game {
    players: Player[] = [];
    deck: Card[] = [];
    partyLeaderId: string | null = null;
    playerOrder: string[] = [];
    teams: { [teamId: number]: { players: Player[]; score: number } } = {};
    currentTurnIndex: number = 0;
    phase: "waiting" | "bidding" | "playing" | "scoring" = "waiting";
    bidsReceived: number = 0;
    tricksPlayed: number = 0;
    currentTrick: { playerId: string; card: Card }[] = [];
    leadingSuit: Suit | null = null;
    spadesBroken: boolean = false;

    constructor(public roomId: string) {
        this.deck = this.createDeck();
    }

    createDeck(): Card[] {
        const suits: Suit[] = ["Spades", "Hearts", "Diamonds", "Clubs"];
        const values: Value[] = [
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
        const deck: Card[] = [];

        for (const suit of suits) {
            for (const value of values) {
                deck.push({ suit, value });
            }
        }
        return deck;
    }

    dealCards(): void {
        shuffleDeck(this.deck); // Use a utility function
        const hands: Card[][] = [[], [], [], []];

        for (let i = 0; i < 52; i++) {
            hands[i % 4].push(this.deck[i]);
        }

        this.players.forEach((player, index) => {
            player.hand = this.sortHand(hands[index]);
            player.bid = 0;
            player.tricksWon = 0;
            player.socket.emit("deal_hand", player.hand);
        });
    }

    sortHand(hand: Card[]): Card[] {
        const suitOrder: Record<Suit, number> = {
            Spades: 4,
            Hearts: 3,
            Clubs: 2,
            Diamonds: 1,
        };

        const valueOrder: Record<Value, number> = {
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

        return hand.sort((a, b) => {
            if (suitOrder[a.suit] !== suitOrder[b.suit]) {
                // Sort by suit first
                return suitOrder[a.suit] - suitOrder[b.suit];
            } else {
                // Sort by value if suits are the same
                return valueOrder[a.value] - valueOrder[b.value];
            }
        });
    }

    addPlayer(player: Player): void {
        if (this.players.length < 4) {
            this.players.push(player);
        }
    }

    removePlayer(playerId: string): void {
        this.players = this.players.filter((player) => player.id !== playerId);
    }

    getCurrentPlayerId(): string {
        return this.playerOrder[this.currentTurnIndex];
    }

    advanceTurn() {
        this.currentTurnIndex =
            (this.currentTurnIndex + 1) % this.players.length;
    }
}
