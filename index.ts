// backend/index.ts

import express from "express";
import http from "http";
import { Server } from "socket.io";
import { setupSocketHandlers } from "./socket/socketHandlers";
import morgan from "morgan";

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true,
    },
});

app.use(morgan("dev"));

// ioServer.on("connection", (socket) => {
setupSocketHandlers(ioServer);
// });

app.get("/", (req, res) => {
    res.send("Server is running");
})

   
const PORT = 5000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

