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
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-ocean" />
        <span className="text-sm font-bold text-forest">
          Participants ({participants.length})
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {participants.map((p) => (
          <div
            key={p.userId}
            className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${p.userId === currentUserId
                ? "bg-avocado/8 border-2 border-avocado/20"
                : "bg-cream/50"
              }`}
          >
            <GooseAvatar stage={p.gooseStage} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-forest text-sm font-bold truncate">
                  {p.username}
                  {p.userId === currentUserId && (
                    <span className="text-forest/30 font-normal"> (you)</span>
                  )}
                </span>
                {p.isHost && <Crown className="w-3.5 h-3.5 text-avocado shrink-0" />}
              </div>
              <div className="flex items-center gap-1 text-xs text-forest/40">
                <Zap className="w-3 h-3 text-avocado" />
                {p.pointsEarned} pts this session
              </div>
            </div>
          </div>
        ))}
      </div>

      {isHost && roomStatus === RoomStatus.LOBBY && (
        <div className="pt-3 border-t-2 border-forest/8">
          <Button
            variant="primary"
            fullWidth
            size="sm"
            onClick={onStartStudy}
            leftIcon={<Play className="w-4 h-4" />}
            className="rounded-xl font-black"
          >
            Start Session
          </Button>
        </div>
      )}
    </div>
  );
}