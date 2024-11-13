// backend/game/Player.ts
import { Socket } from "socket.io";

export interface PublicPlayer {
    id: string;
    name: string;
}

export class Player {
    id: string;
    name: string;
    socket: Socket | null;
    gameData: { [gameName: string]: any } = {};

    constructor(id: string, name: string, socket: Socket | null) {
        this.id = id;
        this.name = name;
        this.socket = socket;
    }

    toPublicObject() {
        return {
            id: this.id,
            name: this.name,
        };
    }
}
