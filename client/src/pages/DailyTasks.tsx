import { useState, useRef } from "react";
import { Sparkles, Upload, CheckCircle, Circle, Clock, Zap, AlertCircle, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useAuthStore } from "@/store/authStore";
import type { DailyTask, TaskGenerationResult } from "@waddle/shared";
import { TaskCategory } from "@waddle/shared";
import { supabase } from "@/lib/supabase";

const CATEGORY_COLORS: Record<TaskCategory, string> = {
  [TaskCategory.ACADEMIC]: "bg-secondary/15 text-secondary border-secondary/30",
  [TaskCategory.WORK]: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  [TaskCategory.PERSONAL]: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  [TaskCategory.SELF_CARE]: "bg-accent/15 text-accent border-accent/30",
  [TaskCategory.CREATIVE]: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  [TaskCategory.FITNESS]: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  [TaskCategory.OTHER]: "bg-white/10 text-white/60 border-white/20",
};

interface TaskWithState extends DailyTask {
  uploading?: boolean;
}

export default function DailyTasks() {
  const { session } = useAuthStore();
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [tasks, setTasks] = useState<TaskWithState[]>([]);
  const [error, setError] = useState("");
  const [generationResult, setGenerationResult] = useState<TaskGenerationResult | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleGenerate() {
    if (!description.trim()) return;
    setGenerating(true);
    setError("");

    try {
      const res = await fetch("/api/tasks/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ description: description.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate tasks");
      }

      const { data } = await res.json();
      setGenerationResult(data);

      // Fetch the saved tasks from Supabase
      const { data: savedTasks } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: true });

      if (savedTasks) {
        setTasks(
          savedTasks.map((t) => ({
            id: t.id,
            userId: t.user_id,
            date: t.date,
            title: t.title,
            description: t.description,
            estimatedMinutes: t.estimated_minutes,
            points: t.points,
            category: t.category as TaskCategory,
            isSelfCare: t.is_self_care,
            completed: t.completed,
            photoUrl: t.photo_url,
            createdAt: t.created_at,
          }))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  async function handleToggleTask(taskId: string, completed: boolean) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
    );

    await supabase
      .from("daily_tasks")
      .update({ completed })
      .eq("id", taskId);
  }

  async function handlePhotoUpload(taskId: string, file: File) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, uploading: true } : t))
    );

    try {
      const ext = file.name.split(".").pop();
      const path = `task-verifications/${taskId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("task-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("task-photos")
        .getPublicUrl(path);

      // Call verify endpoint to award points
      await fetch("/api/tasks/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ taskId, photoUrl: urlData.publicUrl }),
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, completed: true, photoUrl: urlData.publicUrl, uploading: false }
            : t
        )
      );
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, uploading: false } : t))
      );
    }
  }

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalPoints = tasks.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0);

  return (
    <div className="flex flex-col gap-6 max-w-3xl animate-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white mb-1">Daily Tasks</h1>
        <p className="text-white/55">
          Describe your day and let Claude generate a personalized task list with point rewards.
        </p>
      </div>

      {/* Generator card */}
      <Card variant="default" padding="lg">
        <CardHeader>
          <CardTitle>What's on your plate today?</CardTitle>
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I need to finish my chemistry lab report, review calculus notes for tomorrow's exam, catch up on emails, and go for a run..."
            rows={4}
            className="input-base resize-none mb-4"
            disabled={generating}
          />

          {error && (
            <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleGenerate}
            isLoading={generating}
            disabled={!description.trim() || generating}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            {generating ? "Generating with Claude..." : "Generate My Tasks"}
          </Button>
        </CardContent>
      </Card>

      {/* Task list */}
      {tasks.length > 0 && (
        <>
          {/* Summary bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl">
            <span className="text-white/70 text-sm">
              {completedCount}/{tasks.length} tasks completed
            </span>
            <div className="flex items-center gap-1.5 text-primary font-medium text-sm">
              <Zap className="w-4 h-4" />
              {totalPoints} pts earned
            </div>
          </div>

          {/* Tasks */}
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`group bg-background-card border rounded-xl p-4 transition-all duration-150 ${
                  task.completed
                    ? "border-accent/30 bg-accent/5"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleTask(task.id, !task.completed)}
                    className="shrink-0 mt-0.5 text-white/40 hover:text-accent transition-colors"
                  >
                    {task.completed ? (
                      <CheckCircle className="w-5 h-5 text-accent" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3
                        className={`font-medium text-sm ${
                          task.completed ? "line-through text-white/40" : "text-white"
                        }`}
                      >
                        {task.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[task.category]}`}
                      >
                        {task.category.toLowerCase()}
                      </span>
                      {task.isSelfCare && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                          self-care
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-white/45 mb-2">{task.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        ~{task.estimatedMinutes}m
                      </span>
                      <span className="flex items-center gap-1 text-primary">
                        <Zap className="w-3 h-3" />
                        {task.points} pts
                      </span>
                    </div>

                    {/* Photo verification */}
                    {task.completed && !task.photoUrl && !task.uploading && (
                      <div className="mt-3">
                        <input
                          ref={(el) => { fileInputRefs.current[task.id] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload(task.id, file);
                          }}
                        />
                        <button
                          onClick={() => fileInputRefs.current[task.id]?.click()}
                          className="flex items-center gap-1.5 text-xs text-secondary hover:text-secondary-300 transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload photo verification for bonus points
                        </button>
                      </div>
                    )}

                    {task.uploading && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-white/50">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading...
                      </div>
                    )}

                    {task.photoUrl && (
                      <div className="mt-3">
                        <a
                          href={task.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Photo verified
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
