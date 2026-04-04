import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Copy, Check, LogOut, Play } from "lucide-react";
import { useFlockStore } from "@/store/flockStore";
import { useAuthStore } from "@/store/authStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Button from "@/components/ui/Button";
import { RoomStatus, StudyStyle } from "@waddle/shared";
import { getSocket } from "@/lib/socket";

// Flock-specific components
import StudyTimer from "@/components/flock/StudyTimer";
import ParticipantList from "@/components/flock/ParticipantList";
import ChatPanel from "@/components/flock/ChatPanel";
import GameHub from "@/components/flock/GameHub";
import CompletionScreen from "@/components/flock/CompletionScreen";

interface CompletionData {
  totalSessions: number;
  pointsPerSession: number;
}

const STYLE_LABELS: Record<StudyStyle, string> = {
  [StudyStyle.POMODORO]: "Pomodoro",
  [StudyStyle.FLOWMODORO]: "Flowmodoro",
  [StudyStyle.TIME_BLOCKING]: "Time Blocking",
  [StudyStyle.CUSTOM]: "Custom",
};

export default function FlockPartyRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Notice we pull joinRoom out of the store now
  const { room, timerState, messages, joinRoom, leaveRoom, startStudy, sendMessage } = useFlockStore();

  const [codeCopied, setCodeCopied] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);

  // Auto-join logic if someone pastes a room code link directly into a new tab
  useEffect(() => {
    if (!room && roomCode) {
      joinRoom(roomCode).catch(() => {
        // If joining fails (bad code or not logged in), kick them back to safety
        navigate("/flock-party");
      });
    }
  }, [room, roomCode, joinRoom, navigate]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = (data: CompletionData) => {
      setCompletionData(data);
    };
    socket.on("study-complete", handler);
    return () => { socket.off("study-complete", handler); };
  }, []);

  function handleCopyCode() {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }

  function handleLeave() {
    leaveRoom();
    navigate("/flock-party");
  }

  function handleStartStudy() {
    if (room) startStudy(room.studyConfig);
  }

  function handleEndEarly() {
    const socket = getSocket();
    if (socket && roomCode) {
      socket.emit("study-complete", { roomCode: roomCode.toUpperCase() });
    }
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-white/60">Joining the flock...</p>
        </div>
      </div>
    );
  }

  const isHost = room.hostId === user?.id;
  const isStudying = room.status === RoomStatus.STUDYING;
  const isOnBreak = room.status === RoomStatus.BREAK;
  const isEnded = room.status === RoomStatus.ENDED || !!completionData;

  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-extrabold text-white">Flock Room</h1>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background-surface border border-white/15 hover:border-white/30 transition-colors text-sm font-mono text-white"
            >
              {codeCopied ? (
                <><Check className="w-3.5 h-3.5 text-accent" />{roomCode}</>
              ) : (
                <><Copy className="w-3.5 h-3.5 text-white/40" />{roomCode}</>
              )}
            </button>
          </div>
          <p className="text-white/50 text-sm flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isStudying
                  ? "bg-accent"
                  : isOnBreak
                  ? "bg-primary"
                  : isEnded
                  ? "bg-white/20"
                  : "bg-white/30"
              }`}
            />
            {isStudying
              ? "Studying"
              : isOnBreak
              ? "On break"
              : isEnded
              ? "Session ended"
              : "In lobby"}
            {" · "}
            {STYLE_LABELS[room.studyStyle]}
            {room.studyConfig.totalCycles && (
              <span className="text-white/30">
                {" · "}{room.studyConfig.totalCycles} rounds
              </span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLeave}
          leftIcon={<LogOut className="w-4 h-4" />}
          className="text-white/50 hover:text-white"
        >
          Leave
        </Button>
      </div>

      {/* Completion screen — shown when session is done */}
      {isEnded && completionData && (
        <CompletionScreen
          completionData={completionData}
          participants={room.participants}
          onLeave={handleLeave}
        />
      )}

      {/* Main layout (hidden after completion) */}
      {!isEnded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Participants */}
          <div className="lg:col-span-1">
            <ParticipantList
              participants={room.participants}
              currentUserId={user?.id}
              isHost={isHost}
              roomStatus={room.status}
              onStartStudy={handleStartStudy}
            />
          </div>

          {/* Right: Timer + Game Hub + Chat */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Lobby state */}
            {room.status === RoomStatus.LOBBY && (
              <div className="bg-background-card border border-white/10 rounded-2xl p-6">
                <div className="text-center py-4">
                  <div className="flex justify-center gap-3 mb-4">
                    {room.participants.slice(0, 3).map((p) => (
                      <GooseAvatar key={p.userId} stage={p.gooseStage} size="sm" animated />
                    ))}
                  </div>
                  <h2 className="text-xl font-display font-bold text-white mb-2">
                    {isHost ? "Ready to start?" : "Waiting for host to start..."}
                  </h2>
                  <p className="text-white/50 text-sm mb-1">
                    {room.participants.length} goose{room.participants.length !== 1 ? "s" : ""} in the flock
                  </p>
                  <p className="text-white/35 text-xs mb-5">
                    Share the code{" "}
                    <span className="font-mono text-white/60">{roomCode}</span>{" "}
                    to invite friends
                  </p>
                  {isHost && (
                    <Button
                      variant="primary"
                      onClick={handleStartStudy}
                      leftIcon={<Play className="w-4 h-4" />}
                    >
                      Start Study Session
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Study timer — shown while studying or on break */}
            {(isStudying || isOnBreak) && (
              <StudyTimer
                timerState={timerState}
                studyConfig={room.studyConfig}
                roomStatus={room.status}
                isHost={isHost}
                onEndEarly={handleEndEarly}
              />
            )}

            {/* Game Hub — only shown during breaks */}
            {isOnBreak && (
              <GameHub
                isHost={isHost}
                onLaunchGame={() => {
                  // Christina wires this up in gameHandlers.ts
                }}
              />
            )}

            {/* Session config strip */}
            {!isOnBreak && !isEnded && (
              <div className="bg-background-card border border-white/10 rounded-2xl p-4">
                <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                  Session Config
                </h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-lg font-display font-bold text-white">
                      {room.studyConfig.studyDurationMinutes >= 60
                        ? `${room.studyConfig.studyDurationMinutes / 60}h`
                        : `${room.studyConfig.studyDurationMinutes}m`}
                    </p>
                    <p className="text-xs text-white/40">Study</p>
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-white">
                      {room.studyConfig.breakDurationMinutes >= 60
                        ? `${room.studyConfig.breakDurationMinutes / 60}h`
                        : `${room.studyConfig.breakDurationMinutes}m`}
                    </p>
                    <p className="text-xs text-white/40">Break</p>
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-white">
                      {room.studyConfig.totalCycles ?? "∞"}
                    </p>
                    <p className="text-xs text-white/40">Rounds</p>
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold text-primary">
                      {STYLE_LABELS[room.studyStyle]}
                    </p>
                    <p className="text-xs text-white/40">Style</p>
                  </div>
                </div>
              </div>
            )}

            {/* Chat */}
            <ChatPanel
              messages={messages}
              currentUserId={user?.id}
              onSendMessage={sendMessage}
            />
          </div>
        </div>
      )}
    </div>
  );
}