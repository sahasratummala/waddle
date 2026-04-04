import { Zap, LogOut } from "lucide-react";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Button from "@/components/ui/Button";
import type { Participant } from "@waddle/shared";

interface CompletionData {
  totalSessions: number;
  pointsPerSession: number;
}

interface CompletionScreenProps {
  completionData: CompletionData;
  participants: Participant[];
  onLeave: () => void;
}

export default function CompletionScreen({
  completionData,
  participants,
  onLeave,
}: CompletionScreenProps) {
  const totalPoints = completionData.totalSessions * completionData.pointsPerSession;

  // Sort participants by points earned descending
  const sorted = [...participants].sort((a, b) => b.pointsEarned - a.pointsEarned);

  return (
    <div className="bg-background-card border border-white/10 rounded-2xl p-6 text-center">
      <div className="flex justify-center gap-2 mb-4">
        {sorted.slice(0, 4).map((p) => (
          <GooseAvatar key={p.userId} stage={p.gooseStage} size="sm" animated />
        ))}
      </div>

      <h2 className="text-2xl font-display font-extrabold text-white mb-1">
        Session Complete! 🎉
      </h2>
      <p className="text-white/50 text-sm mb-5">
        Your flock powered through{" "}
        <span className="text-white font-medium">{completionData.totalSessions}</span>{" "}
        {completionData.totalSessions === 1 ? "cycle" : "cycles"}
      </p>

      {/* Points summary */}
      <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary/10 border border-primary/20 mb-5 inline-flex">
        <Zap className="w-5 h-5 text-primary" />
        <span className="text-primary font-display font-bold text-xl">
          +{totalPoints}
        </span>
        <span className="text-primary/70 text-sm">pts earned</span>
      </div>

      {/* Leaderboard */}
      {sorted.length > 0 && (
        <div className="flex flex-col gap-2 mb-5 text-left">
          <p className="text-white/40 text-xs font-medium uppercase tracking-wider text-center mb-1">
            Session leaderboard
          </p>
          {sorted.map((p, i) => (
            <div
              key={p.userId}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/4"
            >
              <span className="text-white/30 text-sm font-mono w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <GooseAvatar stage={p.gooseStage} size="xs" />
              <span className="flex-1 text-white text-sm truncate">{p.username}</span>
              <div className="flex items-center gap-1 text-xs text-primary">
                <Zap className="w-3 h-3" />
                {p.pointsEarned}
              </div>
            </div>
          ))}
        </div>
      )}

      <Button
        variant="outline"
        onClick={onLeave}
        leftIcon={<LogOut className="w-4 h-4" />}
      >
        Leave Room
      </Button>
    </div>
  );
}
