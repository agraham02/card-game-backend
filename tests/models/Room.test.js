"use strict";
// Room.test.ts
Object.defineProperty(exports, "__esModule", { value: true });
const Room_1 = require("../../models/room/Room");
const Player_1 = require("../../models/player/Player");
describe("Room Model", () => {
    let room;
    let players;
    beforeEach(() => {
        room = new Room_1.Room("room1");
        players = [
            new Player_1.Player("player1", "Alice", null),
            new Player_1.Player("player2", "Bob", null),
            new Player_1.Player("player3", "Charlie", null),
            new Player_1.Player("player4", "Diana", null),
        ];
    });
    test("should initialize with correct ID and status", () => {
        expect(room.id).toBe("room1");
        expect(room.status).toBe("open");
    });
    test("should add players and assign party leader", () => {
        players.forEach((player) => room.addPlayer(player));
        expect(Object.keys(room.players)).toHaveLength(4);
        expect(room.partyLeaderId).toBe("player1");
    });
    test("should not start game with fewer than 4 players", () => {
        room.addPlayer(players[0]);
        room.addPlayer(players[1]);
        expect(() => room.startGame("player1", "spades")).toThrow("Not enough players to start the game.");
    });
    test("should set room status to in_progress on game start", () => {
        players.forEach((player) => room.addPlayer(player));
        room.startGame("player1", "spades");
        expect(room.status).toBe("in_progress");
    });
    test("should reassign party leader if current leader leaves", () => {
        players.forEach((player) => room.addPlayer(player));
        room.removePlayer("player1");
        expect(room.partyLeaderId).toBe("player2");
    });
});
describe("Room Class - addPlayer", () => {
    let room;
    beforeEach(() => {
        room = new Room_1.Room("room1");
    });
    test("should add a player to an empty room and set as party leader", () => {
        const player = new Player_1.Player("player1", "Alice", null);
        room.addPlayer(player);
        expect(Object.keys(room.players)).toContain(player.id);
        expect(room.partyLeaderId).toBe(player.id);
        expect(room.turnOrder).toContain(player.id);
    });
    test("should add a player to a non-empty room", () => {
        const player1 = new Player_1.Player("player1", "Alice", null);
        const player2 = new Player_1.Player("player2", "Bob", null);
        room.addPlayer(player1);
        room.addPlayer(player2);
        expect(Object.keys(room.players)).toContain(player2.id);
        expect(room.partyLeaderId).toBe(player1.id); // Party leader remains the same
        expect(room.turnOrder).toEqual([player1.id, player2.id]);
    });
    test("should not add a player who is already in the room", () => {
        const player = new Player_1.Player("player1", "Alice", null);
        room.addPlayer(player);
        room.addPlayer(player); // Attempt to add the same player again
        expect(Object.keys(room.players)).toEqual([player.id]);
        expect(room.turnOrder).toEqual([player.id]);
    });
});
describe("Room Class - removePlayer", () => {
    let room;
    let player1;
    let player2;
    beforeEach(() => {
        room = new Room_1.Room("room1");
        player1 = new Player_1.Player("player1", "Alice", null);
        player2 = new Player_1.Player("player2", "Bob", null);
        room.addPlayer(player1);
        room.addPlayer(player2);
    });
    test("should remove a player from the room", () => {
        room.removePlayer(player2.id);
        expect(Object.keys(room.players)).not.toContain(player2.id);
        expect(room.turnOrder).not.toContain(player2.id);
    });
    test("should assign a new party leader when the current leader leaves", () => {
        room.removePlayer(player1.id);
        expect(room.partyLeaderId).toBe(player2.id);
        expect(room.turnOrder).not.toContain(player1.id);
    });
    test("should set partyLeaderId to null when the last player leaves", () => {
        room.removePlayer(player1.id);
        room.removePlayer(player2.id);
        expect(room.partyLeaderId).toBeNull();
        expect(room.turnOrder).toEqual([]);
    });
    test("should handle removing a non-existent player gracefully", () => {
        room.removePlayer("nonExistentPlayer");
        // No changes should have occurred
        expect(Object.keys(room.players)).toEqual([player1.id, player2.id]);
        expect(room.turnOrder).toEqual([player1.id, player2.id]);
    });
});
describe("Room Class - isPartyLeader", () => {
    let room;
    let player1;
    let player2;
    beforeEach(() => {
        room = new Room_1.Room("room1");
        player1 = new Player_1.Player("player1", "Alice", null);
        player2 = new Player_1.Player("player2", "Bob", null);
        room.addPlayer(player1);
        room.addPlayer(player2);
    });
    test("should return true if the player is the party leader", () => {
        expect(room.isPartyLeader(player1.id)).toBe(true);
    });
    test("should return false if the player is not the party leader", () => {
        expect(room.isPartyLeader(player2.id)).toBe(false);
    });
});
describe("Room Class - startGame", () => {
    let room;
    let player1;
    let player2;
    let player3;
    let player4;
    beforeEach(() => {
        room = new Room_1.Room("room1");
        player1 = new Player_1.Player("player1", "Alice", null);
        player2 = new Player_1.Player("player2", "Bob", null);
        player3 = new Player_1.Player("player3", "Charlie", null);
        player4 = new Player_1.Player("player4", "Diana", null);
    });
    test("party leader starts the game with enough players", () => {
        room.addPlayer(player1);
        room.addPlayer(player2);
        room.addPlayer(player3);
        room.addPlayer(player4);
        room.startGame(player1.id, "spades");
        expect(room.status).toBe("in_progress");
        expect(room.gameInstance).toBeDefined();
        // expect(room.gameInstance instanceof SpadesGame).toBe(true);
    });
    test("non-party leader attempts to start the game", () => {
        room.addPlayer(player1);
        room.addPlayer(player2);
        room.addPlayer(player3);
        room.addPlayer(player4);
        expect(() => room.startGame(player2.id, "spades")).toThrow("Only the party leader can start the game.");
    });
    test("attempt to start game with not enough players", () => {
        room.addPlayer(player1);
        room.addPlayer(player2);
        expect(() => room.startGame(player1.id, "spades")).toThrow("Not enough players to start the game.");
    });
});
describe("Room Class - setTurnOrder", () => {
    let room;
    let player1;
    let player2;
    let player3;
    let player4;
    beforeEach(() => {
        room = new Room_1.Room("room1");
        player1 = new Player_1.Player("player1", "Alice", null);
        player2 = new Player_1.Player("player2", "Bob", null);
        player3 = new Player_1.Player("player3", "Charlie", null);
        player4 = new Player_1.Player("player4", "Diana", null);
        room.addPlayer(player1);
        room.addPlayer(player2);
        room.addPlayer(player3);
        room.addPlayer(player4);
    });
    test("party leader sets a valid turn order", () => {
        const newOrder = [player4.id, player3.id, player2.id, player1.id];
        room.setTurnOrder(player1.id, newOrder);
        expect(room.turnOrder).toEqual(newOrder);
    });
    test("party leader sets an invalid turn order", () => {
        const invalidOrder = [player1.id, player2.id, player3.id]; // Missing one player
        expect(() => room.setTurnOrder(player1.id, invalidOrder)).toThrow("Invalid turn order.");
    });
    test("non-party leader attempts to set turn order", () => {
        const newOrder = [player4.id, player3.id, player2.id, player1.id];
        expect(() => room.setTurnOrder(player2.id, newOrder)).toThrow("Only the party leader can change the turn order.");
    });
});
