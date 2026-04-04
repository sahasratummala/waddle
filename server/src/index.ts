import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import apiRouter from "./routes/index";
import { initializeSocket } from "./socket/index";
import { setIo } from "./lib/socketServer";

const app = express();
const httpServer = createServer(app);

const PORT = parseInt(process.env.PORT || "3001", 10);
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ─── CORS ─────────────────────────────────────────────────────────────────────
// In development allow any origin so teammates on other devices on the same
// network can connect. In production lock it down to CLIENT_URL only.
const isDev = process.env.NODE_ENV !== "production";

const corsOrigin: cors.CorsOptions["origin"] = isDev
  ? (_origin, callback) => callback(null, true)
  : [CLIENT_URL, "http://localhost:5173", "http://localhost:4173"];

const corsOptions: cors.CorsOptions = {
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ─── Request logging (development) ───────────────────────────────────────────
if (process.env.NODE_ENV !== "production") {
  app.use((req, _res, next) => {
    console.log(`[HTTP] ${req.method} ${req.path}`);
    next();
  });
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found." });
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[Server] Unhandled error:", err);
    res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error."
          : err.message,
    });
  }
);

// ─── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: isDev
      ? (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => callback(null, true)
      : [CLIENT_URL, "http://localhost:5173", "http://localhost:4173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 30000,
  pingInterval: 25000,
});

initializeSocket(io);
setIo(io);

// ─── Start ────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🦢 Waddle server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   CORS origin: ${CLIENT_URL}`);
  console.log(`   API:         http://localhost:${PORT}/api/health\n`);
});

export { app, httpServer, io };
