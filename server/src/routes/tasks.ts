import { Router, Response } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { generateTasks, verifyTaskPhoto } from "../services/taskService";
import { awardPoints } from "../services/pointsService";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

function interleave<T>(main: T[], selfCare: T[]): T[] {
  if (selfCare.length === 0) return main;
  const result = [...main];
  const gap = Math.max(1, Math.floor(main.length / (selfCare.length + 1)));
  selfCare.forEach((sc, i) => {
    const pos = Math.min(gap * (i + 1) + i, result.length);
    result.splice(pos, 0, sc);
  });
  return result;
}

router.post("/generate", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { description, date } = req.body as { description?: string; date?: string };

  if (!description || typeof description !== "string" || description.trim().length < 10) {
    res.status(400).json({ success: false, error: "Please provide a description of at least 10 characters." });
    return;
  }

  const taskDate = date || new Date().toISOString().split("T")[0];
  const userId = req.userId!;

  try {
    const result = await generateTasks(description.trim());

    type InsertableTask = {
      title: string; description: string; estimatedMinutes: number;
      points: number; category: string; is_self_care: boolean; urgent: boolean;
    };

    const urgentTasks: InsertableTask[] = result.tasks.filter((t) => t.urgent).map((t) => ({ ...t, is_self_care: false }));
    const nonUrgentTasks: InsertableTask[] = result.tasks.filter((t) => !t.urgent).map((t) => ({ ...t, is_self_care: false }));
    const selfCareTasks: InsertableTask[] = result.selfCare.map((t) => ({ ...t, is_self_care: true }));
    const allTasks: InsertableTask[] = [...urgentTasks, ...interleave(nonUrgentTasks, selfCareTasks)];

    const tasksToInsert = allTasks.map((task) => ({
      user_id: userId,
      date: taskDate,
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimatedMinutes,
      points: task.points,
      category: task.category,
      is_self_care: task.is_self_care,
      urgent: task.urgent,
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

router.post("/verify", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { taskId, imageData, mimeType } = req.body as {
    taskId?: string; imageData?: string; mimeType?: string;
  };
  const userId = req.userId!;

  if (!taskId || !imageData || !mimeType) {
    res.status(400).json({ success: false, error: "taskId, imageData, and mimeType are required." });
    return;
  }

  try {
    const { data: task, error: fetchError } = await supabaseAdmin
      .from("daily_tasks").select("*").eq("id", taskId).eq("user_id", userId).single();

    if (fetchError || !task) {
      res.status(404).json({ success: false, error: "Task not found or not owned by user." });
      return;
    }

    if (task.photo_url) {
      res.status(400).json({ success: false, error: "Task has already been photo-verified." });
      return;
    }

    const verification = await verifyTaskPhoto(task.title, task.description, imageData, mimeType);

    if (!verification.verified) {
      res.status(422).json({
        success: false,
        error: "Photo does not appear to show task completion.",
        reason: verification.reason,
        confidence: verification.confidence,
      });
      return;
    }

    const ext = mimeType.split("/")[1] ?? "jpg";
    const storagePath = `task-verifications/${taskId}.${ext}`;
    const imageBuffer = Buffer.from(imageData, "base64");

    const { error: storageError } = await supabaseAdmin.storage
      .from("task-photos")
      .upload(storagePath, imageBuffer, { contentType: mimeType, upsert: true });

    const photoUrl = storageError
      ? null
      : supabaseAdmin.storage.from("task-photos").getPublicUrl(storagePath).data.publicUrl;

    const { error: updateError } = await supabaseAdmin
      .from("daily_tasks")
      .update({ photo_url: photoUrl, completed: true })
      .eq("id", taskId);

    if (updateError) {
      res.status(500).json({ success: false, error: "Failed to update task." });
      return;
    }

    // Award exactly the task's points, no bonus
    const totalPointsToAward = task.completed ? 0 : task.points;
    await awardPoints(userId, totalPointsToAward, `Photo verified: ${task.title}`);

    res.json({ success: true, data: { taskId, photoUrl, pointsAwarded: totalPointsToAward, verification } });
  } catch (err) {
    console.error("Task verification error:", err);
    res.status(500).json({ success: false, error: "Verification failed." });
  }
});

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
      .from("daily_tasks").select("*").eq("id", id).eq("user_id", userId).single();

    if (fetchError || !task) {
      res.status(404).json({ success: false, error: "Task not found." });
      return;
    }

    await supabaseAdmin.from("daily_tasks").update({ completed }).eq("id", id);

    if (completed && !task.completed) {
      await awardPoints(userId, task.points, `Completed task: ${task.title}`);
    }

    res.json({ success: true, data: { id, completed } });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to update task." });
  }
});

router.post("/add-more", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { description, date } = req.body as { description?: string; date?: string };
  const userId = req.userId!;

  if (!description || typeof description !== "string" || description.trim().length < 3) {
    res.status(400).json({ success: false, error: "Please describe what else you need to do." });
    return;
  }

  const taskDate = date || new Date().toISOString().split("T")[0];

  try {
    const result = await generateTasks(description.trim());

    type InsertableTask = {
      title: string; description: string; estimatedMinutes: number;
      points: number; category: string; is_self_care: boolean; urgent: boolean;
    };

    const urgentTasks: InsertableTask[] = result.tasks.filter((t) => t.urgent).map((t) => ({ ...t, is_self_care: false }));
    const nonUrgentTasks: InsertableTask[] = result.tasks.filter((t) => !t.urgent).map((t) => ({ ...t, is_self_care: false }));
    const allNewTasks: InsertableTask[] = [...urgentTasks, ...nonUrgentTasks];

    const tasksToInsert = allNewTasks.map((task) => ({
      user_id: userId,
      date: taskDate,
      title: task.title,
      description: task.description,
      estimated_minutes: task.estimatedMinutes,
      points: task.points,
      category: task.category,
      is_self_care: task.is_self_care,
      urgent: task.urgent,
      completed: false,
    }));

    const { data: savedTasks, error: insertError } = await supabaseAdmin
      .from("daily_tasks").insert(tasksToInsert).select();

    if (insertError) {
      res.status(500).json({ success: false, error: "Failed to save new tasks." });
      return;
    }

    res.json({ success: true, data: { savedTasks } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate tasks.";
    res.status(500).json({ success: false, error: message });
  }
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.userId!;
  const date = (req.query.date as string) || new Date().toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("daily_tasks").select("*").eq("user_id", userId).eq("date", date)
    .order("urgent", { ascending: false }).order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ success: false, error: error.message });
    return;
  }

  res.json({ success: true, data });
});

export default router;