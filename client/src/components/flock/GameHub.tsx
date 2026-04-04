import { Gamepad2, Lock } from "lucide-react";

// Placeholder component — actual game implementations go in gameHandlers.ts / game sub-components
// This hub is shown to all players whenever the room enters BREAK status.

interface Game {
  id: "MAZE" | "BREADCRUMB" | "PICTIONARY";
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
    desc: "Tap as fast as you can to snatch the breadcrumb.",
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
  /** Called by host when they want to launch a specific game (wired up by Christina). */
  onLaunchGame?: (gameId: Game["id"]) => void;
}

export default function GameHub({ isHost, onLaunchGame }: GameHubProps) {
  return (
    <div className="bg-background-card border border-white/10 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-secondary/15 flex items-center justify-center">
          <Gamepad2 className="w-4 h-4 text-secondary" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm leading-tight">Game Hub</h3>
          <p className="text-white/40 text-xs">
            {isHost
              ? "Pick a game for your flock to play!"
              : "Waiting for the host to pick a game…"}
          </p>
        </div>
      </div>

      {/* Game cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {GAMES.map((game) => (
          <div
            key={game.id}
            className="flex flex-col gap-2 p-3 rounded-xl border border-white/10 bg-background-surface hover:border-white/20 transition-colors"
          >
            <span className="text-2xl">{game.emoji}</span>
            <div>
              <p className="text-white text-sm font-medium leading-tight">{game.name}</p>
              <p className="text-white/45 text-xs mt-0.5 leading-snug">{game.desc}</p>
            </div>

            {isHost ? (
              <button
                onClick={() => onLaunchGame?.(game.id)}
                className="mt-auto w-full py-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-medium transition-colors"
              >
                Launch
              </button>
            ) : (
              <div className="mt-auto flex items-center gap-1 text-white/25 text-xs">
                <Lock className="w-3 h-3" />
                Host picks
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-white/20 text-xs text-center mt-4">
        Games are only available during breaks 🪿
      </p>
    </div>
  );
}
