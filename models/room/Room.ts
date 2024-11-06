import { Game } from "../game/Game";
import { GameFactory } from "../game/GameFactory";
import { SpadesGame } from "../game/SpadesGame";
import { Player, PublicPlayer } from "../player/Player";

export class Room {
    id: string;
    status: "open" | "in_progress" | "closed" = "open";
    players: { [id: string]: Player } = {}; // Using an object to store players
    partyLeaderId: string | null = null;
    gameInstance?: Game;
    gameRules: any = {};
    maxPlayers: number = 4;
    turnOrder: string[] = []; // Array to store player IDs in play order

    constructor(roomId: string) {
        this.id = roomId;
    }

    getRoomState() {
        return {
            id: this.id,
            players: this.getAllPlayers(),
            partyLeaderId: this.partyLeaderId,
            // gameInstance: this.gameInstance,
            gameRules: this.gameRules,
            turnOrder: this.turnOrder,
            status: this.status,
        };
    }

    // setGameRules(rules: any): void {
    //     this.gameRules = rules;
    // }

    addPlayer(player: Player): void {
        if (!this.players[player.id]) {
            this.players[player.id] = player;
            this.turnOrder.push(player.id); // Add player to turn order
            if (!this.partyLeaderId) {
                this.partyLeaderId = player.id;
            }
        }
    }

    removePlayer(playerId: string): void {
        delete this.players[playerId]; // Remove player by their ID

        // Remove the playerId from the turnOrder array
        this.turnOrder = this.turnOrder.filter((id) => id !== playerId);

        // If the party leader left, assign a new party leader if there are players left
        if (this.partyLeaderId === playerId) {
            const playerIds = Object.keys(this.players);
            this.partyLeaderId = playerIds.length > 0 ? playerIds[0] : null; // Set new party leader if needed
        }
    }

    getPlayer(playerId: string): PublicPlayer | undefined {
        return this.players[playerId].toPublicObject(); // Retrieve player info by ID
    }

    getAllPlayers(): PublicPlayer[] {
        return Object.values(this.players).map((player) =>
            player.toPublicObject()
        ); // Get all player info as an array
    }

    canJoinRoom(): boolean {
        return (
            Object.keys(this.players).length < this.maxPlayers &&
            this.status === "open"
        ); // Check if room is full or open
    }

    isPartyLeader(playerId: string): boolean {
        console.log("isPartyLeader", playerId, this.partyLeaderId);
        return this.partyLeaderId === playerId;
    }

    startGame(playerId: string, gameType: string): void {
        if (!this.isPartyLeader(playerId)) {
            throw new Error("Only the party leader can start the game.");
        }

        if (Object.keys(this.players).length < this.maxPlayers) {
            throw new Error("Not enough players to start the game.");
        }

        this.gameInstance = GameFactory.createGame(gameType, this);
        this.gameInstance.startGame();
        this.status = "in_progress";
        console.log("Game started!");
    }

    kickPlayer(playerId: string, targetPlayerId: string): void {
        if (!this.isPartyLeader(playerId)) {
            throw new Error("Only the party leader can kick players.");
        }

        if (!this.players[targetPlayerId]) {
            throw new Error("Player not found.");
        }

        this.removePlayer(targetPlayerId);
        console.log(`Player ${targetPlayerId} was kicked.`);
    }

    setGameSettings(
        playerId: string,
        newSettings: { gameType?: string; pointLimit?: number }
    ): void {
        if (!this.isPartyLeader(playerId)) {
            throw new Error("Only the party leader can change game settings.");
        }

        if (newSettings.gameType) {
            // this.setGameType(newSettings.gameType);
        }

        // Assuming you have a pointLimit property
        if (newSettings.pointLimit) {
            // this.game.pointLimit = newSettings.pointLimit;
        }

        console.log("Game settings updated:", newSettings);
    }

    promoteToLeader(currentLeaderId: string, newLeaderId: string): void {
        if (!this.isPartyLeader(currentLeaderId)) {
            throw new Error(
                "Only the current party leader can promote another player."
            );
        }

        if (!this.players[newLeaderId]) {
            throw new Error("New leader must be an active player.");
        }

        this.partyLeaderId = newLeaderId;
        console.log(`Player ${newLeaderId} is now the party leader.`);
    }

    setTurnOrder(playerId: string, newOrder: string[]): void {
        if (!this.isPartyLeader(playerId)) {
            throw new Error("Only the party leader can change the turn order.");
        }

        // Validate that all player IDs in the new order exist in the room
        const isValidOrder = newOrder.every((id) => this.players[id]);

        if (isValidOrder && newOrder.length === this.turnOrder.length) {
            this.turnOrder = [...newOrder];
            console.log("Turn order updated:", this.turnOrder);
        } else {
            throw new Error("Invalid turn order.");
        }
    }
}
