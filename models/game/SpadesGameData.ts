// models/game/SpadesGameData.ts

import { Card } from "./Card";

export class SpadesGameData {
    hand: Card[] = [];
    bid: number = 0;
    tricksWon: number = 0;

    constructor(hand) {
        // Initialization code
    }

    makeBid(bid: number): void {
        this.bid = bid;
    }

    playCard(card: Card): void {
        // Logic to play a card
    }

    // Additional methods as needed
}
