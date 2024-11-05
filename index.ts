// backend/index.ts

import express from "express";
import http from "http";
import { Server } from "socket.io";

import morgan from "morgan";
import { setupRoomNamespace } from "./socket/namespaces/roomNamespace";
import { setupGameNamespace } from "./socket/namespaces/gameNamespace";
import { RoomManager } from "./models/room/RoomManager";

const app = express();
app.use(morgan("dev"));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const roomManager = new RoomManager();
setupRoomNamespace(io, roomManager);
setupGameNamespace(io);

app.get("/", (req, res) => {
    res.send("Server is running");
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
