// backend/index.ts

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import { setupRoomNamespace } from "./socket/namespaces/roomNamespace";
import { RoomManager } from "./models/room/RoomManager";

const app = express();
app.use(morgan("dev"));
app.use(
    cors({
        origin: "https://card-game-frontend-five.vercel.app/", // Replace with your Vercel URL
        methods: ["GET", "POST"],
        credentials: true,
    })
);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://card-game-frontend-five.vercel.app/",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const roomManager = new RoomManager();
setupRoomNamespace(io, roomManager);

app.get("/", (req, res) => {
    res.send("Server is running");
});

const PORT = process.env.PORT ?? 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
