import { supabaseAdmin } from "../lib/supabase";

/**
 * Award points to a user for completing tasks or study sessions.
 * Increases BOTH points_total (lifetime earned) and points_available (spendable).
 * Evolution is NOT triggered here — it only happens when the user feeds their goose
 * in the shop, which spends points_available and adds to the goose's evolution_points.
 */
export async function awardPoints(
  userId: string,
  amount: number,
  reason: string
): Promise<{ pointsTotal: number; pointsAvailable: number }> {
  if (amount <= 0) {
    throw new Error("Points amount must be positive.");
  }

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

  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ points_total: newTotal, points_available: newAvailable })
    .eq("id", userId);

  if (updateError) {
    throw new Error("Failed to update points.");
  }

  await supabaseAdmin.from("point_transactions").insert({
    user_id: userId,
    amount,
    reason,
  });

  return { pointsTotal: newTotal, pointsAvailable: newAvailable };
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