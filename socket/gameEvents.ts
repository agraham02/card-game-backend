// backend/socket/gameEvents.ts
import { Server, Socket } from "socket.io";
import Game from "../game/Game";
import {
    validatePlay,
    evaluateTrick,
    calculateScores,
} from "../utils/validation";
import { Player } from "../game/Player";

export const games: { [roomId: string]: Game } = {};

export function handleGameEvents(io: Server, socket: Socket) {
    // Handle joining a room
    socket.on("join_room", ({ roomId, playerName }) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Create a new game if it doesn't exist
        if (!games[roomId]) {
            games[roomId] = new Game(roomId);
        }

        const game = games[roomId];

        // Add the player to the game
        const player: Player = {
            id: socket.id,
            name: playerName,
            hand: [],
            bid: 0,
            tricksWon: 0,
            socket: socket,
        };
        game.addPlayer(player);

        // Notify players in the room
        io.to(roomId).emit(
            "player_list",
            game.players.map((p) => ({ id: p.id, name: p.name }))
        );

        // Start the game if 4 players have joined
        // TODO: change this to a start button trigger
        if (game.players.length === 4) {
            game.dealCards();
        }
    });

    // Other game-related socket events, e.g., play_card, submit_bid, etc.
    socket.on("submit_bid", ({ roomId, bid }) => {
        const game = games[roomId];
        const player = game.players.find((p) => p.id === socket.id);

        if (game.phase !== "bidding") return;

        if (player) {
            player.bid = bid;
            game.bidsReceived++;

            // Notify all players of the bid
            io.to(roomId).emit("bid_submitted", {
                playerId: player.id,
                bid,
            });

            if (game.bidsReceived === 4) {
                game.phase = "playing";
                game.currentTurn = 0; // Reset to the first player
                io.to(roomId).emit("start_play", {
                    currentPlayerId: game.players[game.currentTurn].id,
                });
            }
        }
    });

    socket.on("play_card", ({ roomId, card }) => {
        const game = games[roomId];
        const playerIndex = game.players.findIndex((p) => p.id === socket.id);

        if (game.phase !== "playing") return;

        if (playerIndex === game.currentTurn) {
            const player = game.players[playerIndex];

            // Validate the move
            const isValid = validatePlay(game, player, card);
            if (!isValid) {
                socket.emit("invalid_move", "You cannot play that card.");
                return;
            }

            // Remove the card from the player's hand
            player.hand = player.hand.filter(
                (c) => !(c.suit === card.suit && c.value === card.value)
            );

            // Add the card to the current trick
            game.currentTrick.push({ playerId: player.id, card });

            // Broadcast the played card
            io.to(roomId).emit("card_played", {
                playerId: player.id,
                card: card,
            });

            // Update game state
            if (game.currentTrick.length === 4) {
                // Evaluate the trick
                const winnerIndex = evaluateTrick(game);
                console.log(
                    `Player ${game.players[winnerIndex].name}-${game.players[winnerIndex].id} won the trick!`
                );
                game.players[winnerIndex].tricksWon++;
                game.currentTurn = winnerIndex;
                game.currentTrick = [];
                game.leadingSuit = null;
                game.tricksPlayed++;

                // Check if the hand is over
                if (game.tricksPlayed === 13) {
                    game.phase = "scoring";
                    // Calculate scores
                    calculateScores(game);
                    // Send scores to players
                    io.to(roomId).emit("round_over", {
                        players: game.players,
                    });
                    // Reset for the next round or end the game
                } else {
                    // Start the next trick
                    io.to(roomId).emit("next_trick", {
                        currentPlayerId: game.players[game.currentTurn].id,
                    });
                }
            } else {
                // Proceed to the next player's turn
                game.currentTurn = (game.currentTurn + 1) % 4;
                io.to(roomId).emit("next_turn", {
                    currentPlayerId: game.players[game.currentTurn].id,
                });
            }
        } else {
            socket.emit("invalid_move", "It is not your turn.");
        }
    });
}
