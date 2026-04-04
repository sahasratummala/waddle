import React, { useEffect, useState } from "react"; // Added React import to clear JSX errors
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

// --- FIXED GAME IMPORTS ---
// Stepping out of 'pages' to 'src' then into 'components/games'
import MazeGame from "../components/games/MazeGame";
import BreadcrumbGame from "../components/games/BreadcrumbGame";
import PictionaryGame from "../components/games/PictionaryGame";

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
  
  const { 
    room, timerState, messages, joinRoom, 
    leaveRoom, startStudy, sendMessage,
    currentGame, launchGame 
  } = useFlockStore();

  const [codeCopied, setCodeCopied] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);

  useEffect(() => {
    if (!room && roomCode) {
      joinRoom(roomCode).catch(() => navigate("/flock-party"));
    }
  }, [room, roomCode, joinRoom, navigate]);

  useEffect(() => {
  const socket = getSocket();
  if (!socket) return;

  // This is the missing link! 
  // It catches the server's broadcast and updates the store for everyone.
  socket.on("game:started", ({ game }) => {
    console.log("Game starting for everyone:", game);
    useFlockStore.setState({ currentGame: game as any });
  });

  // Clean up the listener when the component unmounts
  return () => {
    socket.off("game:started");
  };
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

  const renderBreakContent = () => {
    const socket = getSocket();

    // 1. If no game is active, show the Hub
    if (!currentGame) {
      return (
        <GameHub
          isHost={isHost}
          onLaunchGame={(gameId) => {
            if (socket && roomCode) {
              // Direct emit to bypass any store logic issues
              socket.emit("game:start", { roomCode, game: gameId });
              // Manually set local state so the host's screen switches immediately
              useFlockStore.setState({ currentGame: gameId as any });
            }
          }}
        />
      );
    }

    // 2. If a game IS active, we MUST pass these props or it won't load
    if (!socket || !user || !roomCode) return <div>Loading Socket...</div>;

    const gameProps = {
      socket,
      roomCode,
      userId: user.id,
      username: user.username || "Goose",
    };

    if (currentGame === "MAZE") {
      return <MazeGame {...gameProps} onGameEnd={() => useFlockStore.setState({ currentGame: null })} />;
    }
    if (currentGame === "BREADCRUMB") {
      return <BreadcrumbGame {...gameProps} onGameEnd={() => useFlockStore.setState({ currentGame: null })} />;
    }
    if (currentGame === "PICTIONARY") {
      return <PictionaryGame {...gameProps} onGameEnd={() => useFlockStore.setState({ currentGame: null })} />;
    }

    return null;
  };

  if (!room) return null;

  const isHost = room.hostId === user?.id;
  const isStudying = room.status === RoomStatus.STUDYING;
  const isOnBreak = room.status === RoomStatus.BREAK;
  const isEnded = room.status === RoomStatus.ENDED || !!completionData;

  return (
    <div className="flex flex-col gap-6 max-w-4xl animate-in">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-extrabold text-white">Flock Room</h1>
            <button onClick={handleCopyCode} className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-background-surface border border-white/15 text-sm font-mono text-white">
              {codeCopied ? <Check className="w-3.5 h-3.5 text-accent" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
              {roomCode}
            </button>
          </div>
          <p className="text-white/50 text-sm">
            {isStudying ? "Studying" : isOnBreak ? "On break" : "In lobby"} · {STYLE_LABELS[room.studyStyle]}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLeave} leftIcon={<LogOut className="w-4 h-4" />}>
          Leave
        </Button>
      </div>

      {!isEnded && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Participants List */}
          <div className="lg:col-span-1">
            <ParticipantList 
              participants={room.participants} 
              currentUserId={user?.id} 
              isHost={isHost} 
              roomStatus={room.status} 
              onStartStudy={handleStartStudy} 
            />
          </div>

          {/* Right: Timer / Game Hub / Chat */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Lobby UI */}
            {room.status === RoomStatus.LOBBY && (
              <div className="bg-background-card border border-white/10 rounded-2xl p-6 text-center">
                <h2 className="text-xl font-display font-bold text-white mb-4">
                  {isHost ? "Ready to start?" : "Waiting for host..."}
                </h2>
                {isHost && (
                  <Button onClick={handleStartStudy} leftIcon={<Play className="w-4 h-4" />}>
                    Start Study Session
                  </Button>
                )}
              </div>
            )}

            {/* Timer: Visible during study, or break if no game is running */}
            {(isStudying || (isOnBreak && !currentGame)) && (
              <StudyTimer 
                timerState={timerState} 
                studyConfig={room.studyConfig} 
                roomStatus={room.status} 
                isHost={isHost} 
                onEndEarly={handleEndEarly} 
              />
            )}

            {/* Games or Hub: Visible during breaks */}
            {isOnBreak && renderBreakContent()}

            <ChatPanel 
              messages={messages} 
              currentUserId={user?.id} 
              onSendMessage={sendMessage} 
            />
          </div>
        </div>
      )}
      
      {/* Completion UI */}
      {isEnded && completionData && (
        <CompletionScreen 
          completionData={completionData} 
          participants={room.participants} 
          onLeave={handleLeave} 
        />
      )}
    </div>
  );
}