import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Hash, AlertCircle, Clock, RotateCcw } from "lucide-react";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
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
    desc: "Set your own durations & rounds",
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
        ? {
            style: StudyStyle.CUSTOM,
            studyDurationMinutes: customStudy,
            breakDurationMinutes: customBreak,
          }
        : { ...preset.config };

    return { ...base, totalCycles: cycles };
  }

  async function handleCreate() {
    setLocalError("");
    if (cycles < 1 || cycles > 20) {
      setLocalError("Rounds must be between 1 and 20.");
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
    if (code.length !== 6) {
      setLocalError("Room code must be 6 characters.");
      return;
    }
    try {
      await joinRoom(code);
      navigate(`/flock-party/${code}`);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to join room");
    }
  }

  const displayError = localError || error;
  const selectedPreset = STUDY_STYLES.find((s) => s.style === selectedStyle)!;

  return (
    <div className="flex flex-col gap-6 max-w-2xl animate-in">
      <div>
        <h1 className="text-3xl font-display font-extrabold text-white mb-1 flex items-center gap-3">
          <Users className="w-8 h-8 text-secondary" />
          Flock Party
        </h1>
        <p className="text-white/55">
          Study together in real-time. Create a room or join your flock with a code.
        </p>
      </div>

      {displayError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-background-surface border border-white/10 rounded-xl p-1 gap-1">
        {(["create", "join"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? "bg-background-card text-white shadow"
                : "text-white/50 hover:text-white"
            }`}
          >
            {t === "create" ? (
              <span className="flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> Create Room
              </span>
            ) : (
              <span className="flex items-center justify-center gap-1.5">
                <Hash className="w-4 h-4" /> Join Room
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "create" && (
        <Card variant="default" padding="lg">
          <CardHeader>
            <CardTitle>Choose your study style</CardTitle>
            <Clock className="w-5 h-5 text-white/40" />
          </CardHeader>
          <CardContent>
            {/* Style grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {STUDY_STYLES.map(({ style, label, desc, icon }) => (
                <button
                  key={style}
                  onClick={() => handleStyleSelect(style)}
                  className={`text-left p-4 rounded-xl border transition-all ${
                    selectedStyle === style
                      ? "border-primary/60 bg-primary/10"
                      : "border-white/10 hover:border-white/25 bg-background-surface"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{icon}</span>
                    <span className="text-white font-medium text-sm">{label}</span>
                  </div>
                  <p className="text-white/45 text-xs">{desc}</p>
                </button>
              ))}
            </div>

            {/* Custom durations */}
            {selectedStyle === StudyStyle.CUSTOM && (
              <div className="grid grid-cols-2 gap-4 mb-5 p-4 bg-background-surface rounded-xl border border-white/10">
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Study duration (min)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={customStudy}
                    onChange={(e) => setCustomStudy(Number(e.target.value))}
                    className="input-base text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/60 mb-1.5">Break duration (min)</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={customBreak}
                    onChange={(e) => setCustomBreak(Number(e.target.value))}
                    className="input-base text-sm"
                  />
                </div>
              </div>
            )}

            {/* Rounds/cycles input — all styles */}
            <div className="flex items-center gap-4 p-4 bg-background-surface rounded-xl border border-white/10 mb-5">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-secondary" />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-white mb-0.5">
                  Number of rounds
                </label>
                <p className="text-white/40 text-xs">
                  How many{" "}
                  {selectedPreset.config.studyDurationMinutes >= 60
                    ? `${selectedPreset.config.studyDurationMinutes / 60}h`
                    : `${selectedPreset.config.studyDurationMinutes}m`}{" "}
                  study blocks to do
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCycles((c) => Math.max(1, c - 1))}
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 text-white font-bold transition-colors"
                >
                  −
                </button>
                <span className="text-white font-display font-bold text-lg w-6 text-center tabular-nums">
                  {cycles}
                </span>
                <button
                  onClick={() => setCycles((c) => Math.min(20, c + 1))}
                  className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 text-white font-bold transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={handleCreate}
              isLoading={loading}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Room
            </Button>
          </CardContent>
        </Card>
      )}

      {tab === "join" && (
        <Card variant="default" padding="lg">
          <CardHeader>
            <CardTitle>Enter room code</CardTitle>
            <Hash className="w-5 h-5 text-white/40" />
          </CardHeader>
          <CardContent>
            <p className="text-white/55 text-sm mb-4">
              Get the 6-character code from whoever created the room.
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="input-base text-center text-3xl font-display font-bold tracking-widest mb-4"
              maxLength={6}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button
              variant="secondary"
              fullWidth
              onClick={handleJoin}
              isLoading={loading}
              disabled={joinCode.trim().length !== 6}
              leftIcon={<Users className="w-4 h-4" />}
            >
              Join Flock
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
