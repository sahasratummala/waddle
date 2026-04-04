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
  currentUserId?: string;
  onLeave: () => void;
}

export default function CompletionScreen({
  completionData,
  participants,
  currentUserId,
  onLeave,
}: CompletionScreenProps) {
  const sorted = [...participants].sort((a, b) => b.pointsEarned - a.pointsEarned);
  const myPoints = sorted.find((p) => p.userId === currentUserId)?.pointsEarned
    ?? sorted[0]?.pointsEarned
    ?? 0;

  return (
    <div className="card p-6 text-center">
      <div className="flex justify-center gap-2 mb-4">
        {sorted.slice(0, 4).map((p) => (
          <GooseAvatar key={p.userId} stage={p.gooseStage} size="sm" animated />
        ))}
      </div>

      <h2 className="font-display text-2xl font-black text-forest mb-1">
        Session Complete!
      </h2>
      <p className="text-forest/50 text-sm mb-5 font-medium">
        Your flock powered through{" "}
        <span className="text-forest font-bold">{completionData.totalSessions}</span>{" "}
        {completionData.totalSessions === 1 ? "cycle" : "cycles"}
      </p>

      <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-avocado/10 border-2 border-avocado/20 mb-5 mx-auto w-fit">
        <Zap className="w-5 h-5 text-avocado" />
        <span className="text-avocado font-display font-black text-xl">+{myPoints}</span>
        <span className="text-avocado/70 text-sm font-semibold">pts earned</span>
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-col gap-2 mb-5 text-left">
          <p className="text-forest/40 text-xs font-bold uppercase tracking-wider text-center mb-1">
            Session leaderboard
          </p>
          {sorted.map((p, i) => (
            <div
              key={p.userId}
              className="flex items-center gap-3 px-3 py-2 rounded-xl bg-cream"
            >
              <span className="text-forest/30 text-sm font-mono w-5 text-right shrink-0">
                {i + 1}.
              </span>
              <GooseAvatar stage={p.gooseStage} size="xs" />
              <span className="flex-1 text-forest text-sm font-bold truncate">{p.username}</span>
              <div className="flex items-center gap-1 text-xs text-avocado font-bold">
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
        className="rounded-xl font-bold border-2 border-forest/20 text-forest"
      >
        Leave Room
      </Button>
    </div>
  );
}