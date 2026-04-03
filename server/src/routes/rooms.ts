import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { createRoom, joinRoom, getRoomByCode } from "../services/roomService";

const router = Router();

// POST /api/rooms/create
router.post("/create", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { studyConfig } = req.body;
  const userId = req.userId!;

  if (!studyConfig?.style) {
    res.status(400).json({ success: false, error: "studyConfig with a style is required." });
    return;
  }

  try {
    const room = await createRoom(userId, studyConfig);
    res.status(201).json({ success: true, data: { room } });
  } catch (err) {
    console.error("Create room error:", err);
    const message = err instanceof Error ? err.message : "Failed to create room.";
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/rooms/join
router.post("/join", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { roomCode } = req.body as { roomCode?: string };
  const userId = req.userId!;

  if (!roomCode || roomCode.trim().length !== 6) {
    res.status(400).json({ success: false, error: "A 6-character room code is required." });
    return;
  }

  try {
    const room = await joinRoom(roomCode.trim().toUpperCase(), userId);
    res.json({ success: true, data: { room } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to join room.";
    const status = message.includes("not found") ? 404 : message.includes("ended") ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

// GET /api/rooms/:roomCode
router.get("/:roomCode", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { roomCode } = req.params;

  try {
    const room = await getRoomByCode(roomCode.toUpperCase());
    if (!room) {
      res.status(404).json({ success: false, error: "Room not found." });
      return;
    }
    res.json({ success: true, data: { room } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch room." });
  }
});

export default router;
