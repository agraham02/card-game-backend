// backend/game/Game.ts
import { Player } from "./Player";
import { Card, Suit, Value } from "./Card";
import { shuffleDeck } from "../utils/shuffle";

export default class Game {
    players: Player[] = [];
    deck: Card[] = [];
    currentTurn: number = 0;
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
            player.hand = hands[index];
            player.bid = 0;
            player.tricksWon = 0;
            player.socket.emit("deal_hand", player.hand);
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
}
