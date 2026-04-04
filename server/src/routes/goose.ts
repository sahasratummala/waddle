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
      .insert({ user_id: userId, stage: GooseStage.EGG, accessories: [], evolution_points: 0 })
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

/**
 * Feed the goose. Deducts points_available from the user's profile,
 * adds evolution_points to the goose, and auto-evolves if threshold is met.
 * points_total is NOT changed — spending points never reduces lifetime earnings.
 */
router.post("/feed", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { foodId, cost, evolutionPoints } = req.body as {
    foodId?: string;
    cost?: number;
    evolutionPoints?: number;
  };
  const userId = req.userId!;

  if (!foodId || cost == null || evolutionPoints == null) {
    res.status(400).json({ success: false, error: "foodId, cost, and evolutionPoints are required." });
    return;
  }

  try {
    // Check and deduct spendable points
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("points_available")
      .eq("id", userId)
      .single();

    if ((profile?.points_available ?? 0) < cost) {
      res.status(400).json({ success: false, error: "Not enough points." });
      return;
    }

    const newAvailable = (profile?.points_available ?? 0) - cost;
    await supabaseAdmin
      .from("profiles")
      .update({ points_available: newAvailable })
      .eq("id", userId);

    // Add evolution points to the goose
    const { data: goose } = await supabaseAdmin
      .from("geese")
      .select("stage, evolution_points")
      .eq("user_id", userId)
      .single();

    const currentEvolutionPoints = (goose?.evolution_points ?? 0) + evolutionPoints;
    const currentStage = (goose?.stage ?? GooseStage.EGG) as GooseStage;

    // Check if the goose should evolve
    const nextStage = NEXT_STAGE[currentStage];
    const threshold = nextStage ? GOOSE_EVOLUTION_THRESHOLDS[nextStage] : null;
    const shouldEvolve = threshold !== null && currentEvolutionPoints >= threshold;
    const newStage = shouldEvolve && nextStage ? nextStage : currentStage;

    await supabaseAdmin
      .from("geese")
      .update({
        evolution_points: currentEvolutionPoints,
        stage: newStage,
      })
      .eq("user_id", userId);

    // Log the spend
    await supabaseAdmin.from("point_transactions").insert({
      user_id: userId,
      amount: -cost,
      reason: `Fed goose: ${foodId}`,
    });

    res.json({
      success: true,
      data: {
        pointsAvailable: newAvailable,
        evolutionPoints: currentEvolutionPoints,
        stage: newStage,
        evolved: shouldEvolve,
        newStage: shouldEvolve ? newStage : undefined,
      },
    });
  } catch (err) {
    console.error("[goose/feed]", err);
    res.status(500).json({ success: false, error: "Failed to feed goose." });
  }
});

/**
 * Equip or unequip an accessory.
 * If not owned, it deducts points and adds to owned_accessories.
 * If owned, it equips for free.
 * Unequipping is free and keeps it in owned_accessories.
 */
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
    const ownedAccessories: string[] = goose.owned_accessories ?? [];

    let updatedAccessories: typeof currentAccessories = currentAccessories;
    let updatedOwned: string[] = ownedAccessories;
    let newAvailable: number | undefined;

    if (action === "equip") {
      if (currentAccessories.some((a) => a.accessoryId === accessoryId)) {
        res.status(400).json({ success: false, error: "Accessory is already equipped." });
        return;
      }

      const isOwned = ownedAccessories.includes(accessoryId);

      // If they don't own it yet, charge them points
      if (!isOwned) {
        // Look up cost from static list (fallback 0 if not in DB)
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

        newAvailable = (profile?.points_available ?? 0) - cost;

        // Deduct points_available only — points_total unchanged
        await supabaseAdmin
          .from("profiles")
          .update({ points_available: newAvailable })
          .eq("id", userId);

        // Log spend
        if (cost > 0) {
          await supabaseAdmin.from("point_transactions").insert({
            user_id: userId,
            amount: -cost,
            reason: `Purchased accessory: ${accessoryId}`,
          });
        }

        // Add to their permanent inventory
        updatedOwned = [...ownedAccessories, accessoryId];
      }

      // Equip the item
      updatedAccessories = [
        ...currentAccessories,
        { accessoryId, equippedAt: new Date().toISOString() },
      ];
    } else {
      // UNEQUIP - simply remove from the equipped array, keep in owned
      updatedAccessories = currentAccessories.filter((a) => a.accessoryId !== accessoryId);
    }

    // Save both arrays back to the database
    await supabaseAdmin
      .from("geese")
      .update({
        accessories: updatedAccessories,
        owned_accessories: updatedOwned
      })
      .eq("user_id", userId);

    res.json({
      success: true,
      data: {
        accessories: updatedAccessories,
        ownedAccessories: updatedOwned,
        ...(newAvailable !== undefined ? { pointsAvailable: newAvailable } : {}),
      },
    });
  } catch (err) {
    console.error("[goose/accessory]", err);
    res.status(500).json({ success: false, error: "Failed to update accessories." });
  }
});

/**
 * Award points from a game reward (flock party games etc).
 * Increases both points_total and points_available.
 */
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