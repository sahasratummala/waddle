import { useState, useRef, useEffect, useCallback } from "react";
import {
    Sparkles, CheckCircle, Clock, Zap, AlertCircle,
    Loader2, Play, Pause, RotateCcw, Camera, XCircle, Timer, Upload,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuthStore } from "@/store/authStore";
import { TaskCategory } from "@waddle/shared";
import { supabase } from "@/lib/supabase";

interface Task {
    id: string;
    title: string;
    description: string;
    estimatedMinutes: number;
    points: number;
    category: TaskCategory;
    isSelfCare: boolean;
    urgent: boolean;
    completed: boolean;
    photoUrl: string | null;
}

type TimerStatus = "idle" | "running" | "paused" | "done";
interface TaskTimer { status: TimerStatus; remaining: number; }
type UploadStatus = "idle" | "uploading" | "verifying" | "verified" | "failed";
interface UploadState { status: UploadStatus; error?: string; }

interface TaskListProps {
    compact?: boolean;
}

const CATEGORY_STYLE: Record<TaskCategory, { bg: string; text: string; border: string; label: string; emoji: string }> = {
    [TaskCategory.ACADEMIC]:  { bg: "rgba(126,157,162,0.15)", text: "#7E9DA2", border: "rgba(126,157,162,0.3)",  label: "Academic",  emoji: "📚" },
    [TaskCategory.WORK]:      { bg: "rgba(126,157,162,0.12)", text: "#7E9DA2", border: "rgba(126,157,162,0.25)", label: "Work",      emoji: "💼" },
    [TaskCategory.PERSONAL]:  { bg: "rgba(137,132,51,0.15)",  text: "#898433", border: "rgba(137,132,51,0.3)",   label: "Personal",  emoji: "✨" },
    [TaskCategory.SELF_CARE]: { bg: "rgba(126,157,162,0.15)", text: "#7E9DA2", border: "rgba(126,157,162,0.3)",  label: "Self Care", emoji: "🌿" },
    [TaskCategory.CREATIVE]:  { bg: "rgba(229,222,202,0.12)", text: "#898433", border: "rgba(229,222,202,0.2)",  label: "Creative",  emoji: "🎨" },
    [TaskCategory.FITNESS]:   { bg: "rgba(137,132,51,0.15)",  text: "#898433", border: "rgba(137,132,51,0.3)",   label: "Fitness",   emoji: "🏃" },
    [TaskCategory.OTHER]:     { bg: "rgba(229,222,202,0.08)", text: "#45441A", border: "rgba(229,222,202,0.15)", label: "Other",     emoji: "📌" },
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
            resolve({ base64: dataUrl.split(",")[1], mimeType: file.type });
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
        urgent: (t.urgent as boolean) ?? false,
        completed: t.completed as boolean,
        photoUrl: t.photo_url as string | null,
    };
}

