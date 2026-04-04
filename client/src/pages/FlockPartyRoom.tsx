import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Copy, Check, LogOut, Play } from "lucide-react";
import { useFlockStore } from "@/store/flockStore";
import { useAuthStore } from "@/store/authStore";
import GooseAvatar from "@/components/goose/GooseAvatar";
import Button from "@/components/ui/Button";
import { RoomStatus, StudyStyle } from "@waddle/shared";
import { getSocket } from "@/lib/socket";

import StudyTimer from "@/components/flock/StudyTimer";
import ParticipantList from "@/components/flock/ParticipantList";
import ChatPanel from "@/components/flock/ChatPanel";
import GameHub from "@/components/flock/GameHub";
import CompletionScreen from "@/components/flock/CompletionScreen";

import MazeGame from "../components/games/MazeGame";
import BreadcrumbGame from "../components/games/BreadcrumbGame";
import PictionaryGame from "../components/games/PictionaryGame";

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

  const {
    room, timerState, messages, joinRoom,
    leaveRoom, startStudy, sendMessage,
    currentGame, gameData, completionData,
  } = useFlockStore();

  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    if (!room && roomCode) {
      joinRoom(roomCode).catch(() => navigate("/flock-party"));
    }
  }, [room, roomCode, joinRoom, navigate]);

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

  const renderBreakContent = () => {
    const socket = getSocket();
    if (!currentGame) {
      return (
        <GameHub
          isHost={isHost}
          onLaunchGame={(gameId) => {
            if (socket && roomCode) {
              socket.emit("game-start", { roomCode, gameType: gameId });
            }
          }}
        />
      );
    }
    if (!socket || !user || !roomCode) return <div className="text-forest/50 text-sm">Loading...</div>;
    const gameProps = { socket, roomCode, userId: user.id, username: user.username || "Goose" };
    const handlePointsEarned = (points: number) => {
      useFlockStore.setState((state) => {
        if (!state.room) return {};
        return {
          room: {
            ...state.room,
            participants: state.room.participants.map((p) =>
              p.userId === user.id ? { ...p, pointsEarned: (p.pointsEarned ?? 0) + points } : p
            ),
          },
        };
      });
    };
    const mazeData = gameData as { seed?: number; size?: number } | null;
    if (currentGame === "MAZE") return <MazeGame {...gameProps} seed={mazeData?.seed} size={mazeData?.size} onGameEnd={() => useFlockStore.setState({ currentGame: null })} />;
    if (currentGame === "BREADCRUMB") return <BreadcrumbGame {...gameProps} onPointsEarned={handlePointsEarned} onGameEnd={() => useFlockStore.setState({ currentGame: null })} />;
    if (currentGame === "PICTIONARY") return <PictionaryGame {...gameProps} onGameEnd={() => useFlockStore.setState({ currentGame: null })} />;
    return null;
  };

  if (!room) return null;

  const isHost = room.hostId === user?.id;
  const isStudying = room.status === RoomStatus.STUDYING;
  const isOnBreak = room.status === RoomStatus.BREAK;
  const isEnded = room.status === RoomStatus.ENDED || !!completionData;

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl font-black text-forest">Flock Room</h1>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white shadow-card border-2 border-forest/10 text-sm font-mono font-bold text-forest hover:border-avocado/30 transition-colors"
              >
                {codeCopied
                  ? <><Check className="w-3.5 h-3.5 text-avocado" />{roomCode}</>
                  : <><Copy className="w-3.5 h-3.5 text-forest/40" />{roomCode}</>
                }
              </button>
            </div>
            <p className="text-forest/50 text-sm font-medium">
              {isStudying ? "Studying" : isOnBreak ? "On break" : "In lobby"} · {STYLE_LABELS[room.studyStyle]}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeave}
            leftIcon={<LogOut className="w-4 h-4" />}
            className="text-forest/50 hover:text-forest"
          >
            Leave
          </Button>
        </div>

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

            {/* Right: Timer / Game / Chat */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              {/* Lobby */}
              {room.status === RoomStatus.LOBBY && (
                <div className="card p-6 text-center">
                  <h2 className="font-display text-xl font-black text-forest mb-4">
                    {isHost ? "Ready to start?" : "Waiting for host..."}
                  </h2>
                  {isHost && (
                    <Button
                      variant="primary"
                      onClick={handleStartStudy}
                      leftIcon={<Play className="w-4 h-4" />}
                      className="rounded-xl font-black"
                    >
                      Start Study Session
                    </Button>
                  )}
                </div>
              )}

              {(isStudying || (isOnBreak && !currentGame)) && (
                <StudyTimer
                  timerState={timerState}
                  studyConfig={room.studyConfig}
                  roomStatus={room.status}
                  isHost={isHost}
                  onEndEarly={handleEndEarly}
                />
              )}

              {isOnBreak && renderBreakContent()}

              <ChatPanel
                messages={messages}
                currentUserId={user?.id}
                onSendMessage={sendMessage}
              />
            </div>
          </div>
        )}

        {isEnded && (
          <CompletionScreen
            completionData={completionData ?? { totalSessions: 1, pointsPerSession: 0 }}
            participants={room.participants}
            currentUserId={user?.id}
            onLeave={handleLeave}
          />
        )}
      </div>
    </div>
  );
}