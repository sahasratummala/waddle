import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabase";
import { GooseStage } from "@waddle/shared";

const router = Router();

// GET /api/auth/me — get current user's profile
router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) {
    res.status(404).json({ success: false, error: "Profile not found." });
    return;
  }

  res.json({
    success: true,
    data: {
      id: data.id,
      email: data.email,
      username: data.username,
      avatarUrl: data.avatar_url,
      pointsTotal: data.points_total,
      pointsAvailable: data.points_available,
      createdAt: data.created_at,
    },
  });
});

// POST /api/auth/profile — upsert user profile (called after signup)
router.post("/profile", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { username } = req.body as { username?: string };
  const userId = req.userId!;
  const userEmail = req.userEmail!;

  if (!username || username.trim().length < 2) {
    res.status(400).json({ success: false, error: "Username must be at least 2 characters." });
    return;
  }

  try {
    // Upsert the profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: userId,
        email: userEmail,
        username: username.trim(),
        points_total: 0,
        points_available: 0,
      })
      .select()
      .single();

    if (profileError) {
      res.status(500).json({ success: false, error: "Failed to create profile." });
      return;
    }

    // Create goose if it doesn't exist
    const { error: gooseCheckError, data: existingGoose } = await supabaseAdmin
      .from("geese")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (gooseCheckError || !existingGoose) {
      await supabaseAdmin.from("geese").insert({
        user_id: userId,
        stage: GooseStage.EGG,
        accessories: [],
      });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: "Profile creation failed." });
  }
});

export default router;
