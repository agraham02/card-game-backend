// utils/emitError.ts

import { Socket } from "socket.io";
import { ErrorMessage } from "../models/ErrorMessage";
import { SocketEvent } from "../models/game/SpadesGameEnums";

export function emitError(socket: Socket, errorData: ErrorMessage) {
    socket.emit(SocketEvent.ERROR, errorData);
}
