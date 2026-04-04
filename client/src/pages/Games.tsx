import { useState } from "react";
import { Gamepad2 } from "lucide-react";
import { GameType } from "@waddle/shared";
import { useAuthStore } from "@/store/authStore";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import BreadcrumbGame from "@/components/games/BreadcrumbGame";
import MazeGame from "@/components/games/MazeGame";

const GAMES = [
    {
        type: GameType.MAZE,
        label: "Goose Maze",
        description: "Navigate your goose through the maze as fast as you can.",
    },
    {
        type: GameType.BREADCRUMB,
        label: "Breadcrumb Tap",
        description: "Tap the breadcrumbs faster than everyone else.",
    },
    {
        type: GameType.PICTIONARY,
        label: "Pictionary",
        description: "Draw goose-themed objects and let AI guess what you drew.",
    },
];

const SOLO_ROOM = "SOLO_GAME";

export default function Games() {
    const { user, session } = useAuthStore();
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
                        {GAMES.map((game) => (
                            <button
                                key={game.type}
                                onClick={() => handleSelectGame(game.type)}
                                className="flex flex-col items-start gap-2 p-8 rounded-2xl border-2 border-forest/10 bg-white hover:border-olive/30 hover:bg-olive/5 transition-all text-left group w-full"
                            >
                                <h2 className="font-display font-black text-forest text-xl group-hover:text-olive transition-colors">
                                    {game.label}
                                </h2>
                                <p className="text-sm text-forest/60 font-medium">{game.description}</p>
                            </button>
                        ))}
                    </div>
                )}

                {activeGame === GameType.MAZE && user && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display font-black text-forest text-lg">Goose Maze</h2>
                            <button onClick={handleBack} className="text-sm text-forest/50 hover:text-forest font-medium">Back</button>
                        </div>
                        <div className="card p-4">
                            <MazeGame
                                roomCode={SOLO_ROOM}
                                userId={user.id}
                                username={user.username || "Goose"}
                                onGameEnd={handleBack}
                            />
                        </div>
                    </div>
                )}

                {activeGame === GameType.BREADCRUMB && socket && user && (
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-display font-black text-forest text-lg">Breadcrumb Tap</h2>
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

                {activeGame === GameType.PICTIONARY && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center justify-between w-full">
                            <h2 className="font-display font-black text-forest text-lg">Pictionary</h2>
                            <button onClick={handleBack} className="text-sm text-forest/50 hover:text-forest font-medium">Back</button>
                        </div>
                        <div className="card p-8 w-full flex items-center justify-center">
                            <p className="text-forest/30 text-sm font-medium">Coming soon</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}