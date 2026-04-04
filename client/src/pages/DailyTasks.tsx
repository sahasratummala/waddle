import { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles, Upload, CheckCircle, Clock, Zap, AlertCircle,
  Loader2, Play, Pause, RotateCcw, Camera, XCircle, Timer,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { TaskCategory } from "@waddle/shared";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  points: number;
  category: TaskCategory;
  isSelfCare: boolean;
  completed: boolean;
  photoUrl: string | null;
}

type TimerStatus = "idle" | "running" | "paused" | "done";

interface TaskTimer {
  status: TimerStatus;
  remaining: number; // seconds
}

type UploadStatus = "idle" | "uploading" | "verifying" | "verified" | "failed";

interface UploadState {
  status: UploadStatus;
  error?: string;
  preview?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORY_STYLE: Record<TaskCategory, { bg: string; text: string; border: string }> = {
  [TaskCategory.ACADEMIC]:  { bg: "rgba(126,157,162,0.15)", text: "#7E9DA2", border: "rgba(126,157,162,0.3)" },
  [TaskCategory.WORK]:      { bg: "rgba(126,157,162,0.12)", text: "#7E9DA2", border: "rgba(126,157,162,0.25)" },
  [TaskCategory.PERSONAL]:  { bg: "rgba(137,132,51,0.15)",  text: "#898433", border: "rgba(137,132,51,0.3)"  },
  [TaskCategory.SELF_CARE]: { bg: "rgba(126,157,162,0.15)", text: "#7E9DA2", border: "rgba(126,157,162,0.3)" },
  [TaskCategory.CREATIVE]:  { bg: "rgba(229,222,202,0.12)", text: "#E5DECA", border: "rgba(229,222,202,0.2)" },
  [TaskCategory.FITNESS]:   { bg: "rgba(137,132,51,0.15)",  text: "#898433", border: "rgba(137,132,51,0.3)"  },
  [TaskCategory.OTHER]:     { bg: "rgba(229,222,202,0.08)", text: "rgba(229,222,202,0.55)", border: "rgba(229,222,202,0.15)" },
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

function mapDbTask(t: Record<string, unknown>): Task {
  return {
    id: t.id as string,
    title: t.title as string,
    description: t.description as string,
    estimatedMinutes: t.estimated_minutes as number,
    points: t.points as number,
    category: t.category as TaskCategory,
    isSelfCare: t.is_self_care as boolean,
    completed: t.completed as boolean,
    photoUrl: t.photo_url as string | null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DailyTasks() {
  const { session } = useAuthStore();

  // Page state
  const [pageState, setPageState] = useState<"loading" | "empty" | "loaded">("loading");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Per-task timers  { taskId → TaskTimer }
  const [timers, setTimers] = useState<Record<string, TaskTimer>>({});

  // Per-task upload state  { taskId → UploadState }
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // ── Fetch today's tasks on mount ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("date", todayDate())
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setTasks(data.map(mapDbTask));
        setPageState("loaded");
      } else {
        setPageState("empty");
      }
    }
    load();
  }, []);

  // ── Global timer tick ───────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const id of Object.keys(next)) {
          if (next[id].status === "running") {
            const newRemaining = next[id].remaining - 1;
            if (newRemaining <= 0) {
              next[id] = { status: "done", remaining: 0 };
            } else {
              next[id] = { ...next[id], remaining: newRemaining };
            }
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Generate tasks ──────────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!description.trim()) return;
    setGenerating(true);
    setGenError("");

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

      // Re-fetch from Supabase to get saved rows with real IDs
      const { data } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("date", todayDate())
        .order("created_at", { ascending: true });

      if (data) {
        setTasks(data.map(mapDbTask));
        setPageState("loaded");
      }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  // ── Timer controls ──────────────────────────────────────────────────────────
  function startTimer(task: Task) {
    setTimers((prev) => ({
      ...prev,
      [task.id]: { status: "running", remaining: task.estimatedMinutes * 60 },
    }));
  }

