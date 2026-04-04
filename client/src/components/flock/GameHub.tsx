import React from "react"; // Add this line
import { Gamepad2, Lock } from "lucide-react";

// Use uppercase to match your store's GameType and Switcher logic
type GameId = "MAZE" | "BREADCRUMB" | "PICTIONARY";

interface Game {
  id: GameId;
  emoji: string;
  name: string;
  desc: string;
}

const GAMES: Game[] = [
  {
    id: "MAZE",
    emoji: "🌀",
    name: "Goose Maze",
    desc: "Race through the same maze. First goose out wins!",
  },
  {
    id: "BREADCRUMB",
    emoji: "🍞",
    name: "Breadcrumb Tap",
    desc: "Snatch the breadcrumb! Fastest tapper wins.",
  },
  {
    id: "PICTIONARY",
    emoji: "🎨",
    name: "Goose Pictionary",
    desc: "Draw a goose-themed word — the AI guesses first.",
  },
];

interface GameHubProps {
  isHost: boolean;
  // Required prop to ensure the buttons actually trigger a game launch
  onLaunchGame: (gameId: GameId) => void;
}

export default function GameHub({ isHost, onLaunchGame }: GameHubProps) {
  return (
    <div className="bg-background-card border border-white/10 rounded-2xl p-5 shadow-xl animate-in fade-in zoom-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-white font-display font-bold text-lg leading-tight">Game Hub</h3>
          <p className="text-white/40 text-xs">
            {isHost
              ? "Pick a game for your flock to play!"
              : "Waiting for the host to pick a game…"}
          </p>
        </div>
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className="flex flex-col gap-3 p-4 rounded-xl border border-white/5 bg-white/5 hover:border-white/20 transition-all hover:scale-[1.02]"
          >
            <span className="text-3xl">{game.emoji}</span>
            <div className="flex-grow">
              <p className="text-white text-sm font-bold leading-tight">{game.name}</p>
              <p className="text-white/45 text-xs mt-1 leading-snug">{game.desc}</p>
            </div>

            {isHost ? (
              <button
                onClick={() => onLaunchGame(game.id)}
                className="mt-2 w-full py-2 rounded-lg bg-primary text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
              >
                Launch
              </button>
            ) : (
              <div className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/5 text-white/20 text-[10px] font-medium border border-white/5">
                <Lock className="w-3 h-3" />
                HOST PICKS
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-white/10 text-[10px] text-center mt-5 uppercase tracking-widest font-bold">
        Break Games Active 🦢
      </p>
    </div>
  );
}