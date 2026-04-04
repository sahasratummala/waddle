import { Users, Crown, Zap, Play } from "lucide-react";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Button from "@/components/ui/Button";
import { RoomStatus } from "@waddle/shared";
import type { Participant } from "@waddle/shared";

interface ParticipantListProps {
  participants: Participant[];
  currentUserId: string | undefined;
  isHost: boolean;
  roomStatus: RoomStatus;
  onStartStudy: () => void;
}

export default function ParticipantList({
  participants,
  currentUserId,
  isHost,
  roomStatus,
  onStartStudy,
}: ParticipantListProps) {
  return (
    <div className="bg-background-card border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-secondary" />
        <span className="text-sm font-medium text-white">
          Participants ({participants.length})
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {participants.map((p) => (
          <div
            key={p.userId}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
              p.userId === currentUserId
                ? "bg-primary/8 border border-primary/20"
                : "bg-white/4"
            }`}
          >
            <GooseAvatar stage={p.gooseStage} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-white text-sm font-medium truncate">
                  {p.username}
                  {p.userId === currentUserId && (
                    <span className="text-white/30 font-normal"> (you)</span>
                  )}
                </span>
                {p.isHost && <Crown className="w-3.5 h-3.5 text-primary shrink-0" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-white/40">
                <Zap className="w-3 h-3 text-primary" />
                {p.pointsEarned} pts this session
              </div>
            </div>
          </div>
        ))}
      </div>

      {isHost && roomStatus === RoomStatus.LOBBY && (
        <div className="pt-3 border-t border-white/10">
          <Button
            variant="primary"
            fullWidth
            size="sm"
            onClick={onStartStudy}
            leftIcon={<Play className="w-4 h-4" />}
          >
            Start Session
          </Button>
        </div>
      )}
    </div>
  );
}
