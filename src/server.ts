import dotenv from "dotenv";
dotenv.config();
import http from "http";
import app from "./app";
import { Server as IOServer } from "socket.io";
import { connectDB } from "./config/db.config";
import { initGameSocket } from "./core/sockets/game.socket";
import { startRoundLoop } from "./api/round/service";
const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);
  const io = new IOServer(httpServer, {
    cors: { origin: "*" },
  });

  // 1️⃣ Listen for new clients
  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // If a round is ongoing, immediately send it to the new client
    if (currentRound && currentRound.status !== "completed") {
      console.log(
        "Sending current round to new client",
        currentRound.roundNumber
      );
      socket.emit("round:start", currentRound);
    }
  });

  // create a dedicated namespace for the game
  const gameNamespace = io.of("/game");
  let currentRound: any = null;

  gameNamespace.on("connection", (socket) => {
    console.log("New client connected to /game:", socket.id);
    if (currentRound && currentRound.status !== "completed") {
      socket.emit("round:start", currentRound);
    }
  });

  // initialize socket handlers for the namespace
  initGameSocket(gameNamespace);

  // start round engine with the same namespace so it broadcasts to /game
  // (round.service should accept a Namespace type; cast if necessary)
  startRoundLoop(gameNamespace as any);

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
