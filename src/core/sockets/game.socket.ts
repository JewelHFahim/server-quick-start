// src/sockets/game.socket.ts
import { Namespace, Socket } from "socket.io";
import { SettingsModel } from "../../api/settings/settings.model";
import { placeBet } from "../../config/game.service";
import User from "../../api/users/user.model";
import { verifyAccessToken } from "../utils/jwt";
import { NextFunction } from "express";

/**
 * Socket events and payload shapes (informal):
 *
 * Client -> Server:
 *  - join: { room?: string }
 *  - place_bet: { requestId?: string, roundId: string, box: string, amount: number }
 *  - get_balance: {}
 *
 * Server -> Client:
 *  - bet_accepted: { bet: BetDoc }
 *  - public_bet: { maskedUser: string, box: string, amount: number, isBot: boolean }
 *  - round_started | round_closed | round_result (emitted by round engine)
 *
 * All server emits use the same namespace (e.g., "/game").
 */

// small helper to mask username/ids for public feeds
const maskId = (id: string) => {
  if (!id) return "anon";
  const s = String(id);
  return s.slice(0, 4) + "..." + s.slice(-3);
};

// type JwtPayload = { _id: string; role: Roles };

export const initGameSocket = (nsp: Namespace) => {
  // when a namespace is provided, all emits should go to that namespace
  nsp.on("connection", async (socket: Socket) => {
    // ---- Authentication ----
    // prefer token in handshake.auth (recommended by socket.io v3+)
    const token: string | undefined =
      (socket.handshake.auth && (socket.handshake.auth as any).token) ||
      (socket.handshake.query && (socket.handshake.query as any).token);

    let authUser: { _id: string; role: string } | null = null;

    if (token) {
      const payload = verifyAccessToken(token);
      if (payload && payload._id) {
        // load minimal user info
        try {
          const user = await User.findById(payload._id).lean();
          if (user) {
            authUser = { _id: user._id.toString(), role: user.role };
            socket.data.user = authUser;
            // join personal room for private emits
            socket.join(`user:${authUser._id}`);
          }
        } catch (err) {
          console.warn("Socket auth user load failed:", err);
        }
      }
    }

    // initialize per-socket anti spam & idempotency state
    socket.data.lastBetAt = 0;
    socket.data.processedRequestIds = new Set<string>();

    console.log(
      `[Socket] ${socket.id} connected ${authUser ? "(auth)" : "(guest)"}`
    );

    // ---- join event: let client join additional rooms ----
    socket.on("join", (data: { room?: string } = {}) => {
      if (data?.room && typeof data.room === "string") {
        socket.join(data.room);
        console.log(`[Socket] ${socket.id} joined room ${data.room}`);
      }
      // always keep them in their user room if auth
      if (socket.data.user) {
        socket.join(`user:${socket.data.user._id}`);
      }
    });

    // ---- place_bet: main event ----
    // expects ack callback from client: socket.emit('place_bet', payload, (ack) => {...})
    socket.on(
      "place_bet",
      async (
        payload: {
          requestId?: string;
          roundId?: string;
          box?: string;
          amount?: number;
        },

        ack?: (res: any) => void
      ) => {
        const safeAck = typeof ack === "function" ? ack : () => {};

        // authentication required to place bet
        if (!socket.data.user) {
          return safeAck({
            success: false,
            message: "Authentication required",
          });
        }

        // basic rate-limiting (per-socket)
        const now = Date.now();
        const last = socket.data.lastBetAt ?? 0;
        const MIN_INTERVAL_MS = 200; // adjust as needed
        if (now - last < MIN_INTERVAL_MS) {
          return safeAck({ success: false, message: "Too many requests" });
        }
        socket.data.lastBetAt = now;

        // validate payload
        const { requestId, roundId, box, amount } = payload || {};
        if (!roundId || !box || !amount || typeof amount !== "number") {
          return safeAck({ success: false, message: "Invalid payload" });
        }
        if (amount <= 0)
          return safeAck({ success: false, message: "Invalid amount" });

        // idempotency: if client sends requestId, ignore duplicates per connection
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
          // validate box exists from settings (prevents invalid bets)
          const settings = (await SettingsModel.findOne().lean()) || {
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

          if (!Array.isArray(settings.boxes) || !settings.boxes.includes(box)) {
            return safeAck({
              success: false,
              message: "Unknown box selection",
            });
          }

          // place bet using atomic service (service uses mongoose transaction)
          const bet = await placeBet(
            socket.data.user._id,
            roundId,
            box,
            amount,
            false
          );

          // emit private confirmation to the bettor
          socket
            .to(`user:${socket.data.user._id}`)
            .emit("bet_accepted", { bet });
          socket.emit("bet_accepted", { bet }); // also send to the current socket

          // emit a public, anonymized event for UI hype (others see approximate activity)
          nsp.emit("public_bet", {
            maskedUser: maskId(String(socket.data.user._id)),
            box,
            amount,
            isBot: socket.data.user.role === "bot" ? true : false,
          });

          return safeAck({ success: true, message: "Bet placed", bet });
        } catch (err: any) {
          // cleanup idempotency set on error so client can retry if necessary
          if (requestId) socket.data.processedRequestIds.delete(requestId);
          console.error("place_bet error:", err);
          return safeAck({
            success: false,
            message: err.message || "Failed to place bet",
          });
        }
      }
    );

    // ---- get_balance: quick wallet check ----
    socket.on("get_balance", async (payload: any, ack?: (res: any) => void) => {
      const safeAck = typeof ack === "function" ? ack : () => {};
      if (!socket.data.user)
        return safeAck({ success: false, message: "Authentication required" });

      try {
        const user = await User.findById(socket.data.user._id).lean();
        return safeAck({ success: true, balance: user?.balance ?? 0 });
      } catch (err) {
        return safeAck({ success: false, message: "Could not fetch balance" });
      }
    });

    // ---- disconnect ----
    socket.on("disconnect", (reason) => {
      console.log(`[Socket] ${socket.id} disconnected: ${reason}`);
      // free memory from processedRequestIds
      try {
        socket.data.processedRequestIds?.clear?.();
      } catch {}
    });
  });
};

