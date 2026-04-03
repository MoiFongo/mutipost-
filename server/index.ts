import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { uploadRouter } from "./routes/upload.js";
import { publishRouter } from "./routes/publish.js";
import { scheduleRouter } from "./routes/schedule.js";
import { platformsRouter } from "./routes/platforms.js";
import { authMiddleware } from "./middleware/auth.js";
import { limiter } from "./middleware/rateLimit.js";
import { startScheduler } from "./scheduler.js";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "../shared/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
  : ["http://localhost:5173"];

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: allowedOrigins, credentials: true },
});

// Make io accessible to routes
app.set("io", io);

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());
app.use(limiter);

// Health check (no auth)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Protected API routes
app.use("/api/upload", authMiddleware, uploadRouter);
app.use("/api/publish", authMiddleware, publishRouter);
app.use("/api/schedule", authMiddleware, scheduleRouter);
app.use("/api/platforms", authMiddleware, platformsRouter);

// Serve static frontend in production
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Socket.IO auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication required"));
  // Token validation happens in the event handlers
  next();
});

// Start scheduler
startScheduler(io);

const PORT = parseInt(process.env.PORT || "3001", 10);
server.listen(PORT, () => {
  console.log(`MultiPost server running on port ${PORT}`);
});

export { io };
