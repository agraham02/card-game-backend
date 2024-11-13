// src/middleware/validationMiddleware.ts
import { Socket } from "socket.io";
import { RoomManager } from "../models/room/RoomManager";

export const requirePartyLeader = (
    roomManager: RoomManager,
    roomId: string,
    playerId: string
) => {
    const room = roomManager.getRoom(roomId);
    if (!room || room.partyLeaderId !== playerId) {
        throw new Error("Only the party leader can perform this action.");
    }
};

export const requireEnoughPlayers = (
    roomManager: RoomManager,
    roomId: string,
    requiredCount: number = 4
) => {
    const room = roomManager.getRoom(roomId);
    if (!room || Object.keys(room.players).length < requiredCount) {
        throw new Error(
            `This game requires at least ${requiredCount} players.`
        );
    }
};
