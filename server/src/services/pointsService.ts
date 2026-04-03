import { supabaseAdmin } from "../lib/supabase";
import { GooseStage, GOOSE_EVOLUTION_THRESHOLDS, NEXT_STAGE } from "@waddle/shared";

export async function awardPoints(
  userId: string,
  amount: number,
  reason: string
): Promise<{ pointsTotal: number; pointsAvailable: number; evolved: boolean; newStage?: GooseStage }> {
  if (amount <= 0) {
    throw new Error("Points amount must be positive.");
  }

  // Fetch current profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("points_total, points_available")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found.");
  }

  const newTotal = (profile.points_total ?? 0) + amount;
  const newAvailable = (profile.points_available ?? 0) + amount;

  // Update profile
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ points_total: newTotal, points_available: newAvailable })
    .eq("id", userId);

  if (updateError) {
    throw new Error("Failed to update points.");
  }

  // Log the transaction
  await supabaseAdmin.from("point_transactions").insert({
    user_id: userId,
    amount,
    reason,
  });

  // Check for evolution
  const { evolved, newStage } = await checkAndEvolveGoose(userId, newTotal);

  return { pointsTotal: newTotal, pointsAvailable: newAvailable, evolved, newStage };
}

export async function deductPoints(
  userId: string,
  amount: number,
  reason: string
): Promise<{ pointsAvailable: number }> {
  if (amount <= 0) {
    throw new Error("Points amount must be positive.");
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("points_available")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    throw new Error("Profile not found.");
  }

  if ((profile.points_available ?? 0) < amount) {
    throw new Error("Insufficient available points.");
  }

  const newAvailable = profile.points_available - amount;

  await supabaseAdmin
    .from("profiles")
    .update({ points_available: newAvailable })
    .eq("id", userId);

  await supabaseAdmin.from("point_transactions").insert({
    user_id: userId,
    amount: -amount,
    reason,
  });

  return { pointsAvailable: newAvailable };
}

export async function checkAndEvolveGoose(
  userId: string,
  pointsTotal: number
): Promise<{ evolved: boolean; newStage?: GooseStage }> {
  const { data: goose, error } = await supabaseAdmin
    .from("geese")
    .select("stage")
    .eq("user_id", userId)
    .single();

  if (error || !goose) return { evolved: false };

  const currentStage = goose.stage as GooseStage;
  const nextStage = NEXT_STAGE[currentStage];

  if (!nextStage) return { evolved: false }; // Already at max

  const threshold = GOOSE_EVOLUTION_THRESHOLDS[nextStage];

  if (pointsTotal >= threshold) {
    // Auto-evolve!
    const { error: evolveError } = await supabaseAdmin
      .from("geese")
      .update({ stage: nextStage })
      .eq("user_id", userId);

    if (evolveError) {
      console.error("Auto-evolution failed:", evolveError);
      return { evolved: false };
    }

    console.log(`[Points] User ${userId} evolved to ${nextStage}!`);
    return { evolved: true, newStage: nextStage };
  }

  return { evolved: false };
}

export async function getUserPoints(userId: string): Promise<{ total: number; available: number }> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("points_total, points_available")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return { total: 0, available: 0 };
  }

  return { total: data.points_total ?? 0, available: data.points_available ?? 0 };
}
