// models/game/SpadesGameData.ts

import { Card } from "./Card";

export class SpadesGameData {
    hand: Card[];
    bid: number | null;
    tricksWon: number;

    constructor(hand: Card[]) {
        this.hand = hand;
        this.bid = null;
        this.tricksWon = 0;
    }

    makeBid(bid: number): void {
        this.bid = bid;
    }

    playCard(card: Card): void {
        // Logic to play a card
    }

    // Additional methods as needed
}
