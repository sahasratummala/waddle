import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { generateTasks, verifyTaskPhoto } from "../services/taskService";
import { awardPoints } from "../services/pointsService";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// POST /api/tasks/generate
// Takes a user's description of their day, generates structured tasks via Claude,
// saves them to the DB, and returns the task list.
router.post("/generate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { description, date } = req.body as { description?: string; date?: string };

  if (!description || typeof description !== "string" || description.trim().length < 10) {
    res.status(400).json({
      success: false,
      error: "Please provide a description of at least 10 characters.",
    });
    return;
  }

  const taskDate = date || new Date().toISOString().split("T")[0];
  const userId = req.userId!;

  try {
    // Generate tasks using Claude
    const result = await generateTasks(description.trim());

    // Save all tasks to the database
    const allTasks = [
      ...result.tasks.map((t) => ({ ...t, is_self_care: false })),
      ...result.selfCare.map((t) => ({ ...t, is_self_care: true })),
    ];

    const tasksToInsert = allTasks.map((task) => ({
      user_id: userId,
      date: taskDate,
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimatedMinutes,
      points: task.points,
      category: task.category,
      is_self_care: task.is_self_care,
      completed: false,
    }));

    const { data: savedTasks, error: insertError } = await supabaseAdmin
      .from("daily_tasks")
      .insert(tasksToInsert)
      .select();

    if (insertError) {
      console.error("Error saving tasks:", insertError);
      res.status(500).json({ success: false, error: "Failed to save generated tasks." });
      return;
    }

    res.json({ success: true, data: { ...result, savedTasks } });
  } catch (err) {
    console.error("Task generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate tasks.";
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/tasks/verify
// Verifies task completion via Gemini Vision analysis of an uploaded photo.
// Expects: { taskId: string, photoUrl: string, imageData: string (base64), mimeType: string }
router.post("/verify", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskId, photoUrl, imageData, mimeType } = req.body as {
    taskId?: string;
    photoUrl?: string;
    imageData?: string;
    mimeType?: string;
  };
  const userId = req.userId!;

  if (!taskId || !photoUrl || !imageData || !mimeType) {
    res.status(400).json({
      success: false,
      error: "taskId, photoUrl, imageData, and mimeType are required.",
    });
    return;
  }

  try {
    const { data: task, error: fetchError } = await supabaseAdmin
      .from("daily_tasks")
      .select("*")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !task) {
      res.status(404).json({ success: false, error: "Task not found or not owned by user." });
      return;
    }

    if (task.photo_url) {
      res.status(400).json({ success: false, error: "Task has already been photo-verified." });
      return;
    }

    // Ask Gemini Vision whether the photo shows evidence of task completion
    const verification = await verifyTaskPhoto(
      task.title,
      task.description,
      imageData,
      mimeType
    );

    if (!verification.verified) {
      res.status(422).json({
        success: false,
        error: "Photo does not appear to show task completion.",
        reason: verification.reason,
        confidence: verification.confidence,
      });
      return;
    }

    // Mark task complete and store photo URL
    const { error: updateError } = await supabaseAdmin
      .from("daily_tasks")
      .update({ photo_url: photoUrl, completed: true })
      .eq("id", taskId);

    if (updateError) {
      res.status(500).json({ success: false, error: "Failed to update task." });
      return;
    }

    // Full points + 25% photo verification bonus
    const bonusPoints = Math.ceil(task.points * 0.25);
    const totalPointsToAward = task.completed ? bonusPoints : task.points + bonusPoints;

    await awardPoints(userId, totalPointsToAward, `Photo verified: ${task.title}`);

    res.json({
      success: true,
      data: {
        taskId,
        photoUrl,
        pointsAwarded: totalPointsToAward,
        verification,
      },
    });
  } catch (err) {
    console.error("Task verification error:", err);
    res.status(500).json({ success: false, error: "Verification failed." });
  }
});

// PATCH /api/tasks/:id
// Toggle task completion (without photo).
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { completed } = req.body as { completed?: boolean };
  const userId = req.userId!;

  if (typeof completed !== "boolean") {
    res.status(400).json({ success: false, error: "completed (boolean) is required." });
    return;
  }

  try {
    const { data: task, error: fetchError } = await supabaseAdmin
      .from("daily_tasks")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !task) {
      res.status(404).json({ success: false, error: "Task not found." });
      return;
    }

    await supabaseAdmin
      .from("daily_tasks")
      .update({ completed })
      .eq("id", id);

    // Award points if completing for the first time
    if (completed && !task.completed) {
      await awardPoints(userId, task.points, `Completed task: ${task.title}`);
    }

    res.json({ success: true, data: { id, completed } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update task." });
  }
});

// GET /api/tasks?date=YYYY-MM-DD
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }

  res.json({ success: true, data });
});

export default router;
