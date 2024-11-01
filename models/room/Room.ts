import { Player, PublicPlayer } from "../player/Player";

export class Room {
    roomId: string;
    roomStatus: "open" | "in_progress" | "closed" = "open";
    players: { [id: string]: Player } = {}; // Using an object to store players
    partyLeaderId: string | null = null;
    gameType: string | null = null;
    gameRules: any = {};
    maxPlayers: number = 4;
    turnOrder: string[] = []; // Array to store player IDs in play order

    constructor(roomId: string) {
        this.roomId = roomId;
    }

    getRoomState() {
        return {
            players: this.getAllPlayers(),
            partyLeaderId: this.partyLeaderId,
            gameType: this.gameType,
            gameRules: this.gameRules,
            turnOrder: this.turnOrder,
        };
    }

    setGameType(gameType: string): void {
        this.gameType = gameType;
    }

    setGameRules(rules: any): void {
        this.gameRules = rules;
    }

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
        if (this.partyLeaderId === playerId) {
            const playerIds = Object.keys(this.players);
            this.partyLeaderId = playerIds.length > 0 ? playerIds[0] : null; // Set new party leader if needed
        }
    }

    getPlayer(playerId: string): PublicPlayer | undefined {
        return this.players[playerId].toPublicObject(); // Retrieve player info by ID
    }

    getAllPlayers(): PublicPlayer[] {
        return Object.values(this.players).map((player) => player.toPublicObject()); // Get all player info as an array
    }

    canJoinRoom(): boolean {
        return (
            Object.keys(this.players).length < this.maxPlayers &&
            this.roomStatus === "open"
        ); // Check if room is full or open
    }

    isPartyLeader(playerId: string): boolean {
        console.log("isPartyLeader", playerId, this.partyLeaderId);
        return this.partyLeaderId === playerId;
    }

    startGame(playerId: string): void {
        if (!this.isPartyLeader(playerId)) {
            throw new Error("Only the party leader can start the game.");
        }

        if (Object.keys(this.players).length < this.maxPlayers) {
            throw new Error("Not enough players to start the game.");
        }

        this.roomStatus = "in_progress";
        // this.game = new Game(this.gameType); // Assuming you have a Game class
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
            this.setGameType(newSettings.gameType);
        }

        // Assuming you have a pointLimit property
        if (newSettings.pointLimit) {
            // this.game.pointLimit = newSettings.pointLimit;
        }

        console.log("Game settings updated:", newSettings);
    }

    assignPlayerToTeam(
        playerId: string,
        leaderId: string,
        targetPlayerId: string,
        teamId: string
    ): void {
        if (!this.isPartyLeader(leaderId)) {
            throw new Error("Only the party leader can assign teams.");
        }

        if (!this.players[targetPlayerId]) {
            throw new Error("Player not found.");
        }

        // if (!this.teams[teamId]) {
        //     throw new Error("Invalid team.");
        // }

        // this.teams[teamId].push(this.players[targetPlayerId]);
        // console.log(`Player ${targetPlayerId} assigned to team ${teamId}`);
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
