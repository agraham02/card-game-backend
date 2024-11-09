// models/game/Deck.ts

import { Card } from "./Card";

export class Deck {
    cards: Card[] = [];

    constructor() {
        this.initializeDeck();
    }

    initializeDeck() {
        const suits: Card["suit"][] = ["Hearts", "Clubs", "Diamonds", "Spades"];
        const values: Card["value"][] = [
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

        for (const suit of suits) {
            for (const value of values) {
                this.cards.push({ suit, value });
            }
        }
    }

    shuffle() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    sortHand(hand: Card[]): Card[] {
        const suitOrder: Record<Card["suit"], number> = {
            Spades: 1,
            Hearts: 2,
            Clubs: 3,
            Diamonds: 4,
        };

        const valueOrder: Record<Card["value"], number> = {
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

    deal(numberOfCards: number): Card[] {
        return this.cards.splice(0, numberOfCards);
    }

    getSize(): number {
        return this.cards.length;
    }
}
