import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import app from "./app";
import { connectDB } from "./config/db.config";
import { initGameSocket } from "./core/sockets/game.socket";
import { getCurrentRound, startRoundLoop } from "./api/round/service";
import { verifyAccessToken } from "./core/utils/jwt";
import User from "./api/users/user.model";

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Create HTTP + Socket.IO server
    const server = http.createServer(app);
    // const io = new Server(server, {
    //   cors: { origin: "*" }, // TODO: restrict in production
    // });
    const io = new Server(server, {
      cors: {
        origin: "http://localhost:3000", // Vite dev server
        methods: ["GET", "POST"],
        allowedHeaders: ["Authorization"],
        credentials: true,
      },
    });

    // 3. Setup /game namespace
    const gameNamespace = io.of("/game");

    // ---- Auth middleware ----
// Socket.IO middleware
gameNamespace.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(); // guest mode

    const payload = verifyAccessToken(token);

    console.log("payload:", payload);
    if (!payload?.id) return next(); // treat as guest

    const user = await User.findById(payload.id).lean();
    if (!user) return next(); // guest

    socket.data.user = { _id: user._id.toString(), role: user.role };
    socket.join(`user:${user._id}`);
    console.log(`[Socket] Authenticated user: ${user._id}`);
    next();
  } catch (err) {
    console.log("[Socket] JWT verify failed:", err);
    next(); // guest fallback
  }
});


    // Initialize event handlers for the namespace
    initGameSocket(gameNamespace);

    // 4. Start round loop (emits round events to namespace)
    startRoundLoop(gameNamespace);

    // 5. Start server
    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
