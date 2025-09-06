import dotenv from "dotenv";
dotenv.config();
import http from "http";
import app from "./app";

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

process.on("SIGINT", () => {
  console.log("Server shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
