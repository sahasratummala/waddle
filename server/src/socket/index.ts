import { Server, Socket } from "socket.io";
import { supabaseAdmin } from "../lib/supabase";
import { registerRoomHandlers } from "./roomHandlers";
import { registerGameHandlers } from "./gameHandlers";

interface AuthSocket extends Socket {
  userId?: string;
}

export function initializeSocket(io: Server): void {
  // Middleware: authenticate socket connections via JWT
  io.use(async (socket: AuthSocket, next) => {
    const token =
      (socket.handshake.auth as { token?: string }).token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication required: no token provided."));
    }

    try {
      const { data, error } = await supabaseAdmin.auth.getUser(token);

      if (error || !data.user) {
        return next(new Error("Authentication failed: invalid token."));
      }

      socket.userId = data.user.id;
      next();
    } catch (err) {
      next(new Error("Authentication error."));
    }
  });

  io.on("connection", (socket: AuthSocket) => {
    console.log(`[Socket] Client connected: ${socket.id} (userId: ${socket.userId})`);

    // Register event handlers
    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} — ${reason}`);
    });

    socket.on("error", (err) => {
      console.error(`[Socket] Error on ${socket.id}:`, err.message);
    });
  });
}
