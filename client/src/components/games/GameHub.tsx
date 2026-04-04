import { useState } from "react";
import { Socket } from "socket.io-client";
import MazeGame from "./MazeGame";
import BreadcrumbGame from "./BreadcrumbGame";
import PictionaryGame from "./PictionaryGame";

type GameType = "maze" | "breadcrumb" | "pictionary";

interface GameHubProps {
  socket: Socket;
  roomCode: string;
  userId: string;
  username: string;
  isHost: boolean;
  breakDurationMs: number;
  onBreakEnd: () => void;
}

interface GameResult {
  game: GameType;
  winnerId?: string;
  winnerName?: string;
  rankings?: { userId: string; username: string; taps: number }[];
}

const GAME_META: Record<GameType, { label: string; emoji: string; description: string }> = {
  maze: {
    label: "Maze",
    emoji: "🌀",
    description: "Draw a path through the maze. First to finish wins!",
  },
  breadcrumb: {
    label: "Feed the Goose",
    emoji: "🍞",
    description: "Tap as fast as you can! Fastest tapper wins the breadcrumb.",
  },
  pictionary: {
    label: "Goose Pictionary",
    emoji: "🖼️",
    description: "One player draws a goose scene — AI tries to guess what it is!",
  },
};

export default function GameHub({
  socket,
  roomCode,
  userId,
  username,
  isHost,
  onBreakEnd,
}: GameHubProps) {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [results, setResults] = useState<GameResult[]>([]);
  const [phase, setPhase] = useState<"select" | "playing" | "done">("select");

  const startGame = (game: GameType) => {
    setSelectedGame(game);
    setPhase("playing");
    socket.emit("game:start", { roomCode, game });
  };

  const handleMazeEnd = (winnerId: string, winnerName: string) => {
    setResults((prev) => [...prev, { game: "maze", winnerId, winnerName }]);
    setPhase("done");
  };

  const handleBreadcrumbEnd = (rankings: { userId: string; username: string; taps: number }[]) => {
    setResults((prev) => [
      ...prev,
      { game: "breadcrumb", winnerId: rankings[0]?.userId, winnerName: rankings[0]?.username, rankings },
    ]);
    setPhase("done");
  };

  const handlePictionaryEnd = (winnerId: string, winnerName: string) => {
    setResults((prev) => [...prev, { game: "pictionary", winnerId, winnerName }]);
    setPhase("done");
  };

  const lastResult = results[results.length - 1];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-black text-gray-800">🎉 Break Time!</h2>
        <p className="text-gray-500 text-sm mt-1">Play a quick game while you rest</p>
      </div>

      {/* Game selection */}
      {phase === "select" && (
        <div className="space-y-3">
          {(Object.entries(GAME_META) as [GameType, typeof GAME_META[GameType]][]).map(
            ([type, meta]) => (
              <button
                key={type}
                onClick={() => isHost ? startGame(type) : undefined}
                disabled={!isHost}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left transition hover:scale-[1.01] active:scale-[0.99]"
                style={{
                  background: "#EEEDFE",
                  border: "1.5px solid #CECBF6",
                  cursor: isHost ? "pointer" : "default",
                  opacity: isHost ? 1 : 0.7,
                }}
              >
                <span className="text-3xl">{meta.emoji}</span>
                <div>
                  <p className="font-bold text-gray-800">{meta.label}</p>
                  <p className="text-sm text-gray-500">{meta.description}</p>
                </div>
              </button>
            )
          )}
          {!isHost && (
            <p className="text-center text-xs text-gray-400 mt-2">Waiting for the host to pick a game…</p>
          )}
        </div>
      )}

      {/* Active game */}
      {phase === "playing" && selectedGame && (
        <div className="w-full">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">{GAME_META[selectedGame].emoji}</span>
            <span className="font-bold text-gray-800">{GAME_META[selectedGame].label}</span>
          </div>

          {selectedGame === "maze" && (
            <MazeGame
              socket={socket}
              roomCode={roomCode}
              userId={userId}
              username={username}
              onGameEnd={handleMazeEnd}
            />
          )}

          {selectedGame === "breadcrumb" && (
            <BreadcrumbGame
              socket={socket}
              roomCode={roomCode}
              userId={userId}
              username={username}
              onGameEnd={handleBreadcrumbEnd}
            />
          )}

          {selectedGame === "pictionary" && (
            <PictionaryGame
              socket={socket}
              roomCode={roomCode}
              userId={userId}
              username={username}
              onGameEnd={handlePictionaryEnd}
            />
          )}
        </div>
      )}

      {/* Results + back to studying */}
      {phase === "done" && lastResult && (
        <div className="flex flex-col items-center gap-5">
          <div
            className="w-full text-center py-5 rounded-2xl"
            style={{ background: "#FAEEDA", border: "1.5px solid #FAC775" }}
          >
            <p className="text-4xl mb-2">🏆</p>
            <p className="font-black text-xl" style={{ color: "#BA7517" }}>
              {lastResult.winnerName} wins!
            </p>
            {lastResult.game === "breadcrumb" && lastResult.rankings && (
              <div className="mt-3 space-y-1 text-sm" style={{ color: "#854F0B" }}>
                {lastResult.rankings.slice(0, 3).map((r, i) => (
                  <p key={r.userId}>
                    {i + 1}. {r.username} — {r.taps} taps
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={() => { setPhase("select"); setSelectedGame(null); }}
              className="flex-1 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition"
              style={{ border: "1px solid #D3D1C7" }}
            >
              Play again
            </button>
            <button
              onClick={onBreakEnd}
              className="flex-1 py-3 rounded-xl font-bold text-white transition hover:opacity-90"
              style={{ background: "#7F77DD" }}
            >
              Back to studying →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
