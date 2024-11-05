// backend/game/Card.ts

export type Suit = "Hearts" | "Clubs" | "Diamonds" | "Spades";
export type Value =
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "J"
    | "Q"
    | "K"
    | "A";

export interface Card {
    suit: Suit;
    value: Value;
}
