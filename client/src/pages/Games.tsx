import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { GameType } from "@waddle/shared";

const GAMES = [
    {
        type: GameType.MAZE,
        label: "Goose Maze",
        description: "Navigate your goose through the maze as fast as you can.",
        emoji: "🌀",
    },
    {
        type: GameType.BREADCRUMB,
        label: "Breadcrumb Tap",
        description: "Tap the breadcrumbs faster than everyone else.",
        emoji: "🍞",
    },
    {
        type: GameType.PICTIONARY,
        label: "Pictionary",
        description: "Draw goose-themed objects and let AI guess what you drew.",
        emoji: "🎨",
    },
];

export default function Games() {
    const [activeGame, setActiveGame] = useState<GameType | null>(null);

    return (
        <div className="max-w-2xl mx-auto animate-in">
            <div className="mb-6 flex items-center gap-3">
                <Gamepad2 className="w-8 h-8 text-olive" />
                <div>
                    <h1 className="text-3xl font-display font-extrabold text-forest">Games</h1>
                    <p className="text-sm text-forest/50">Play solo or during a Flock Party break.</p>
                </div>
            </div>

            {!activeGame && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {GAMES.map((game) => (
                        <button
                            key={game.type}
                            onClick={() => setActiveGame(game.type)}
                            className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-forest/10 bg-white hover:border-olive/30 hover:bg-olive/5 transition-all text-center group"
                        >
                            <span className="text-4xl">{game.emoji}</span>
                            <h2 className="font-display font-bold text-forest text-sm group-hover:text-olive transition-colors">
                                {game.label}
                            </h2>
                            <p className="text-xs text-forest/50">{game.description}</p>
                        </button>
                    ))}
                </div>
            )}

            {activeGame === GameType.MAZE && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="font-display font-bold text-forest text-lg">Goose Maze</h2>
                        <button onClick={() => setActiveGame(null)} className="text-sm text-forest/50 hover:text-forest">← Back</button>
                    </div>
                    <div className="w-64 h-64 bg-cream/30 rounded-2xl border border-forest/10 flex items-center justify-center">
                        <p className="text-forest/30 text-sm">Maze coming soon</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {["↑", "←", "↓", "→"].map((dir, i) => (
                            <button
                                key={dir}
                                className={`w-12 h-12 rounded-xl bg-white border border-forest/15 text-forest text-lg hover:bg-avocado/10 active:scale-95 transition-all ${i === 0 ? "col-start-2" : i === 1 ? "col-start-1" : i === 2 ? "col-start-2" : "col-start-3"}`}
                            >
                                {dir}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activeGame === GameType.BREADCRUMB && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="font-display font-bold text-forest text-lg">Breadcrumb Tap</h2>
                        <button onClick={() => setActiveGame(null)} className="text-sm text-forest/50 hover:text-forest">← Back</button>
                    </div>
                    <div className="relative w-64 h-64 bg-cream/30 rounded-2xl border border-forest/10 flex items-center justify-center">
                        <button className="w-16 h-16 rounded-full bg-avocado hover:bg-avocado/80 active:scale-90 transition-transform text-3xl shadow-lg">
                            🍞
                        </button>
                    </div>
                    <p className="text-sm text-forest/50">Tap as fast as you can!</p>
                </div>
            )}

            {activeGame === GameType.PICTIONARY && (
                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center justify-between w-full">
                        <h2 className="font-display font-bold text-forest text-lg">Pictionary</h2>
                        <button onClick={() => setActiveGame(null)} className="text-sm text-forest/50 hover:text-forest">← Back</button>
                    </div>
                    <canvas
                        width={320}
                        height={240}
                        className="bg-white rounded-2xl border border-forest/10 cursor-crosshair"
                    />
                    <input
                        type="text"
                        placeholder="Type your guess..."
                        className="input-base max-w-xs text-sm"
                    />
                </div>
            )}
        </div>
    );
}