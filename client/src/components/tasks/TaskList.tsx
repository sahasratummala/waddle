import { useState, useRef, useEffect, useCallback } from "react";
import {
    Sparkles, CheckCircle, AlertCircle,
    Loader2, Play, Pause, RotateCcw, Camera, XCircle, Upload,
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
    hideFloatingButton?: boolean;
}

const CATEGORY_LABEL: Record<TaskCategory, string> = {
    [TaskCategory.ACADEMIC]: "Academic",
    [TaskCategory.WORK]: "Work",
    [TaskCategory.PERSONAL]: "Personal",
    [TaskCategory.SELF_CARE]: "Self Care",
    [TaskCategory.CREATIVE]: "Creative",
    [TaskCategory.FITNESS]: "Fitness",
    [TaskCategory.OTHER]: "Other",
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

function todayDate() { return new Date().toISOString().split("T")[0]; }

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

export default function TaskList({ compact = false, hideFloatingButton = false }: TaskListProps) {
    const { session, refreshProfile } = useAuthStore();
    const [pageState, setPageState] = useState<"loading" | "empty" | "loaded">("loading");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [description, setDescription] = useState("");
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState("");
    const [timers, setTimers] = useState<Record<string, TaskTimer>>({});
    const [uploads, setUploads] = useState<Record<string, UploadState>>({});
    const [addMoreOpen, setAddMoreOpen] = useState(false);
    const [addMoreText, setAddMoreText] = useState("");
    const [addMoreLoading, setAddMoreLoading] = useState(false);
    const [addMoreError, setAddMoreError] = useState("");
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    useEffect(() => {
        async function load() {
            const { data } = await supabase
                .from("daily_tasks").select("*").eq("date", todayDate())
                .order("urgent", { ascending: false }).order("created_at", { ascending: true });
            if (data && data.length > 0) { setTasks(data.map(mapDbTask)); setPageState("loaded"); }
            else setPageState("empty");
        }
        load();
    }, []);

    useEffect(() => {
        function handler() { setAddMoreOpen(true); setAddMoreError(""); }
        window.addEventListener("waddle:add-tasks", handler);
        return () => window.removeEventListener("waddle:add-tasks", handler);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimers((prev) => {
                const next = { ...prev };
                let changed = false;
                for (const id of Object.keys(next)) {
                    if (next[id].status === "running") {
                        const r = next[id].remaining - 1;
                        next[id] = r <= 0 ? { status: "done", remaining: 0 } : { ...next[id], remaining: r };
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
        setGenerating(true); setGenError("");
        try {
            const res = await fetch("/api/tasks/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ description: description.trim() }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
            const { data } = await supabase.from("daily_tasks").select("*").eq("date", todayDate())
                .order("urgent", { ascending: false }).order("created_at", { ascending: true });
            if (data) { setTasks(data.map(mapDbTask)); setPageState("loaded"); }
        } catch (err) {
            setGenError(err instanceof Error ? err.message : "Something went wrong");
        } finally { setGenerating(false); }
    }

    async function handleAddMore() {
        if (!addMoreText.trim()) return;
        setAddMoreLoading(true); setAddMoreError("");
        try {
            const res = await fetch("/api/tasks/add-more", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ description: addMoreText.trim() }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
            const { data } = await supabase.from("daily_tasks").select("*").eq("date", todayDate())
                .order("urgent", { ascending: false }).order("created_at", { ascending: true });
            if (data) setTasks(data.map(mapDbTask));
            setAddMoreText(""); setAddMoreOpen(false);
        } catch (err) {
            setAddMoreError(err instanceof Error ? err.message : "Something went wrong");
        } finally { setAddMoreLoading(false); }
    }

    function startTimer(task: Task) {
        setTimers((prev) => ({ ...prev, [task.id]: { status: "running", remaining: task.estimatedMinutes * 60 } }));
    }
    function pauseTimer(id: string) {
        setTimers((prev) => ({ ...prev, [id]: { ...prev[id], status: "paused" } }));
    }
    function resumeTimer(id: string) {
        setTimers((prev) => ({ ...prev, [id]: { ...prev[id], status: "running" } }));
    }
    function resetTimer(task: Task) {
        setTimers((prev) => ({ ...prev, [task.id]: { status: "idle", remaining: task.estimatedMinutes * 60 } }));
    }

    const handlePhotoUpload = useCallback(async (task: Task, file: File) => {
        setUploads((prev) => ({ ...prev, [task.id]: { status: "uploading" } }));
        try {
            const { base64, mimeType } = await readFileAsBase64(file);
            setUploads((prev) => ({ ...prev, [task.id]: { status: "verifying" } }));
            const res = await fetch("/api/tasks/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ taskId: task.id, imageData: base64, mimeType }),
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.reason || err.error || "Failed"); }
            const { data } = await res.json();
            setUploads((prev) => ({ ...prev, [task.id]: { status: "verified" } }));
            setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, completed: true, photoUrl: data.photoUrl } : t));
            await refreshProfile();
        } catch (err) {
            setUploads((prev) => ({ ...prev, [task.id]: { status: "failed", error: err instanceof Error ? err.message : "Failed" } }));
        }
    }, [session, refreshProfile]);

    const completedCount = tasks.filter((t) => t.completed).length;
    const totalPtsEarned = tasks.reduce((sum, t) => sum + (t.completed ? t.points : 0), 0);
    const totalPts = tasks.reduce((sum, t) => sum + t.points, 0);

    if (pageState === "loading") {
        return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-avocado animate-spin" /></div>;
    }

    if (pageState === "empty") {
        return (
            <div className="flex flex-col gap-4">
                {!compact && (
                    <div>
                        <h2 className="text-xl font-display font-bold text-forest">Daily Tasks</h2>
                        <p className="text-sm text-forest/40">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                    </div>
                )}
                <div className="flex flex-col gap-3">
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="What do you want to get done today? e.g. finish my chemistry lab report, study for calc, reply to emails..."
                        rows={compact ? 3 : 4}
                        className="input-base resize-none text-sm"
                        disabled={generating}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                    />
                    {genError && (
                        <div className="flex items-start gap-2 p-2.5 rounded-lg text-xs bg-red-50 border border-red-200 text-red-600">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /><span>{genError}</span>
                        </div>
                    )}
                    <Button variant="primary" onClick={handleGenerate} isLoading={generating}
                        disabled={!description.trim() || generating}
                        leftIcon={<Sparkles className="w-4 h-4" />} size={compact ? "sm" : "md"}>
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
                        <p className="text-sm text-forest/40">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-forest/50 font-medium">
                    <span>{completedCount} / {tasks.length} completed</span>
                    <span className="text-avocado font-bold">{totalPtsEarned} / {totalPts} pts</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-forest/8">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: tasks.length ? `${(completedCount / tasks.length) * 100}%` : "0%",
                            background: "linear-gradient(90deg, #898433, #7E9DA2)",
                        }}
                    />
                </div>

                <div className="flex flex-col gap-1.5 mt-1">
                    {tasks.map((task) => {
                        const timer = timers[task.id] ?? { status: "idle", remaining: task.estimatedMinutes * 60 };
                        const upload = uploads[task.id] ?? { status: "idle" };
                        const timerDone = timer.status === "done";

                        return (
                            <div
                                key={task.id}
                                className={`rounded-xl px-3.5 py-2.5 border transition-all ${task.completed
                                        ? "bg-cream/40 border-forest/8 opacity-60"
                                        : task.urgent
                                            ? "bg-white border-red-200"
                                            : "bg-white border-forest/10"
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="shrink-0">
                                        {task.completed
                                            ? <CheckCircle className="w-4 h-4 text-avocado" />
                                            : <div className="w-4 h-4 rounded-full border-2 border-forest/20" />
                                        }
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 flex-1 min-w-0">
                                        {task.urgent && !task.completed && (
                                            <span className="text-xs font-bold text-red-400">Urgent</span>
                                        )}
                                        <span className={`text-sm font-semibold text-forest ${task.completed ? "line-through" : ""}`}>
                                            {task.title}
                                        </span>
                                        <span className="text-xs text-forest/30 font-medium">{CATEGORY_LABEL[task.category]}</span>
                                        <span className="text-xs text-forest/30">·</span>
                                        <span className="text-xs text-avocado/70 font-semibold">{task.points} pts</span>
                                    </div>
                                </div>

                                {!task.completed && (
                                    <div className="mt-2 ml-6 flex items-center gap-1.5 flex-wrap">
                                        <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-lg ${timerDone ? "bg-avocado/15 text-avocado"
                                                : timer.status === "running" ? "bg-avocado/10 text-avocado"
                                                    : "bg-forest/6 text-forest/40"
                                            }`}>
                                            {timerDone ? "✓ Done!" : formatTime(timer.remaining)}
                                        </span>

                                        {!timerDone && timer.status === "idle" && (
                                            <button onClick={() => startTimer(task)}
                                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-avocado/10 text-avocado hover:bg-avocado/20 transition-colors border border-avocado/25">
                                                <Play className="w-3 h-3" /> Start
                                            </button>
                                        )}
                                        {!timerDone && timer.status === "running" && (
                                            <button onClick={() => pauseTimer(task.id)}
                                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-forest/8 text-forest/60 hover:bg-forest/12 transition-colors border border-forest/10">
                                                <Pause className="w-3 h-3" /> Pause
                                            </button>
                                        )}
                                        {!timerDone && timer.status === "paused" && (
                                            <>
                                                <button onClick={() => resumeTimer(task.id)}
                                                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-avocado/10 text-avocado hover:bg-avocado/20 transition-colors border border-avocado/25">
                                                    <Play className="w-3 h-3" /> Resume
                                                </button>
                                                <button onClick={() => resetTimer(task)}
                                                    className="p-1 rounded-lg text-forest/30 hover:text-forest/50 hover:bg-forest/5 transition-colors">
                                                    <RotateCcw className="w-3 h-3" />
                                                </button>
                                            </>
                                        )}

                                        <span className="text-forest/15 text-xs">|</span>

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
                                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-ocean/10 text-ocean hover:bg-ocean/20 transition-colors border border-ocean/25">
                                                <Camera className="w-3 h-3" /> Verify
                                            </button>
                                        )}
                                        {(upload.status === "uploading" || upload.status === "verifying") && (
                                            <span className="flex items-center gap-1 text-xs text-forest/40 px-2 py-1 rounded-lg bg-forest/5">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                {upload.status === "uploading" ? "Uploading…" : "Verifying…"}
                                            </span>
                                        )}
                                        {upload.status === "failed" && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-red-400 flex items-center gap-1">
                                                    <XCircle className="w-3 h-3" />{upload.error}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setUploads((prev) => ({ ...prev, [task.id]: { status: "idle" } }));
                                                        fileInputRefs.current[task.id]?.click();
                                                    }}
                                                    className="text-xs text-ocean flex items-center gap-1 px-2 py-0.5 rounded-lg bg-ocean/10 border border-ocean/20">
                                                    <Upload className="w-3 h-3" /> Retry
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {task.completed && task.photoUrl && (
                                    <p className="mt-1 ml-6 text-xs text-avocado/60 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Photo verified
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {completedCount === tasks.length && tasks.length > 0 && (
                    <div className="rounded-xl p-4 text-center bg-avocado/8 border border-avocado/15 mt-1">
                        <p className="text-lg mb-0.5">🪿</p>
                        <p className="font-display font-bold text-forest text-sm">All done! Your goose is proud.</p>
                        <p className="text-xs text-forest/50 mt-0.5">You earned <span className="text-avocado font-bold">{totalPtsEarned} pts</span> today.</p>
                    </div>
                )}
            </div>

            {!hideFloatingButton && (
                <button
                    onClick={() => { setAddMoreOpen(true); setAddMoreError(""); }}
                    className="fixed bottom-6 right-6 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-30 text-white text-xl font-bold"
                    style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)" }}
                >
                    +
                </button>
            )}

            {addMoreOpen && (
                <>
                    <div
                        className="fixed inset-0 z-30"
                        style={{ background: "rgba(40,44,21,0.4)", backdropFilter: "blur(2px)" }}
                        onClick={() => setAddMoreOpen(false)}
                    />
                    <div className="fixed bottom-0 left-0 right-0 z-40 rounded-t-3xl p-6 flex flex-col gap-3 bg-cream border-t border-forest/10" style={{ maxHeight: "50vh" }}>
                        <div className="flex items-center justify-between">
                            <h3 className="font-display font-bold text-forest">Add More Tasks</h3>
                            <button onClick={() => setAddMoreOpen(false)} className="text-forest/30 hover:text-forest text-lg">✕</button>
                        </div>
                        <textarea
                            value={addMoreText}
                            onChange={(e) => setAddMoreText(e.target.value)}
                            placeholder="e.g. I also need to email my professor ASAP and finish the reading..."
                            rows={3}
                            className="input-base resize-none text-sm"
                            autoFocus
                            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddMore(); }}
                        />
                        {addMoreError && (
                            <div className="flex items-start gap-2 text-xs p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{addMoreError}
                            </div>
                        )}
                        <button
                            onClick={handleAddMore}
                            disabled={!addMoreText.trim() || addMoreLoading}
                            className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white disabled:opacity-40 transition-all"
                            style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)" }}
                        >
                            {addMoreLoading
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding…</>
                                : <><Sparkles className="w-4 h-4" /> Add to My List</>
                            }
                        </button>
                    </div>
                </>
            )}
        </>
    );
}