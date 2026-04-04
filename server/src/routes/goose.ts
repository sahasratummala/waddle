import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabase";
import { GooseStage, GOOSE_EVOLUTION_THRESHOLDS, NEXT_STAGE } from "@waddle/shared";

const router = Router();

router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const { data, error } = await supabaseAdmin
    .from("geese")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    const { data: newGoose, error: createError } = await supabaseAdmin
      .from("geese")
      .insert({ user_id: userId, stage: GooseStage.EGG, accessories: [] })
      .select()
      .single();
    if (createError) {
      res.status(500).json({ success: false, error: "Failed to initialize goose." });
      return;
    }
    res.json({ success: true, data: newGoose });
    return;
  }
  res.json({ success: true, data });
});

router.post("/evolve", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const { data: goose, error: gooseError } = await supabaseAdmin
      .from("geese")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (gooseError || !goose) {
      res.status(404).json({ success: false, error: "Goose not found." });
      return;
    }

    const currentStage = goose.stage as GooseStage;
    const nextStage = NEXT_STAGE[currentStage];

    if (!nextStage) {
      res.status(400).json({ success: false, error: "Your goose is already fully evolved!" });
      return;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("points_total")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      res.status(500).json({ success: false, error: "Could not fetch profile." });
      return;
    }

    const requiredPoints = GOOSE_EVOLUTION_THRESHOLDS[nextStage];
    if (profile.points_total < requiredPoints) {
      res.status(400).json({
        success: false,
        error: `You need ${requiredPoints} total points to evolve to ${nextStage}. You have ${profile.points_total}.`,
      });
      return;
    }

    const { error: updateError } = await supabaseAdmin
      .from("geese")
      .update({ stage: nextStage })
      .eq("user_id", userId);

    if (updateError) {
      res.status(500).json({ success: false, error: "Evolution failed." });
      return;
    }

    res.json({ success: true, data: { stage: nextStage, previousStage: currentStage } });
  } catch {
    res.status(500).json({ success: false, error: "Evolution failed." });
  }
});

router.post("/accessory", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { accessoryId, action } = req.body as {
    accessoryId?: string;
    action?: "equip" | "unequip";
  };
  const userId = req.userId!;

  if (!accessoryId || !action || !["equip", "unequip"].includes(action)) {
    res.status(400).json({ success: false, error: "accessoryId and action (equip|unequip) are required." });
    return;
  }

  try {
    const { data: goose, error: gooseError } = await supabaseAdmin
      .from("geese")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (gooseError || !goose) {
      res.status(404).json({ success: false, error: "Goose not found." });
      return;
    }

    const currentAccessories: Array<{ accessoryId: string; equippedAt: string }> =
      goose.accessories ?? [];

    let updatedAccessories: typeof currentAccessories;

    if (action === "equip") {
      if (currentAccessories.some((a) => a.accessoryId === accessoryId)) {
        res.status(400).json({ success: false, error: "Accessory is already equipped." });
        return;
      }

      const { data: accessory } = await supabaseAdmin
        .from("accessories")
        .select("cost")
        .eq("id", accessoryId)
        .single();

      const cost = accessory?.cost ?? 0;

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("points_available")
        .eq("id", userId)
        .single();

      if ((profile?.points_available ?? 0) < cost) {
        res.status(400).json({ success: false, error: "Not enough points." });
        return;
      }

      await supabaseAdmin
        .from("profiles")
        .update({ points_available: (profile?.points_available ?? 0) - cost })
        .eq("id", userId);

      updatedAccessories = [
        ...currentAccessories,
        { accessoryId, equippedAt: new Date().toISOString() },
      ];
    } else {
      updatedAccessories = currentAccessories.filter((a) => a.accessoryId !== accessoryId);
    }

    await supabaseAdmin
      .from("geese")
      .update({ accessories: updatedAccessories })
      .eq("user_id", userId);

    res.json({ success: true, data: { accessories: updatedAccessories } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update accessories." });
  }
});

router.post("/feed", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { foodId, cost, evolutionPoints } = req.body as {
    foodId?: string;
    cost?: number;
    evolutionPoints?: number;
  };
  const userId = req.userId!;

  if (!foodId || !cost || !evolutionPoints) {
    res.status(400).json({ success: false, error: "foodId, cost, and evolutionPoints are required." });
    return;
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("points_available")
      .eq("id", userId)
      .single();

    if ((profile?.points_available ?? 0) < cost) {
      res.status(400).json({ success: false, error: "Not enough points." });
      return;
    }

    await supabaseAdmin
      .from("profiles")
      .update({ points_available: (profile?.points_available ?? 0) - cost })
      .eq("id", userId);

    const { awardPoints } = await import("../services/pointsService");
    const result = await awardPoints(userId, evolutionPoints, `Fed goose: ${foodId}`);

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to feed goose." });
  }
});

router.post("/game-reward", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { points } = req.body as { points?: number };
  const userId = req.userId!;

  if (!points || points < 0) {
    res.status(400).json({ success: false, error: "points is required and must be positive." });
    return;
  }

  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("points_total, points_available")
      .eq("id", userId)
      .single();

    if (!profile) {
      res.status(404).json({ success: false, error: "Profile not found." });
      return;
    }

    const newTotal = (profile.points_total ?? 0) + points;
    const newAvailable = (profile.points_available ?? 0) + points;

    await supabaseAdmin
      .from("profiles")
      .update({ points_total: newTotal, points_available: newAvailable })
      .eq("id", userId);

    res.json({ success: true, data: { points_total: newTotal, points_available: newAvailable } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to award points." });
  }
});

export default router;