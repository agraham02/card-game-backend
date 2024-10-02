// backend/game/Player.ts
import { Card } from "./Card";

export interface Player {
    id: string;
    name: string;
    hand: Card[];
    bid: number;
    tricksWon: number;
    socket: any; // Reference to the player's socket connection
    totalScore?: number;
}
