import { Gamepad2, Lock } from "lucide-react";

type GameId = "MAZE" | "BREADCRUMB" | "PICTIONARY";

// Emojis removed from the interface
interface Game {
  id: GameId;
  name: string;
  desc: string;
}

// Emojis removed from the data array
const GAMES: Game[] = [
  { id: "MAZE", name: "Goose Maze", desc: "Race through the same maze. First goose out wins!" },
  { id: "BREADCRUMB", name: "Breadcrumb Tap", desc: "Snatch the breadcrumb! Fastest tapper wins." },
  { id: "PICTIONARY", name: "Goose Pictionary", desc: "Draw a goose-themed word. The AI guesses first." },
];

interface GameHubProps {
  isHost: boolean;
  onLaunchGame: (gameId: GameId) => void;
}

export default function GameHub({ isHost, onLaunchGame }: GameHubProps) {
  return (
    <div className="card p-5 animate-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-olive/10 flex items-center justify-center">
          <Gamepad2 className="w-5 h-5 text-olive" />
        </div>
        <div>
          <h3 className="font-display font-black text-forest text-lg leading-tight">Game Hub</h3>
          <p className="text-forest/40 text-xs font-medium">
            {isHost ? "Pick a game for your flock!" : "Waiting for the host to pick a game..."}
          </p>
        </div>
      </div>

      {/* Changed to a vertical flex column to stack them on top of each other */}
      <div className="flex flex-col gap-3">
        {GAMES.map((game) => (
          <div
            key={game.id}
            // Layout updated to align text on the left and buttons on the right
            className="flex items-center justify-between gap-4 p-4 rounded-2xl border-2 border-forest/10 bg-cream hover:border-olive/30 transition-all"
          >
            <div className="flex-1 text-left">
              <p className="text-forest text-sm font-black leading-tight">{game.name}</p>
              <p className="text-forest/45 text-xs mt-1 leading-relaxed font-medium">{game.desc}</p>
            </div>

            <div className="shrink-0">
              {isHost ? (
                <button
                  onClick={() => onLaunchGame(game.id)}
                  className="px-5 py-2.5 rounded-xl bg-olive text-white text-xs font-black hover:bg-olive/80 active:scale-95 transition-all shadow-sm"
                >
                  Launch
                </button>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-forest/5 text-forest/30 text-xs font-bold border-2 border-forest/8">
                  <Lock className="w-3 h-3" />
                  HOST PICKS
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-forest/20 text-xs text-center mt-4 uppercase tracking-widest font-bold">
        Break Games Active
      </p>
    </div>
  );
}
