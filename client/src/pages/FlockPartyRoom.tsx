import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Users, Play, Square, Crown, Copy, Check, LogOut,
  Timer, Zap
} from "lucide-react";
import { useFlockStore } from "@/store/flockStore";
import { useAuthStore } from "@/store/authStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Button from "@/components/ui/Button";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { RoomStatus, StudyStyle, GameType } from "@waddle/shared";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const STYLE_LABELS: Record<StudyStyle, string> = {
  [StudyStyle.POMODORO]: "Pomodoro",
  [StudyStyle.FLOWMODORO]: "Flowmodoro",
  [StudyStyle.TIME_BLOCKING]: "Time Blocking",
  [StudyStyle.CUSTOM]: "Custom",
};

const GAME_LABELS: Record<GameType, string> = {
  [GameType.MAZE]: "Goose Maze",
  [GameType.BREADCRUMB]: "Breadcrumb Tap",
  [GameType.PICTIONARY]: "Pictionary",
};

export default function FlockPartyRoom() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { room, timerState, currentGame, leaveRoom, startStudy } = useFlockStore();
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!roomCode) navigate("/flock-party");
  }, [roomCode, navigate]);

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
  const isInGame = room.status === RoomStatus.GAME;

  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-extrabold text-white">
              Flock Room
            </h1>
            {/* Room code badge */}
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
                isStudying ? "bg-accent" : isOnBreak ? "bg-primary" : "bg-white/30"
              }`}
            />
            {isStudying
              ? "Studying"
              : isOnBreak
              ? "On break"
              : isInGame
              ? "Playing game"
              : "In lobby"}
            {" · "}
            {STYLE_LABELS[room.studyStyle]}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Participants */}
        <div className="lg:col-span-1">
          <Card variant="default" padding="md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-secondary" />
                Participants ({room.participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {room.participants.map((p) => (
                  <div
                    key={p.userId}
                    className={`flex items-center gap-3 p-2.5 rounded-lg ${
                      p.userId === user?.id ? "bg-primary/8 border border-primary/20" : "bg-white/4"
                    }`}
                  >
                    <GooseAvatar stage={p.gooseStage} size="xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white text-sm font-medium truncate">
                          {p.username}
                        </span>
                        {p.isHost && (
                          <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/40">
                        <Zap className="w-3 h-3 text-primary" />
                        {p.pointsEarned} pts
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {isHost && room.status === RoomStatus.LOBBY && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <Button
                    variant="primary"
                    fullWidth
                    onClick={handleStartStudy}
                    leftIcon={<Play className="w-4 h-4" />}
                    size="sm"
                  >
                    Start Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Timer + Game area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Timer */}
          {(isStudying || isOnBreak) && (
            <Card variant="glass" padding="lg">
              <div className="text-center">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                    isStudying
                      ? "bg-accent/15 text-accent border border-accent/25"
                      : "bg-primary/15 text-primary border border-primary/25"
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  {isStudying ? "Study Phase" : "Break Time"}
                  {" — "}Session {timerState.sessionNumber}
                </div>

                <div
                  className={`text-7xl sm:text-8xl font-display font-extrabold mb-2 tabular-nums ${
                    isStudying ? "text-white" : "text-primary"
                  }`}
                >
                  {formatTime(timerState.secondsRemaining)}
                </div>

                <p className="text-white/40 text-sm">
                  {isStudying ? "Stay focused. Your goose is watching." : "Rest up! A game is starting soon."}
                </p>

                {isHost && isStudying && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-4 text-white/40"
                    leftIcon={<Square className="w-4 h-4" />}
                  >
                    End session early
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Lobby state */}
          {room.status === RoomStatus.LOBBY && (
            <Card variant="glass" padding="lg">
              <div className="text-center py-6">
                <div className="flex justify-center gap-3 mb-4">
                  {room.participants.slice(0, 3).map((p) => (
                    <GooseAvatar key={p.userId} stage={p.gooseStage} size="sm" animated />
                  ))}
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-2">
                  {isHost ? "Ready to start?" : "Waiting for host to start..."}
                </h2>
                <p className="text-white/50 text-sm mb-2">
                  {room.participants.length} goose{room.participants.length !== 1 ? "s" : ""} in the flock
                </p>
                <p className="text-white/35 text-xs">
                  Share the code <span className="font-mono text-white/60">{roomCode}</span> to invite friends
                </p>

                {isHost && (
                  <Button
                    variant="primary"
                    className="mt-5"
                    onClick={handleStartStudy}
                    leftIcon={<Play className="w-4 h-4" />}
                  >
                    Start Study Session
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Game area */}
          {isInGame && currentGame && (
            <Card variant="glass" padding="lg">
              <div className="text-center py-4">
                <h2 className="text-2xl font-display font-bold text-white mb-2">
                  {GAME_LABELS[currentGame]}
                </h2>
                <p className="text-white/55 text-sm mb-6">Break time — let's play!</p>

                {currentGame === GameType.BREADCRUMB && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-white/60 text-sm">Tap the breadcrumbs as fast as you can!</p>
                    <div className="relative w-64 h-64 bg-background-surface rounded-2xl border border-white/10">
                      {/* Simplified breadcrumb game placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button
                          className="w-14 h-14 rounded-full bg-primary hover:bg-primary-500 active:scale-90 transition-transform shadow-lg shadow-primary/30 text-2xl"
                          style={{
                            top: `${Math.random() * 70 + 15}%`,
                            left: `${Math.random() * 70 + 15}%`,
                            position: "absolute",
                          }}
                        >
                          🍞
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {currentGame === GameType.MAZE && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-white/60 text-sm">Navigate your goose through the maze!</p>
                    <div className="w-64 h-64 bg-background-surface rounded-2xl border border-white/10 flex items-center justify-center">
                      <p className="text-white/30 text-sm">Maze rendering...</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {["↑", "←", "↓", "→"].map((dir, i) => (
                        <button
                          key={dir}
                          className={`w-12 h-12 rounded-xl bg-background-card border border-white/15 text-white text-lg hover:bg-white/10 active:scale-95 transition-all ${i === 0 ? "col-start-2" : i === 1 ? "col-start-1" : i === 2 ? "col-start-2" : "col-start-3"}`}
                        >
                          {dir}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentGame === GameType.PICTIONARY && (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-white/60 text-sm">Draw the word — your flock guesses it!</p>
                    <canvas
                      width={320}
                      height={240}
                      className="bg-white rounded-xl cursor-crosshair"
                    />
                    <input
                      type="text"
                      placeholder="Type your guess..."
                      className="input-base max-w-xs"
                    />
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Study config summary */}
          <Card variant="default" padding="md">
            <h3 className="text-sm font-medium text-white/60 mb-3">Session Config</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-display font-bold text-white">
                  {room.studyConfig.studyDurationMinutes}m
                </p>
                <p className="text-xs text-white/40">Study</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-white">
                  {room.studyConfig.breakDurationMinutes}m
                </p>
                <p className="text-xs text-white/40">Break</p>
              </div>
              <div>
                <p className="text-lg font-display font-bold text-primary">
                  {STYLE_LABELS[room.studyStyle]}
                </p>
                <p className="text-xs text-white/40">Style</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
