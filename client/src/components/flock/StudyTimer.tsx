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

  const totalCycles = (studyConfig as any).totalCycles;
  const sessionNumber = timerState.sessionNumber;

  if (!isStudying && !isOnBreak) return null;

  return (
    <div className="card p-6 text-center">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold mb-5 border-2 ${isStudying
            ? "bg-ocean/10 text-ocean border-ocean/20"
            : "bg-avocado/10 text-avocado border-avocado/20"
          }`}
      >
        <Timer className="w-4 h-4" />
        {isStudying ? "Study Phase" : "Break Time"}
        {totalCycles && (
          <span className="opacity-60 font-semibold">
            {" "}Cycle {sessionNumber} of {totalCycles}
          </span>
        )}
      </div>

      <div
        className={`text-7xl sm:text-8xl font-display font-black tabular-nums mb-3 ${isStudying ? "text-forest" : "text-avocado"
          }`}
      >
        {formatTime(timerState.secondsRemaining)}
      </div>

      <div className="w-full h-2 bg-forest/10 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isStudying ? "bg-ocean" : "bg-avocado"
            }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <p className="text-forest/40 text-sm mb-4 font-medium">
        {isStudying
          ? "Stay focused. Your goose is watching."
          : "Rest up. The Game Hub is open below!"}
      </p>

      {isHost && isStudying && (
        <Button
          variant="ghost"
          size="sm"
          className="text-forest/40 hover:text-forest"
          onClick={onEndEarly}
          leftIcon={<Square className="w-3.5 h-3.5" />}
        >
          End session early
        </Button>
      )}
    </div>
  );
}