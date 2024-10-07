// backend/socket/gameEvents.ts
import { Server, Socket } from "socket.io";
import Game from "../game/Game";
import {
    validatePlay,
    evaluateTrick,
    calculateScores,
    calculateTeamScores,
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

        // Assign the first player as the party leader
        if (!game.partyLeaderId) {
            game.partyLeaderId = player.id;
        }

        // Notify all players about the updated player list and party leader
        io.to(roomId).emit("player_list", {
            players: game.players.map((p) => ({
                id: p.id,
                name: p.name,
                bid: p.bid,
                tricksWon: p.tricksWon,
            })),
            partyLeaderId: game.partyLeaderId,
        });
    });

    // backend/socket/gameEvents.ts

    socket.on("transfer_leadership", ({ roomId, newLeaderId }) => {
        const game = games[roomId];
        if (!game) return;

        // Check if the requester is the current party leader
        if (socket.id !== game.partyLeaderId) {
            socket.emit(
                "error",
                "Only the party leader can transfer leadership."
            );
            return;
        }

        // Check if the new leader exists in the game
        const newLeader = game.players.find((p) => p.id === newLeaderId);
        if (!newLeader) {
            socket.emit("error", "Selected player is not in the game.");
            return;
        }

        // Transfer leadership
        game.partyLeaderId = newLeaderId;

        // Notify all players about the updated party leader
        io.to(roomId).emit("party_leader_changed", {
            partyLeaderId: game.partyLeaderId,
        });
    });

    // backend/socket/gameEvents.ts

    socket.on("set_player_order", ({ roomId, playerOrder }) => {
        console.log(playerOrder);
        const game = games[roomId];
        if (!game) return;

        // Verify the requester is the party leader
        if (socket.id !== game.partyLeaderId) {
            socket.emit(
                "error",
                "Only the party leader can set the player order."
            );
            return;
        }

        // Validate the player order
        const isValidOrder =
            playerOrder.length === game.players.length &&
            playerOrder.every((id: string) =>
                game.players.some((p) => p.id === id)
            );

        if (!isValidOrder) {
            socket.emit("error", "Invalid player order.");
            return;
        }

        game.playerOrder = playerOrder;

        // Assign teams based on player positions
        game.players.forEach((player) => {
            const position = game.playerOrder.indexOf(player.id);
            if (position === -1) return;
            player.teamId = position % 2 === 0 ? 1 : 2; // Team 1: positions 0,2; Team 2: positions 1,3
        });

        // Update teams structure
        game.teams = {
            1: { players: [], score: 0 },
            2: { players: [], score: 0 },
        };
        game.players.forEach((player) => {
            const team = game.teams[player.teamId!];
            team.players.push(player);
        });

        // Notify all players about the updated order and teams
        console.log(game.playerOrder);
        io.to(roomId).emit("player_order_updated", {
            newPlayerOrder: game.playerOrder,
            teamAssignments: game.players.map((p) => ({
                playerId: p.id,
                teamId: p.teamId,
            })),
        });
    });

    socket.on("start_game", ({ roomId }) => {
        const game = games[roomId];
        if (!game) return;

        // Check if the requester is the party leader
        if (socket.id !== game.partyLeaderId) {
            socket.emit("error", "Only the party leader can start the game.");
            return;
        }

        if (game.players.length < 4 || game.playerOrder.length < 4) {
            socket.emit("error", "Game requires 4 players to start");
            return;
        }

        game.dealCards();
        game.phase = "bidding";
        io.to(roomId).emit("start_bidding");
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
                game.currentTurnIndex = 0; // Reset to the first player
                io.to(roomId).emit("start_play", {
                    currentPlayerId: game.playerOrder[game.currentTurnIndex],
                });
            }
        }
    });

    socket.on("play_card", ({ roomId, card }) => {
        const game = games[roomId];
        // const playerIndex = game.players.findIndex((p) => p.id === socket.id);

        if (game.phase !== "playing") return;

        if (socket.id === game.getCurrentPlayerId()) {
            const player = game.players[game.currentTurnIndex];

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
                io.to(roomId).emit("trick_won", {
                    winnerId: game.players[winnerIndex].id,
                    tricksWon: game.players[winnerIndex].tricksWon,
                });
                game.currentTurnIndex = winnerIndex;
                game.currentTrick = [];
                game.leadingSuit = null;
                game.tricksPlayed++;

                // Check if the hand is over
                if (game.tricksPlayed === 13) {
                    game.phase = "scoring";
                    // Calculate scores
                    // calculateScores(game);
                    calculateTeamScores(game);

                    // Send scores to players
                    io.to(roomId).emit("round_over", {
                        teams: Object.entries(game.teams).map(
                            ([teamId, team]) => ({
                                teamId: parseInt(teamId),
                                score: team.score,
                                players: team.players.map((p) => ({
                                    id: p.id,
                                    name: p.name,
                                })),
                            })
                        ),
                    });
                    // Reset for the next round or end the game
                } else {
                    // Start the next trick
                    io.to(roomId).emit("next_trick", {
                        currentPlayerId: game.players[game.currentTurnIndex].id,
                    });
                }
            } else {
                // Proceed to the next player's turn
                game.advanceTurn();
                io.to(roomId).emit("next_turn", {
                    currentPlayerId: game.getCurrentPlayerId(),
                });
            }
        } else {
            console.log(socket.id);
            console.log(game.getCurrentPlayerId());
            socket.emit("invalid_move", "It is not your turn.");
        }
    });
}
