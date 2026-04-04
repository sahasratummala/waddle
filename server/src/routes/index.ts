import { Router } from "express";
import tasksRouter from "./tasks";
import roomsRouter from "./rooms";
import gooseRouter from "./goose";
import authRouter from "./auth";
import gamesRouter from "./games";

const router = Router();

router.use("/tasks", tasksRouter);
router.use("/rooms", roomsRouter);
router.use("/goose", gooseRouter);
router.use("/auth", authRouter);
router.use("/games", gamesRouter);

// Health check
router.get("/health", (_req, res) => {
  res.json({ success: true, message: "Waddle API is running", timestamp: new Date().toISOString() });
});

export default router;
