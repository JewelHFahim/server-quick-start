import { Namespace, Socket } from "socket.io";
import { SettingsModel } from "../../api/settings/settings.model";
import { placeBet } from "../../config/game.service";
import User from "../../api/users/user.model";
import { verifyAccessToken } from "../utils/jwt";

const maskId = (id: string) => {
  if (!id) return "anon";
  const s = String(id);
  return s.slice(0, 4) + "..." + s.slice(-3);
};

export const initGameSocket = (nsp: Namespace) => {
  // ---- Middleware auth check ----
  nsp.use(async (socket, next) => {

    console.log("socket.handshake.auth:", socket.handshake.auth);
    console.log("socket.handshake.query:", socket.handshake.query);

    const token: string | undefined =
      (socket.handshake.auth && (socket.handshake.auth as any).token) ||
      (socket.handshake.query && (socket.handshake.query as any).token);

    if (!token) {
      console.log("[Socket] No token → guest mode");
      return next(); // allow guests (optional: block with next(new Error("Unauthorized")))
    }

    try {
      const payload = verifyAccessToken(token);
      if (!payload || !payload._id) {
        return next(new Error("Unauthorized"));
      }

      const user = await User.findById(payload._id).lean();
      if (!user) {
        return next(new Error("User not found"));
      }

      socket.data.user = { _id: user._id.toString(), role: user.role };
      socket.join(`user:${user._id}`);
      console.log(`[Socket] Authenticated user: ${user._id}, role=${user.role}`);
      next();
    } catch (err: any) {
      console.error("[Socket] JWT verify error:", err.message);
      return next(new Error("Unauthorized"));
    }
  });

  // ---- Connection ----
  nsp.on("connection", async (socket: Socket) => {
    socket.data.lastBetAt = 0;
    socket.data.processedRequestIds = new Set<string>();

    console.log(
      `[Socket] ${socket.id} connected ${socket.data.user ? "(auth)" : "(guest)"}`
    );

    // ---- join ----
    socket.on("join", (data: { room?: string } = {}) => {
      if (data?.room) {
        socket.join(data.room);
        console.log(`[Socket] ${socket.id} joined room ${data.room}`);
      }
      if (socket.data.user) {
        socket.join(`user:${socket.data.user._id}`);
      }
    });

    // ---- place_bet ----
    socket.on("place_bet", async (
        payload: {
          requestId?: string;
          roundId?: string;
          box?: string;
          amount?: number;
        },

        ack?: (res: any) => void
      ) => {

        console.log("[Socket] place_bet", payload);

        const safeAck = typeof ack === "function" ? ack : () => {};

        console.log("socket.data.user:", socket.data.user);

        if (!socket.data.user) {
          return safeAck({ success: false, message: "Authentication required" });
        }

        const now = Date.now();
        const last = socket.data.lastBetAt ?? 0;
        const MIN_INTERVAL_MS = 200;
        if (now - last < MIN_INTERVAL_MS) {
          return safeAck({ success: false, message: "Too many requests" });
        }
        socket.data.lastBetAt = now;

        const { requestId, roundId, box, amount } = payload || {};
        if (!roundId || !box || !amount || typeof amount !== "number") {
          return safeAck({ success: false, message: "Invalid payload" });
        }
        if (amount <= 0)
          return safeAck({ success: false, message: "Invalid amount" });

        if (requestId) {
          if (socket.data.processedRequestIds.has(requestId)) {
            return safeAck({
              success: true,
              message: "Duplicate request (ignored)",
              duplicate: true,
            });
          }
          socket.data.processedRequestIds.add(requestId);
        }

        try {
          const settings =
            (await SettingsModel.findOne().lean()) || {
              boxes: [
                "fruit1",
                "fruit2",
                "fruit3",
                "fruit4",
                "fruit5",
                "fruit6",
                "fruit7",
                "fruit8",
                "5x",
                "15x",
              ],
            };

          if (!settings.boxes.includes(box)) {
            return safeAck({
              success: false,
              message: "Unknown box selection",
            });
          }

          const bet = await placeBet(
            socket.data.user._id,
            roundId,
            box,
            amount,
            false
          );

          socket.emit("bet_accepted", { bet });
          socket.to(`user:${socket.data.user._id}`).emit("bet_accepted", { bet });

          nsp.emit("public_bet", {
            maskedUser: maskId(String(socket.data.user._id)),
            box,
            amount,
            isBot: socket.data.user.role === "bot",
          });

          return safeAck({ success: true, message: "Bet placed", bet });
        } catch (err: any) {
          if (requestId) socket.data.processedRequestIds.delete(requestId);
          console.error("place_bet error:", err);
          return safeAck({
            success: false,
            message: err.message || "Failed to place bet",
          });
        }
      }
    );

    // ---- get_balance ----
    socket.on("get_balance", async (_payload, ack?: (res: any) => void) => {
      const safeAck = typeof ack === "function" ? ack : () => {};
      if (!socket.data.user) {
        return safeAck({ success: false, message: "Authentication required" });
      }

      try {
        const user = await User.findById(socket.data.user._id).lean();
        return safeAck({ success: true, balance: user?.balance ?? 0 });
      } catch {
        return safeAck({ success: false, message: "Could not fetch balance" });
      }
    });

    // ---- disconnect ----
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] ${socket.id} disconnected: ${reason}`);
      socket.data.processedRequestIds?.clear?.();
    });
  });
};