// import { Namespace, Socket } from "socket.io";
// import { SettingsModel } from "../../api/settings/settings.model";
// import { placeBet } from "../../config/game.service";
// import User from "../../api/users/user.model";
// import { verifyAccessToken } from "../utils/jwt";

// const maskId = (id: string) => {
//   if (!id) return "anon";
//   const s = String(id);
//   return s.slice(0, 4) + "..." + s.slice(-3);
// };

// export const initGameSocket = (nsp: Namespace) => {
//   // ---- Middleware auth check ----
//   nsp.use(async (socket, next) => {
//     const token: string | undefined =
//       (socket.handshake.auth && (socket.handshake.auth as any).token) ||
//       (socket.handshake.query && (socket.handshake.query as any).token);

//     if (!token) {
//       console.log("[Socket] No token → guest mode");
//       return next(); // allow guests (optional: block with next(new Error("Unauthorized")))
//     }

//     try {
//       const payload = verifyAccessToken(token);
//       if (!payload || !payload._id) {
//         return next(new Error("Unauthorized"));
//       }

//       const user = await User.findById(payload._id).lean();
//       if (!user) {
//         return next(new Error("User not found"));
//       }

//       socket.data.user = { _id: user._id.toString(), role: user.role };
//       socket.join(`user:${user._id}`);
//       console.log(`[Socket] Authenticated user: ${user._id}, role=${user.role}`);
//       next();
//     } catch (err: any) {
//       console.error("[Socket] JWT verify error:", err.message);
//       return next(new Error("Unauthorized"));
//     }
//   });

//   // ---- Connection ----
//   nsp.on("connection", async (socket: Socket) => {
//     socket.data.lastBetAt = 0;
//     socket.data.processedRequestIds = new Set<string>();

