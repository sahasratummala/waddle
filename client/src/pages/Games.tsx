import { useState } from "react";
import { Gamepad2, Compass, Wheat, PenLine } from "lucide-react";
import { GameType } from "@waddle/shared";
import { useAuthStore } from "@/store/authStore";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import BreadcrumbGame from "@/components/games/BreadcrumbGame";
import MazeGame from "@/components/games/MazeGame";
import PictionaryGame from "@/components/games/PictionaryGame";

const GAMES = [
    {
        type: GameType.MAZE,
        label: "Goose Maze",
        icon: Compass,
        description: "Navigate your goose through the maze as fast as you can.",
    },
    {
        type: GameType.BREADCRUMB,
        label: "Breadcrumb Tap",
        icon: Wheat,
        description: "Tap the breadcrumbs faster than everyone else.",
    },
    {
        type: GameType.PICTIONARY,
        label: "Pictionary",
        icon: PenLine,
        description: "Draw a goose-themed word while Gemini tries to guess it.",
    },
];

const SOLO_ROOM = "SOLO_GAME";

export default function Games() {
    const { user, session, refreshProfile } = useAuthStore();
    const [activeGame, setActiveGame] = useState<GameType | null>(null);
    const [socket, setSocket] = useState<ReturnType<typeof connectSocket> | null>(null);

    async function handleSelectGame(type: GameType) {
        if (type === GameType.BREADCRUMB) {
            const token = session?.access_token;
            if (!token) return;
            const s = connectSocket(token);
            setSocket(s);
        }
        setActiveGame(type);
    }

    function handleBack() {
        setActiveGame(null);
        if (socket) {
            disconnectSocket();
            setSocket(null);
        }
    }

    async function handlePointsEarned(points: number) {
        if (!session?.access_token) return;
        try {
            await fetch("/api/goose/game-reward", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ points }),
            });
            await refreshProfile();
        } catch {
            // Non-fatal — points display will sync on next login
        }
    }

    return (
        <div className="min-h-screen bg-cream">
            <div className="max-w-2xl mx-auto px-4 py-8 animate-in">
                <div className="mb-6 flex items-center gap-3">
                    <Gamepad2 className="w-8 h-8 text-olive" />
                    <div>
                        <h1 className="font-display text-3xl font-black text-forest">Games</h1>
                        <p className="text-sm text-forest/50 font-medium">Play solo or during a Flock Party break.</p>
                    </div>
                </div>

                {!activeGame && (
                    <div className="flex flex-col gap-4">
                        {GAMES.map((game) => {
                            const Icon = game.icon;
                            return (
                                <button
                                    key={game.type}
                                    onClick={() => handleSelectGame(game.type)}
                                    className="flex items-center gap-5 p-6 rounded-2xl border-2 border-forest/10 bg-white hover:border-olive/30 hover:bg-olive/5 transition-all text-left group w-full"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-olive/10 flex items-center justify-center shrink-0">
                                        <Icon className="w-6 h-6 text-olive" />
                                    </div>
                                    <div>
                                        <h2 className="font-display font-black text-forest text-xl group-hover:text-olive transition-colors">
                                            {game.label}
                                        </h2>
                                        <p className="text-sm text-forest/55 font-medium">{game.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* ── Maze ─────────────────────────────────────────────────── */}
                {activeGame === GameType.MAZE && user && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display font-black text-forest text-lg flex items-center gap-2">
                                <Compass className="w-5 h-5 text-olive" /> Goose Maze
                            </h2>
                            <button onClick={handleBack} className="text-sm text-forest/50 hover:text-forest font-medium">Back</button>
                        </div>
                        <div className="card p-4">
                            <MazeGame
                                roomCode={SOLO_ROOM}
                                userId={user.id}
                                username={user.username || "Goose"}
                                onGameEnd={handleBack}
                                onPointsEarned={handlePointsEarned}
                            />
                        </div>
                    </div>
                )}

                {/* ── Breadcrumb ────────────────────────────────────────────── */}
                {activeGame === GameType.BREADCRUMB && socket && user && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display font-black text-forest text-lg flex items-center gap-2">
                                <Wheat className="w-5 h-5 text-olive" /> Breadcrumb Tap
                            </h2>
                            <button onClick={handleBack} className="text-sm text-forest/50 hover:text-forest font-medium">Back</button>
                        </div>
                        <div className="card p-6">
                            <BreadcrumbGame
                                socket={socket}
                                roomCode={SOLO_ROOM}
                                userId={user.id}
                                username={user.username || "Goose"}
                                onGameEnd={handleBack}
                            />
                        </div>
                    </div>
                )}

                {/* ── Pictionary (solo) ─────────────────────────────────────── */}
                {activeGame === GameType.PICTIONARY && user && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display font-black text-forest text-lg flex items-center gap-2">
                                <PenLine className="w-5 h-5 text-olive" /> Pictionary
                            </h2>
                            <button onClick={handleBack} className="text-sm text-forest/50 hover:text-forest font-medium">Back</button>
                        </div>
                        <div className="card p-5">
                            <PictionaryGame
                                userId={user.id}
                                username={user.username || "Goose"}
                                onGameEnd={async () => {
                                    await refreshProfile();
                                    handleBack();
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
