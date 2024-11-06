// backend/index.ts

import express from "express";
import http from "http";
import { Server } from "socket.io";

import morgan from "morgan";
import { setupRoomNamespace } from "./socket/namespaces/roomNamespace";
import { RoomManager } from "./models/room/RoomManager";
import { setupSpadesNamespace } from "./socket/namespaces/spadesNamespace";

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
setupSpadesNamespace(io, roomManager);

app.get("/", (req, res) => {
    res.send("Server is running");
});

const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
