// backend/index.ts

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import { setupRoomNamespace } from "./socket/namespaces/roomNamespace";
import { RoomManager } from "./models/room/RoomManager";

const allowedOrigins = [
    "http://localhost:3000",
    "https://card-game-frontend-five.vercel.app/",
    "https://card-game-frontend-ahmadgrahamdevgmailcoms-projects.vercel.app/",
];

const app = express();
app.use(morgan("dev"));
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, or Postman)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST"],
        credentials: true,
    })
);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
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