//     console.log(
//       `[Socket] ${socket.id} connected ${socket.data.user ? "(auth)" : "(guest)"}`
//     );

//     // ---- join ----
//     socket.on("join", (data: { room?: string } = {}) => {
//       if (data?.room) {
//         socket.join(data.room);
//         console.log(`[Socket] ${socket.id} joined room ${data.room}`);
//       }
//       if (socket.data.user) {
//         socket.join(`user:${socket.data.user._id}`);
//       }
//     });

//     // ---- place_bet ----
//     socket.on(
//       "place_bet",
//       async (
//         payload: {
//           requestId?: string;
//           roundId?: string;
//           box?: string;
//           amount?: number;
//         },
//         ack?: (res: any) => void
//       ) => {
//         const safeAck = typeof ack === "function" ? ack : () => {};

//         if (!socket.data.user) {
//           return safeAck({ success: false, message: "Authentication required" });
//         }

//         const now = Date.now();
//         const last = socket.data.lastBetAt ?? 0;
//         const MIN_INTERVAL_MS = 200;
//         if (now - last < MIN_INTERVAL_MS) {
//           return safeAck({ success: false, message: "Too many requests" });
//         }
//         socket.data.lastBetAt = now;

//         const { requestId, roundId, box, amount } = payload || {};
//         if (!roundId || !box || !amount || typeof amount !== "number") {
//           return safeAck({ success: false, message: "Invalid payload" });
//         }
//         if (amount <= 0)
//           return safeAck({ success: false, message: "Invalid amount" });

//         if (requestId) {
//           if (socket.data.processedRequestIds.has(requestId)) {
//             return safeAck({
//               success: true,
//               message: "Duplicate request (ignored)",
//               duplicate: true,
//             });
//           }
//           socket.data.processedRequestIds.add(requestId);
//         }

//         try {
//           const settings =
//             (await SettingsModel.findOne().lean()) || {
//               boxes: [
//                 "fruit1",
//                 "fruit2",
//                 "fruit3",
//                 "fruit4",
//                 "fruit5",
//                 "fruit6",
//                 "fruit7",
//                 "fruit8",
//                 "5x",
//                 "15x",
//               ],
//             };

//           if (!settings.boxes.includes(box)) {
//             return safeAck({
//               success: false,
//               message: "Unknown box selection",
//             });
//           }

//           const bet = await placeBet(
//             socket.data.user._id,
//             roundId,
//             box,
//             amount,
//             false
//           );

//           socket.emit("bet_accepted", { bet });
//           socket.to(`user:${socket.data.user._id}`).emit("bet_accepted", { bet });

//           nsp.emit("public_bet", {
//             maskedUser: maskId(String(socket.data.user._id)),
//             box,
//             amount,
//             isBot: socket.data.user.role === "bot",
//           });

//           return safeAck({ success: true, message: "Bet placed", bet });
//         } catch (err: any) {
//           if (requestId) socket.data.processedRequestIds.delete(requestId);
//           console.error("place_bet error:", err);
//           return safeAck({
//             success: false,
//             message: err.message || "Failed to place bet",
//           });
//         }
//       }
//     );

//     // ---- get_balance ----
//     socket.on("get_balance", async (_payload, ack?: (res: any) => void) => {
//       const safeAck = typeof ack === "function" ? ack : () => {};
//       if (!socket.data.user) {
//         return safeAck({ success: false, message: "Authentication required" });
//       }

//       try {
//         const user = await User.findById(socket.data.user._id).lean();
//         return safeAck({ success: true, balance: user?.balance ?? 0 });
//       } catch {
//         return safeAck({ success: false, message: "Could not fetch balance" });
//       }
//     });

//     // ---- disconnect ----
//     socket.on("disconnect", (reason) => {
//       console.log(`[Socket] ${socket.id} disconnected: ${reason}`);
//       socket.data.processedRequestIds?.clear?.();
//     });
//   });
// };
