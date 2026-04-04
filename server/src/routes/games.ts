import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { geminiVision } from "../lib/gemini";
import { awardPoints } from "../services/pointsService";
import { getIo } from "../lib/socketServer";
import { activeGames } from "../socket/gameHandlers";
import { randomPictionaryWord } from "../lib/pictionaryWords";

const router = Router();

router.get("/pictionary/word", requireAuth, (_req: AuthenticatedRequest, res: Response) => {
  res.json({ success: true, word: randomPictionaryWord() });
});

router.post(
  "/pictionary/check",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { imageData, mimeType, word, roomCode, username } = req.body as {
      imageData?: string;
      mimeType?: string;
      word?: string;
      roomCode?: string;
      username?: string;
    };
    const userId = req.userId!;

    if (!imageData || !mimeType || !word) {
      res.status(400).json({ success: false, error: "imageData, mimeType, and word are required." });
      return;
    }

    if (roomCode) {
      const session = activeGames.get(roomCode.toUpperCase());
      if (session?.winner) {
        res.json({ success: true, guessed: false, attempt: "…" });
        return;
      }
    }

    try {
      const prompt = `You are judging a Pictionary drawing game.
The player is trying to draw: "${word}"

Look at the image carefully. The player is drawing on a white canvas using simple strokes.
Decide if the drawing clearly represents "${word}".

Be generous — if the key features of "${word}" are recognizable, mark it as guessed.
Only reject if the canvas is nearly blank or the drawing has nothing to do with "${word}".

Respond with ONLY this JSON (no markdown, no extra text):
{
  "guessed": true or false,
  "attempt": "your best guess of what is drawn in 1-3 words"
}`;

      const result = await geminiVision.generateContent([
        prompt,
        { inlineData: { data: imageData, mimeType } },
      ]);

      const text = result.response.text();
      let parsed: { guessed: boolean; attempt: string };

      try {
        const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        res.json({ success: true, guessed: false, attempt: "…" });
        return;
      }

      const guessed = Boolean(parsed.guessed);
      const attempt = String(parsed.attempt || "…").slice(0, 60);

      if (guessed) {
        await awardPoints(userId, 25, `Pictionary: Gemini guessed "${word}"`);

        if (roomCode) {
          const code = roomCode.toUpperCase();
          const session = activeGames.get(code);
          if (session && !session.winner) {
            session.winner = userId;
            try {
              getIo().to(code).emit("pictionary:winner", {
                userId,
                username: username || "Player",
                word,
              });
            } catch {
              // io not ready yet — solo fallback is fine
            }
          }
        }
      }

      res.json({ success: true, guessed, attempt });
    } catch (err) {
      console.error("Pictionary check error:", err);
      res.json({ success: true, guessed: false, attempt: "…" });
    }
  }
);

export default router;