  function pauseTimer(taskId: string) {
    setTimers((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], status: "paused" },
    }));
  }

  function resumeTimer(taskId: string) {
    setTimers((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], status: "running" },
    }));
  }

  function resetTimer(task: Task) {
    setTimers((prev) => ({
      ...prev,
      [task.id]: { status: "idle", remaining: task.estimatedMinutes * 60 },
    }));
  }

  // ── Photo upload + Gemini verification ─────────────────────────────────────
  const handlePhotoUpload = useCallback(
    async (task: Task, file: File) => {
      setUploads((prev) => ({ ...prev, [task.id]: { status: "uploading", preview: URL.createObjectURL(file) } }));

      try {
        // 1. Read as base64 for Gemini
        const { base64, mimeType } = await readFileAsBase64(file);

        // 2. Upload to Supabase Storage
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `task-verifications/${task.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("task-photos")
          .upload(path, file, { upsert: true });
        if (uploadError) throw new Error("Photo upload failed: " + uploadError.message);

        const { data: urlData } = supabase.storage.from("task-photos").getPublicUrl(path);

        // 3. Send to server for Gemini verification
        setUploads((prev) => ({ ...prev, [task.id]: { ...prev[task.id], status: "verifying" } }));

        const res = await fetch("/api/tasks/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            taskId: task.id,
            photoUrl: urlData.publicUrl,
            imageData: base64,
            mimeType,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.reason || err.error || "Gemini couldn't verify this photo");
        }

        setUploads((prev) => ({ ...prev, [task.id]: { ...prev[task.id], status: "verified" } }));
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, completed: true, photoUrl: urlData.publicUrl } : t
          )
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Verification failed";
        setUploads((prev) => ({ ...prev, [task.id]: { status: "failed", error: msg } }));
      }
    },
    [session]
  );

  // ── Derived stats ───────────────────────────────────────────────────────────
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalPtsEarned = tasks.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0);
  const totalPts = tasks.reduce((sum, t) => sum + t.points, 0);

  // ── Loading state ───────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 text-avocado animate-spin" />
      </div>
    );
  }

  // ── Empty state — task generation UI ───────────────────────────────────────
  if (pageState === "empty") {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto animate-in">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-cream mb-1">Daily Tasks</h1>
          <p className="text-sm" style={{ color: "rgba(229,222,202,0.55)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Chat-style input */}
        <div className="rounded-2xl p-6 flex flex-col gap-5"
          style={{ background: "#45441A", border: "1px solid rgba(229,222,202,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(137,132,51,0.2)", border: "1px solid rgba(137,132,51,0.4)" }}>
              <Sparkles className="w-4 h-4 text-avocado" />
            </div>
            <div>
              <p className="font-display font-bold text-cream text-sm">Gemini</p>
              <p className="text-xs" style={{ color: "rgba(229,222,202,0.5)" }}>
                What do you want to accomplish today?
              </p>
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I need to finish my chemistry lab report, study for tomorrow's calc exam for about an hour, reply to emails, and I also want to go for a run..."
            rows={5}
            className="input-base resize-none"
            disabled={generating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
            }}
          />

          {genError && (
            <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
              style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.25)", color: "#E88080" }}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{genError}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: "rgba(229,222,202,0.3)" }}>
              Tip: ⌘ + Enter to generate
            </p>
            <Button
              variant="primary"
              onClick={handleGenerate}
              isLoading={generating}
              disabled={!description.trim() || generating}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {generating ? "Gemini is planning your day…" : "Build My Task List"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loaded state — task list ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto animate-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-cream mb-1">Daily Tasks</h1>
          <p className="text-sm" style={{ color: "rgba(229,222,202,0.5)" }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Progress bar + stats */}
      <div className="rounded-xl p-4 flex flex-col gap-3"
        style={{ background: "#45441A", border: "1px solid rgba(229,222,202,0.1)" }}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-cream font-medium">{completedCount} / {tasks.length} tasks</span>
          <div className="flex items-center gap-1 font-semibold" style={{ color: "#898433" }}>
            <Zap className="w-4 h-4" />
            {totalPtsEarned} / {totalPts} pts
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(229,222,202,0.1)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : "0%",
              background: "linear-gradient(90deg, #898433, #7E9DA2)",
            }}
          />
        </div>
      </div>

      {/* Task cards */}
      <div className="flex flex-col gap-3">
        {tasks.map((task) => {
          const timer = timers[task.id] ?? { status: "idle", remaining: task.estimatedMinutes * 60 };
          const upload = uploads[task.id] ?? { status: "idle" };
          const catStyle = CATEGORY_STYLE[task.category];
          const timerDone = timer.status === "done";
          const canUpload = timerDone || task.estimatedMinutes === 0;

          return (
            <div
              key={task.id}
              className="rounded-2xl p-4 sm:p-5 transition-all duration-150"
              style={{
                background: task.completed ? "rgba(126,157,162,0.08)" : "#45441A",
                border: `1px solid ${task.completed ? "rgba(126,157,162,0.3)" : "rgba(229,222,202,0.1)"}`,
              }}
            >
              {/* Top row */}
              <div className="flex items-start gap-3">
                {/* Completion indicator */}
                <div className="shrink-0 mt-0.5">
                  {task.completed ? (
                    <CheckCircle className="w-5 h-5 text-ocean" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2"
                      style={{ borderColor: "rgba(229,222,202,0.25)" }} />
                  )}
                </div>

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm"
                      style={{ color: task.completed ? "rgba(229,222,202,0.45)" : "#E5DECA",
                               textDecoration: task.completed ? "line-through" : "none" }}>
                      {task.title}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full border"
                      style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}>
                      {task.category.toLowerCase()}
                    </span>
                    {task.isSelfCare && (
                      <span className="text-xs px-2 py-0.5 rounded-full border"
                        style={{ background: "rgba(126,157,162,0.12)", color: "#7E9DA2", borderColor: "rgba(126,157,162,0.25)" }}>
                        self-care
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs mb-2" style={{ color: "rgba(229,222,202,0.5)" }}>
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(229,222,202,0.4)" }}>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      ~{task.estimatedMinutes}m
                    </span>
                    <span className="flex items-center gap-1" style={{ color: "#898433" }}>
                      <Zap className="w-3 h-3" />
                      {task.points} pts
                    </span>
                  </div>
                </div>
              </div>

              {/* Timer + verification section (only if not yet completed) */}
              {!task.completed && (
                <div className="mt-4 ml-8 flex flex-col gap-3">

                  {/* Timer — only show if task has a meaningful duration */}
                  {task.estimatedMinutes > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        {/* Timer display */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-mono font-bold"
                          style={{
                            background: timerDone
                              ? "rgba(126,157,162,0.15)"
                              : timer.status === "running"
                              ? "rgba(137,132,51,0.15)"
                              : "rgba(229,222,202,0.06)",
                            color: timerDone ? "#7E9DA2" : timer.status === "running" ? "#898433" : "rgba(229,222,202,0.55)",
                            border: `1px solid ${timerDone ? "rgba(126,157,162,0.3)" : "rgba(229,222,202,0.12)"}`,
                          }}>
                          <Timer className="w-3.5 h-3.5" />
                          {timerDone ? "Done!" : formatTime(timer.remaining)}
                        </div>

                        {/* Timer controls */}
                        {!timerDone && (
                          <>
                            {timer.status === "idle" && (
                              <button onClick={() => startTimer(task)}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                                style={{ background: "rgba(137,132,51,0.15)", color: "#898433", border: "1px solid rgba(137,132,51,0.3)" }}>
                                <Play className="w-3 h-3" /> Start Timer
                              </button>
                            )}
                            {timer.status === "running" && (
                              <button onClick={() => pauseTimer(task.id)}
                                className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                                style={{ background: "rgba(229,222,202,0.08)", color: "rgba(229,222,202,0.6)", border: "1px solid rgba(229,222,202,0.12)" }}>
                                <Pause className="w-3 h-3" /> Pause
                              </button>
                            )}
                            {timer.status === "paused" && (
                              <>
                                <button onClick={() => resumeTimer(task.id)}
                                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                                  style={{ background: "rgba(137,132,51,0.15)", color: "#898433", border: "1px solid rgba(137,132,51,0.3)" }}>
                                  <Play className="w-3 h-3" /> Resume
                                </button>
                                <button onClick={() => resetTimer(task)}
                                  className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg"
                                  style={{ color: "rgba(229,222,202,0.4)" }}>
                                  <RotateCcw className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Timer progress bar */}
                      {timer.status !== "idle" && !timerDone && (
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(229,222,202,0.08)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-1000"
                            style={{
                              width: `${100 - (timer.remaining / (task.estimatedMinutes * 60)) * 100}%`,
                              background: "linear-gradient(90deg, #898433, #7E9DA2)",
                            }}
                          />
                        </div>
                      )}

                      {/* Hint when timer hasn't run */}
                      {timer.status === "idle" && (
                        <p className="text-xs" style={{ color: "rgba(229,222,202,0.3)" }}>
                          Start the timer, then upload a photo when it's done to earn your points.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Photo upload section */}
                  <div>
                    <input
                      ref={(el) => { fileInputRefs.current[task.id] = el; }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(task, file);
                        // reset so same file can be re-selected
                        e.target.value = "";
                      }}
                    />

                    {upload.status === "idle" && (
                      <button
                        onClick={() => canUpload && fileInputRefs.current[task.id]?.click()}
                        disabled={!canUpload}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                          background: canUpload ? "rgba(126,157,162,0.12)" : "rgba(229,222,202,0.05)",
                          color: canUpload ? "#7E9DA2" : "rgba(229,222,202,0.3)",
                          border: `1px solid ${canUpload ? "rgba(126,157,162,0.25)" : "rgba(229,222,202,0.08)"}`,
                        }}
                        title={!canUpload ? "Complete the timer first" : "Upload photo proof"}>
                        <Camera className="w-3.5 h-3.5" />
                        {!canUpload ? "Upload unlocks when timer finishes" : "Upload Photo Proof"}
                      </button>
                    )}

                    {upload.status === "uploading" && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: "rgba(229,222,202,0.5)" }}>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading photo…
                      </div>
                    )}

                    {upload.status === "verifying" && (
                      <div className="flex items-center gap-2 text-xs" style={{ color: "#898433" }}>
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        Gemini is verifying your photo…
                      </div>
                    )}

                    {upload.status === "failed" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg"
                          style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.2)", color: "#E88080" }}>
                          <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{upload.error}</span>
                        </div>
                        <button
                          onClick={() => {
                            setUploads((prev) => ({ ...prev, [task.id]: { status: "idle" } }));
                            fileInputRefs.current[task.id]?.click();
                          }}
                          className="text-xs flex items-center gap-1.5"
                          style={{ color: "#7E9DA2" }}>
                          <Upload className="w-3 h-3" /> Try a different photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Verified badge */}
              {task.completed && task.photoUrl && (
                <div className="mt-3 ml-8 flex items-center gap-1.5 text-xs"
                  style={{ color: "#7E9DA2" }}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Photo verified — points awarded!
                </div>
              )}
              {task.completed && !task.photoUrl && (
                <div className="mt-3 ml-8 flex items-center gap-1.5 text-xs"
                  style={{ color: "rgba(229,222,202,0.4)" }}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  Completed
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* All done celebration */}
      {completedCount === tasks.length && tasks.length > 0 && (
        <div className="rounded-2xl p-6 text-center"
          style={{ background: "rgba(137,132,51,0.12)", border: "1px solid rgba(137,132,51,0.25)" }}>
          <p className="text-2xl mb-1">🪿</p>
          <p className="font-display font-bold text-cream mb-1">All done! Your goose is proud.</p>
          <p className="text-sm" style={{ color: "rgba(229,222,202,0.55)" }}>
            You earned <span className="text-avocado font-bold">{totalPtsEarned} points</span> today. Keep waddling!
          </p>
        </div>
      )}
    </div>
  );
}
