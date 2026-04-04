import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Hash, AlertCircle, Clock, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import { useFlockStore } from "@/store/flockStore";
import { StudyStyle } from "@waddle/shared";
import type { StudyConfig } from "@waddle/shared";

const STUDY_STYLES = [
  {
    style: StudyStyle.POMODORO,
    label: "Pomodoro",
    desc: "25 min work / 5 min break",
    icon: "🍅",
    defaultCycles: 4,
    config: {
      style: StudyStyle.POMODORO,
      studyDurationMinutes: 25,
      breakDurationMinutes: 5,
      longBreakDurationMinutes: 15,
      sessionsBeforeLongBreak: 4,
    },
  },
  {
    style: StudyStyle.FLOWMODORO,
    label: "Flowmodoro",
    desc: "60 min work / 12 min break",
    icon: "🌊",
    defaultCycles: 3,
    config: {
      style: StudyStyle.FLOWMODORO,
      studyDurationMinutes: 60,
      breakDurationMinutes: 12,
    },
  },
  {
    style: StudyStyle.TIME_BLOCKING,
    label: "Time Blocking",
    desc: "2 hr work / 1 hr break",
    icon: "📅",
    defaultCycles: 2,
    config: {
      style: StudyStyle.TIME_BLOCKING,
      studyDurationMinutes: 120,
      breakDurationMinutes: 60,
    },
  },
  {
    style: StudyStyle.CUSTOM,
    label: "Custom",
    desc: "Set your own durations and rounds",
    icon: "⚙️",
    defaultCycles: 3,
    config: {
      style: StudyStyle.CUSTOM,
      studyDurationMinutes: 45,
      breakDurationMinutes: 10,
    },
  },
];

export default function FlockParty() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, loading, error } = useFlockStore();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [joinCode, setJoinCode] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(StudyStyle.POMODORO);
  const [cycles, setCycles] = useState(4);
  const [customStudy, setCustomStudy] = useState(45);
  const [customBreak, setCustomBreak] = useState(10);
  const [localError, setLocalError] = useState("");

  function handleStyleSelect(style: StudyStyle) {
    setSelectedStyle(style);
    const preset = STUDY_STYLES.find((s) => s.style === style);
    if (preset) setCycles(preset.defaultCycles);
  }

  function getStudyConfig(): StudyConfig {
    const preset = STUDY_STYLES.find((s) => s.style === selectedStyle)!;
    const base =
      selectedStyle === StudyStyle.CUSTOM
        ? { style: StudyStyle.CUSTOM, studyDurationMinutes: customStudy, breakDurationMinutes: customBreak }
        : { ...preset.config };
    return { ...base, totalCycles: cycles };
  }

  async function handleCreate() {
    setLocalError("");
    if (cycles < 1 || cycles > 20) {
      setLocalError("Rounds must be between 1 and 20.");
      return;
    }
    if (selectedStyle === StudyStyle.CUSTOM && (customStudy <= 0 || customBreak <= 0)) {
      setLocalError("Study and break durations must be greater than 0.");
      return;
    }
    try {
      const code = await createRoom(getStudyConfig());
      navigate(`/flock-party/${code}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to create room");
    }
  }

  async function handleJoin() {
    setLocalError("");
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) { setLocalError("Room code must be 6 characters."); return; }
    try {
      await joinRoom(code);
      navigate(`/flock-party/${code}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to join room");
    }
  }

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-ocean" />
          <div>
            <h1 className="font-display text-3xl font-black text-forest">Flock Party</h1>
            <p className="text-forest/50 text-sm font-medium">Study together in real time</p>
          </div>
        </div>

        {displayError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl text-sm bg-red-50 border-2 border-red-200 text-red-600">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{displayError}</span>
          </div>
        )}

        {/* Tab toggle */}
        <div className="flex bg-white rounded-2xl p-1 gap-1 shadow-card">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${tab === t ? "bg-avocado text-white shadow-sm" : "text-forest/50 hover:text-forest"
                }`}
            >
              {t === "create" ? (
                <span className="flex items-center justify-center gap-1.5"><Plus className="w-4 h-4" />Create Room</span>
              ) : (
                <span className="flex items-center justify-center gap-1.5"><Hash className="w-4 h-4" />Join Room</span>
              )}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div className="card p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-forest text-lg">Study style</h2>
              <Clock className="w-5 h-5 text-forest/30" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {STUDY_STYLES.map(({ style, label, desc, icon }) => (
                <button
                  key={style}
                  onClick={() => handleStyleSelect(style)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${selectedStyle === style
                      ? "border-avocado bg-avocado/8"
                      : "border-forest/10 bg-white hover:border-avocado/30"
                    }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icon}</span>
                    <span className="text-forest font-bold text-sm">{label}</span>
                  </div>
                  <p className="text-forest/45 text-xs font-medium">{desc}</p>
                </button>
              ))}
            </div>

            {selectedStyle === StudyStyle.CUSTOM && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-cream rounded-2xl border-2 border-forest/10">
                <div>
                  <label className="block text-xs font-bold text-forest/60 mb-1.5">Study (min)</label>
                  <input type="number" min={0.1} max={180} step={0.5} value={customStudy} onChange={(e) => setCustomStudy(Number(e.target.value))} className="input-base text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest/60 mb-1.5">Break (min)</label>
                  <input type="number" min={0.1} max={60} step={0.5} value={customBreak} onChange={(e) => setCustomBreak(Number(e.target.value))} className="input-base text-sm" />
                </div>
              </div>
            )}

            {/* Rounds */}
            <div className="flex items-center gap-4 p-4 bg-cream rounded-2xl border-2 border-forest/10">
              <div className="w-9 h-9 rounded-xl bg-ocean/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-ocean" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-forest">Number of rounds</p>
                <p className="text-forest/40 text-xs font-medium">
                  How many study blocks to do
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCycles((c) => Math.max(1, c - 1))}
                  className="w-8 h-8 rounded-xl bg-forest/8 hover:bg-forest/15 text-forest font-black transition-colors"
                >
                  -
                </button>
                <span className="text-forest font-display font-black text-lg w-6 text-center tabular-nums">
                  {cycles}
                </span>
                <button
                  onClick={() => setCycles((c) => Math.min(20, c + 1))}
                  className="w-8 h-8 rounded-xl bg-forest/8 hover:bg-forest/15 text-forest font-black transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <Button variant="primary" fullWidth onClick={handleCreate} isLoading={loading} leftIcon={<Plus className="w-4 h-4" />} className="rounded-xl font-black">
              Create Room
            </Button>
          </div>
        )}

        {tab === "join" && (
          <div className="card p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-black text-forest text-lg">Enter room code</h2>
              <Hash className="w-5 h-5 text-forest/30" />
            </div>
            <p className="text-forest/55 text-sm font-medium">Get the 6-character code from whoever created the room.</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="input-base text-center text-3xl font-black tracking-widest"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button variant="primary" fullWidth onClick={handleJoin} isLoading={loading} disabled={joinCode.trim().length !== 6} leftIcon={<Users className="w-4 h-4" />} className="rounded-xl font-black">
              Join Flock
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}