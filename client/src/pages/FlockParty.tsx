import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Plus, Hash, AlertCircle, Clock, RotateCcw, Target, Settings2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { useFlockStore } from "@/store/flockStore";
import { StudyStyle } from "@waddle/shared";
import type { StudyConfig } from "@waddle/shared";

const STUDY_STYLES = [
  {
    style: StudyStyle.POMODORO,
    label: "Pomodoro Technique",
    desc: "25 min focus / 5 min short break",
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
    label: "Flowmodoro Timer",
    desc: "Focus as long as needed / 5:1 break ratio",
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
    desc: "Deep work blocks / Long breaks",
    defaultCycles: 2,
    config: {
      style: StudyStyle.TIME_BLOCKING,
      studyDurationMinutes: 120,
      breakDurationMinutes: 60,
    },
  },
  {
    style: StudyStyle.CUSTOM,
    label: "Custom Setup",
    desc: "Define your own session parameters",
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
      {/* Container slightly narrowed to fit the dashboard aesthetic */}
      <div className="max-w-[1000px] mx-auto px-6 py-10 flex flex-col gap-8">
        
        {/* Softened Header Section */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-forest/5 rounded-2xl flex items-center justify-center shrink-0 border border-forest/10">
            <Users className="w-6 h-6 text-forest/70" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-forest">Flock Party</h1>
            <p className="text-forest/50 text-sm font-medium mt-0.5">Study together in real time, geese included.</p>
          </div>
        </div>

        {displayError && (
          <div className="flex items-start gap-2 p-3.5 rounded-xl text-sm bg-red-50 border border-red-100 text-red-600 shadow-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium pt-0.5">{displayError}</span>
          </div>
        )}

        {/* Scaled-down Tab Switcher (Segmented Control) */}
        <div className="flex bg-white/60 rounded-2xl p-1 shadow-sm border border-forest/5 w-full max-w-sm">
          {(["create", "join"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                tab === t 
                  ? "bg-white text-forest shadow-sm border border-forest/5" 
                  : "text-forest/50 hover:text-forest hover:bg-white/40"
              }`}
            >
              {t === "create" ? (
                <span className="flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Start Flock</span>
              ) : (
                <span className="flex items-center justify-center gap-2"><Hash className="w-4 h-4" />Join Code</span>
              )}
            </button>
          ))}
        </div>

        {tab === "create" && (
          <div className="bg-white rounded-[24px] p-6 md:p-8 shadow-sm border border-forest/5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
              
              {/* Left Column */}
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-2 pb-2 border-b border-forest/5">
                  <Settings2 className="w-5 h-5 text-forest/40" />
                  <h2 className="font-bold text-forest text-base">1. Choose a focus style</h2>
                </div>
                
                <div className="flex flex-col gap-3">
                  {STUDY_STYLES.map(({ style, label, desc }) => (
                    <button
                      key={style}
                      onClick={() => handleStyleSelect(style)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-0.5 ${
                        selectedStyle === style
                          ? "border-avocado bg-avocado/5 shadow-sm"
                          : "border-forest/10 bg-white hover:border-avocado/30 hover:bg-cream/30"
                      }`}
                    >
                      <span className="text-forest font-semibold text-sm">{label}</span>
                      <p className="text-forest/50 text-xs font-medium">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6 md:pt-1">
                <div className="flex flex-col gap-5 p-5 md:p-6 bg-cream/40 rounded-2xl border border-forest/5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-forest/5 shadow-sm">
                      <RotateCcw className="w-4 h-4 text-forest/70" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-forest">Session Rounds</p>
                      <p className="text-forest/50 text-xs font-medium">How many work intervals</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-xl border border-forest/5 shadow-sm">
                    <button
                      onClick={() => setCycles((c) => Math.max(1, c - 1))}
                      className="w-10 h-10 rounded-lg bg-cream hover:bg-forest/5 text-forest font-bold transition-colors flex items-center justify-center text-lg"
                    >
                      -
                    </button>
                    <span className="text-forest font-bold text-lg w-12 text-center tabular-nums">
                      {cycles}
                    </span>
                    <button
                      onClick={() => setCycles((c) => Math.min(20, c + 1))}
                      className="w-10 h-10 rounded-lg bg-cream hover:bg-forest/5 text-forest font-bold transition-colors flex items-center justify-center text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>

                {selectedStyle === StudyStyle.CUSTOM && (
                  <div className="flex flex-col gap-5 p-5 bg-cream/40 rounded-2xl border border-forest/5 animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-forest/5 shadow-sm">
                        <Clock className="w-4 h-4 text-forest/70" />
                      </div>
                      <p className="text-sm font-semibold text-forest">Customize Durations</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-forest/60 mb-1.5 ml-1">Study (min)</label>
                        <input type="number" min={0.1} max={180} step={0.5} value={customStudy} onChange={(e) => setCustomStudy(Number(e.target.value))} className="w-full bg-white text-sm py-2.5 px-3 rounded-xl border border-forest/10 focus:border-avocado focus:ring-2 focus:ring-avocado/20 outline-none transition-all text-forest shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-forest/60 mb-1.5 ml-1">Break (min)</label>
                        <input type="number" min={0.1} max={60} step={0.5} value={customBreak} onChange={(e) => setCustomBreak(Number(e.target.value))} className="w-full bg-white text-sm py-2.5 px-3 rounded-xl border border-forest/10 focus:border-avocado focus:ring-2 focus:ring-avocado/20 outline-none transition-all text-forest shadow-sm" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <Button variant="primary" fullWidth onClick={handleCreate} isLoading={loading} leftIcon={<Plus className="w-5 h-5" />} className="rounded-xl font-bold py-3.5 text-base shadow-sm">
                    Launch Flock Party
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "join" && (
          <div className="bg-white rounded-[24px] p-8 md:p-10 shadow-sm border border-forest/5 max-w-lg mx-auto w-full animate-in fade-in zoom-in-95">
            <div className="flex flex-col items-center gap-2 mb-8 text-center">
              <div className="w-12 h-12 bg-forest/5 rounded-full flex items-center justify-center mb-2 border border-forest/5">
                <Target className="w-6 h-6 text-forest/50" />
              </div>
              <h2 className="font-bold text-forest text-xl">Connect to a Flock</h2>
              <p className="text-forest/50 text-sm font-medium">Get the 6-character code from the host.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="ABC123"
                className="w-full text-center text-3xl font-bold tracking-[0.2em] py-5 rounded-xl bg-cream/50 border border-forest/10 focus:border-avocado focus:ring-2 focus:ring-avocado/20 outline-none transition-all placeholder:text-forest/20 text-forest shadow-sm uppercase"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />

              <Button 
                variant="primary" 
                fullWidth 
                onClick={handleJoin} 
                isLoading={loading} 
                disabled={joinCode.trim().length !== 6} 
                leftIcon={<Users className="w-5 h-5" />} 
                className="rounded-xl font-bold py-4 text-base shadow-sm transition-all mt-2"
              >
                Join Flock
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}