import { Timer, Square } from "lucide-react";
import Button from "@/components/ui/Button";
import { RoomStatus } from "@waddle/shared";
import type { TimerState, StudyConfig } from "@waddle/shared";

interface StudyTimerProps {
  timerState: TimerState;
  studyConfig: StudyConfig;
  roomStatus: RoomStatus;
  isHost: boolean;
  onEndEarly: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function StudyTimer({
  timerState,
  studyConfig,
  roomStatus,
  isHost,
  onEndEarly,
}: StudyTimerProps) {
  const isStudying = roomStatus === RoomStatus.STUDYING;
  const isOnBreak = roomStatus === RoomStatus.BREAK;

  const totalSeconds = isStudying
    ? studyConfig.studyDurationMinutes * 60
    : studyConfig.breakDurationMinutes * 60;

  const elapsed = totalSeconds - timerState.secondsRemaining;
  const progress = totalSeconds > 0 ? Math.min(elapsed / totalSeconds, 1) : 0;

  const totalCycles = studyConfig.totalCycles;
  const sessionNumber = timerState.sessionNumber;

  if (!isStudying && !isOnBreak) return null;

  return (
    <div className="bg-background-card border border-white/10 rounded-2xl p-6 text-center">
      {/* Phase badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-5 ${
          isStudying
            ? "bg-accent/15 text-accent border border-accent/25"
            : "bg-primary/15 text-primary border border-primary/25"
        }`}
      >
        <Timer className="w-4 h-4" />
        {isStudying ? "Study Phase" : "Break Time"}
        {totalCycles && (
          <span className="opacity-70">— Cycle {sessionNumber} of {totalCycles}</span>
        )}
      </div>

      {/* Time display */}
      <div
        className={`text-7xl sm:text-8xl font-display font-extrabold tabular-nums mb-3 ${
          isStudying ? "text-white" : "text-primary"
        }`}
      >
        {formatTime(timerState.secondsRemaining)}
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/8 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isStudying ? "bg-accent" : "bg-primary"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <p className="text-white/40 text-sm mb-4">
        {isStudying
          ? "Stay focused. Your goose is watching. 🪿"
          : "Rest up — the Game Hub is open below!"}
      </p>

      {isHost && isStudying && (
        <Button
          variant="ghost"
          size="sm"
          className="text-white/40 hover:text-white/70"
          onClick={onEndEarly}
          leftIcon={<Square className="w-3.5 h-3.5" />}
        >
          End session early
        </Button>
      )}
    </div>
  );
}