export default function TaskList({ compact = false }: TaskListProps) {
    const { session } = useAuthStore();
    const [pageState, setPageState] = useState<"loading" | "empty" | "loaded">("loading");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [description, setDescription] = useState("");
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState("");
    const [timers, setTimers] = useState<Record<string, TaskTimer>>({});
    const [uploads, setUploads] = useState<Record<string, UploadState>>({});

    // Add-more panel
    const [addMoreOpen, setAddMoreOpen] = useState(false);
    const [addMoreText, setAddMoreText] = useState("");
    const [addMoreLoading, setAddMoreLoading] = useState(false);
    const [addMoreError, setAddMoreError] = useState("");

    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from("daily_tasks")
                .select("*")
                .eq("date", todayDate())
                .order("urgent", { ascending: false })
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

    useEffect(() => {
        const interval = setInterval(() => {
            setTimers((prev) => {
                const next = { ...prev };
                let changed = false;
                for (const id of Object.keys(next)) {
                    if (next[id].status === "running") {
                        const newRemaining = next[id].remaining - 1;
                        next[id] = newRemaining <= 0
                            ? { status: "done", remaining: 0 }
                            : { ...next[id], remaining: newRemaining };
                        changed = true;
                    }
                }
                return changed ? next : prev;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

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
            const { data } = await supabase
                .from("daily_tasks")
                .select("*")
                .eq("date", todayDate())
                .order("urgent", { ascending: false })
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

    async function handleAddMore() {
        if (!addMoreText.trim()) return;
        setAddMoreLoading(true);
        setAddMoreError("");
        try {
            const res = await fetch("/api/tasks/add-more", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ description: addMoreText.trim() }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to add tasks");
            }
            const { data } = await supabase
                .from("daily_tasks")
                .select("*")
                .eq("date", todayDate())
                .order("urgent", { ascending: false })
                .order("created_at", { ascending: true });
            if (data) setTasks(data.map(mapDbTask));
            setAddMoreText("");
            setAddMoreOpen(false);
        } catch (err) {
            setAddMoreError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setAddMoreLoading(false);
        }
    }

    function startTimer(task: Task) {
        setTimers((prev) => ({ ...prev, [task.id]: { status: "running", remaining: task.estimatedMinutes * 60 } }));
    }
    function pauseTimer(taskId: string) {
        setTimers((prev) => ({ ...prev, [taskId]: { ...prev[taskId], status: "paused" } }));
    }
    function resumeTimer(taskId: string) {
        setTimers((prev) => ({ ...prev, [taskId]: { ...prev[taskId], status: "running" } }));
    }
    function resetTimer(task: Task) {
        setTimers((prev) => ({ ...prev, [task.id]: { status: "idle", remaining: task.estimatedMinutes * 60 } }));
    }

    const handlePhotoUpload = useCallback(async (task: Task, file: File) => {
        setUploads((prev) => ({ ...prev, [task.id]: { status: "uploading" } }));
        try {
            const { base64, mimeType } = await readFileAsBase64(file);
            setUploads((prev) => ({ ...prev, [task.id]: { ...prev[task.id], status: "verifying" } }));
            const res = await fetch("/api/tasks/verify", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({ taskId: task.id, imageData: base64, mimeType }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.reason || err.error || "Gemini couldn't verify this photo");
            }
            const { data } = await res.json();
            setUploads((prev) => ({ ...prev, [task.id]: { ...prev[task.id], status: "verified" } }));
            setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: true, photoUrl: data.photoUrl } : t));
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Verification failed";
            setUploads((prev) => ({ ...prev, [task.id]: { status: "failed", error: msg } }));
        }
    }, [session]);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalPtsEarned = tasks.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0);
    const totalPts = tasks.reduce((sum, t) => sum + t.points, 0);

    if (pageState === "loading") {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-avocado animate-spin" />
            </div>
        );
    }

    if (pageState === "empty") {
        return (
            <div className="flex flex-col gap-4">
                {!compact && (
                    <div>
                        <h2 className="text-xl font-display font-bold text-forest">Daily Tasks</h2>
                        <p className="text-sm text-forest/50">
                            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                    </div>
                )}
                <div className="rounded-2xl p-5 flex flex-col gap-4 bg-cream/30 border border-forest/10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-avocado/10 border border-avocado/30 shrink-0">
                            <Sparkles className="w-4 h-4 text-avocado" />
                        </div>
                        <div>
                            <p className="font-display font-bold text-forest text-sm">Gemini</p>
                            <p className="text-xs text-forest/50">What do you want to accomplish today?</p>
                        </div>
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g. I need to finish my chemistry lab report, study for calc exam, reply to emails..."
                        rows={compact ? 3 : 5}
                        className="input-base resize-none text-sm"
                        disabled={generating}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                    />
                    {genError && (
                        <div className="flex items-start gap-2 p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-600">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{genError}</span>
                        </div>
                    )}
                    <Button
                        variant="primary"
                        onClick={handleGenerate}
                        isLoading={generating}
                        disabled={!description.trim() || generating}
                        leftIcon={<Sparkles className="w-4 h-4" />}
                        size={compact ? "sm" : "md"}
                    >
                        {generating ? "Planning your day…" : "Build My Task List"}
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col gap-3">
                {!compact && (
                    <div>
                        <h2 className="text-xl font-display font-bold text-forest">Daily Tasks</h2>
                        <p className="text-sm text-forest/50">
                            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                        </p>
                    </div>
                )}

                {/* Progress bar */}
                <div className="rounded-xl p-3 flex flex-col gap-2 bg-cream/30 border border-forest/10">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-forest font-medium">{completedCount} / {tasks.length} tasks</span>
                        <span className="text-avocado font-semibold flex items-center gap-1">
                            <Zap className="w-3 h-3" />{totalPtsEarned} / {totalPts} pts
                        </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden bg-forest/10">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : "0%",
                                background: "linear-gradient(90deg, #898433, #7E9DA2)",
                            }}
                        />
                    </div>
                </div>

                {/* Task list */}
                <div className="flex flex-col gap-2">
                    {tasks.map((task) => {
                        const timer = timers[task.id] ?? { status: "idle", remaining: task.estimatedMinutes * 60 };
                        const upload = uploads[task.id] ?? { status: "idle" };
                        const catStyle = CATEGORY_STYLE[task.category];
                        const timerDone = timer.status === "done";

                        return (
                            <div
                                key={task.id}
                                className={`rounded-xl p-3 transition-all border ${task.completed ? "bg-ocean/5 border-ocean/20" : "bg-white border-forest/10"}`}
                            >
                                <div className="flex items-start gap-2.5">
                                    <div className="shrink-0 mt-0.5">
                                        {task.completed ? (
                                            <CheckCircle className="w-4 h-4 text-ocean" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-forest/25" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                            {task.urgent && !task.completed && (
                                                <span className="text-xs px-1.5 py-0.5 rounded-full border font-bold flex items-center gap-1"
                                                    style={{ background: "rgba(192,57,43,0.1)", color: "#c0392b", borderColor: "rgba(192,57,43,0.25)" }}>
                                                    🔴 Urgent
                                                </span>
                                            )}
                                            <h3
                                                className="font-medium text-sm text-forest"
                                                style={{ textDecoration: task.completed ? "line-through" : "none", opacity: task.completed ? 0.5 : 1 }}
                                            >
                                                {task.title}
                                            </h3>
                                            <span className="text-xs px-1.5 py-0.5 rounded-full border flex items-center gap-1"
                                                style={{ background: catStyle.bg, color: catStyle.text, borderColor: catStyle.border }}>
                                                <span>{catStyle.emoji}</span>
                                                {catStyle.label}
                                            </span>
                                        </div>
                                        {!compact && task.description && (
                                            <p className="text-xs text-forest/50 mb-1">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-forest/40">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{task.estimatedMinutes}m</span>
                                            <span className="flex items-center gap-1 text-avocado"><Zap className="w-3 h-3" />{task.points} pts</span>
                                        </div>
                                    </div>
                                </div>

                                {!task.completed && (
                                    <div className="mt-3 ml-6 flex flex-col gap-2">
                                        {task.estimatedMinutes > 0 && (
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                                                    timerDone ? "bg-ocean/10 text-ocean border-ocean/20"
                                                    : timer.status === "running" ? "bg-avocado/10 text-avocado border-avocado/20"
                                                    : "bg-forest/5 text-forest/50 border-forest/10"
                                                }`}>
                                                    <Timer className="w-3 h-3" />
                                                    {timerDone ? "Done!" : formatTime(timer.remaining)}
                                                </div>
                                                {!timerDone && timer.status === "idle" && (
                                                    <button onClick={() => startTimer(task)}
                                                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-avocado/10 text-avocado border border-avocado/20">
                                                        <Play className="w-3 h-3" /> Start
                                                    </button>
                                                )}
                                                {!timerDone && timer.status === "running" && (
                                                    <button onClick={() => pauseTimer(task.id)}
                                                        className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-forest/5 text-forest/60 border border-forest/10">
                                                        <Pause className="w-3 h-3" /> Pause
                                                    </button>
                                                )}
                                                {!timerDone && timer.status === "paused" && (
                                                    <>
                                                        <button onClick={() => resumeTimer(task.id)}
                                                            className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-avocado/10 text-avocado border border-avocado/20">
                                                            <Play className="w-3 h-3" /> Resume
                                                        </button>
                                                        <button onClick={() => resetTimer(task)}
                                                            className="text-xs px-2 py-1 rounded-lg text-forest/40">
                                                            <RotateCcw className="w-3 h-3" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}

                                        {/* Photo upload — always available, no timer gate */}
                                        <div>
                                            <input
                                                ref={(el) => { fileInputRefs.current[task.id] = el; }}
                                                type="file" accept="image/*" capture="environment" className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handlePhotoUpload(task, file);
                                                    e.target.value = "";
                                                }}
                                            />
                                            {upload.status === "idle" && (
                                                <button
                                                    onClick={() => fileInputRefs.current[task.id]?.click()}
                                                    className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all border hover:opacity-80"
                                                    style={{ background: "rgba(126,157,162,0.1)", color: "#7E9DA2", borderColor: "rgba(126,157,162,0.25)" }}>
                                                    <Camera className="w-3 h-3" />
                                                    Upload proof
                                                </button>
                                            )}
                                            {upload.status === "uploading" && (
                                                <div className="flex items-center gap-1.5 text-xs text-forest/50">
                                                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                                                </div>
                                            )}
                                            {upload.status === "verifying" && (
                                                <div className="flex items-center gap-1.5 text-xs text-avocado">
                                                    <Sparkles className="w-3 h-3 animate-pulse" /> Verifying…
                                                </div>
                                            )}
                                            {upload.status === "failed" && (
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-start gap-1.5 text-xs p-2 rounded-lg bg-red-50 border border-red-200 text-red-500">
                                                        <XCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                                        <span>{upload.error}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setUploads((prev) => ({ ...prev, [task.id]: { status: "idle" } }));
                                                            fileInputRefs.current[task.id]?.click();
                                                        }}
                                                        className="text-xs flex items-center gap-1 text-ocean">
                                                        <Upload className="w-3 h-3" /> Try again
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {task.completed && (
                                    <div className="mt-2 ml-6 flex items-center gap-1 text-xs text-ocean/70">
                                        <CheckCircle className="w-3 h-3" />
                                        {task.photoUrl ? "Photo verified — points awarded!" : "Completed"}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {completedCount === tasks.length && tasks.length > 0 && (
                    <div className="rounded-xl p-4 text-center bg-avocado/8 border border-avocado/20">
                        <p className="text-lg mb-1">🪿</p>
                        <p className="font-display font-bold text-forest text-sm mb-1">All done! Your goose is proud.</p>
                        <p className="text-xs text-forest/55">
                            You earned <span className="text-avocado font-bold">{totalPtsEarned} pts</span> today!
                        </p>
                    </div>
                )}
            </div>

            {/* Floating "Add More" button — fixed to viewport bottom-right */}
            <button
                onClick={() => { setAddMoreOpen(true); setAddMoreError(""); }}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-30"
                style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)", boxShadow: "0 4px 24px rgba(137,132,51,0.4)" }}
                title="Add more tasks"
            >
                <span className="text-white text-2xl font-bold leading-none">+</span>
            </button>

            {/* Add More slide-up panel */}
            {addMoreOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        style={{ background: "rgba(40,44,21,0.5)", backdropFilter: "blur(2px)" }}
                        onClick={() => setAddMoreOpen(false)}
                    />
                    <div
                        className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl p-6 flex flex-col gap-4"
                        style={{ background: "#f5f2eb", border: "1px solid rgba(40,44,21,0.12)", maxHeight: "55vh" }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">➕</span>
                                <h3 className="font-display font-bold text-forest">Add More Tasks</h3>
                            </div>
                            <button
                                onClick={() => setAddMoreOpen(false)}
                                className="w-7 h-7 rounded-full flex items-center justify-center text-forest/40 hover:text-forest transition-colors"
                                style={{ background: "rgba(40,44,21,0.06)" }}
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-forest/50">
                            Tell Gemini what else you need — it'll add them to your list. Mention "urgent" or "ASAP" to bump tasks to the top.
                        </p>

                        <textarea
                            value={addMoreText}
                            onChange={(e) => setAddMoreText(e.target.value)}
                            placeholder="e.g. I also need to email my professor ASAP and finish the reading for tomorrow..."
                            rows={3}
                            className="input-base resize-none text-sm"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddMore(); }}
                        />

                        {addMoreError && (
                            <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                {addMoreError}
                            </div>
                        )}

                        <button
                            onClick={handleAddMore}
                            disabled={!addMoreText.trim() || addMoreLoading}
                            className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
                            style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)", color: "#fff" }}
                        >
                            {addMoreLoading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding tasks…</>
                                : <><Sparkles className="w-4 h-4" /> Add to My List</>
                            }
                        </button>
                    </div>
                </>
            )}
        </>
    );
}
