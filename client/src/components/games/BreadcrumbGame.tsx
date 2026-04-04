import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

interface BreadcrumbGameProps {
  socket: Socket;
  roomCode: string;
  userId: string;
  username: string;
  onGameEnd: (rankings: { userId: string; username: string; taps: number }[]) => void;
  durationMs?: number; // how long the game lasts, default 10000ms
}

interface PlayerScore {
  userId: string;
  username: string;
  taps: number;
  gooseColor: string;
}

const GOOSE_COLORS = [
  "#7F77DD", // purple
  "#1D9E75", // teal
  "#D85A30", // coral
  "#D4537E", // pink
  "#378ADD", // blue
  "#639922", // green
];

const GAME_DURATION = 10_000; // 10 seconds

export default function BreadcrumbGame({
  socket,
  roomCode,
  userId,
  username,
  onGameEnd,
  durationMs = GAME_DURATION,
}: BreadcrumbGameProps) {
  const [taps, setTaps] = useState(0);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [timeLeft, setTimeLeft] = useState(durationMs / 1000);
  const [phase, setPhase] = useState<"countdown" | "playing" | "results">("countdown");
  const [countdown, setCountdown] = useState(3);
  const [crumbEaten, setCrumbEaten] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const tapRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleId = useRef(0);
  const myColor = GOOSE_COLORS[Math.abs(userId.charCodeAt(0) - 65) % GOOSE_COLORS.length];

  // Countdown then start
  useEffect(() => {
    let count = 3;
    setCountdown(count);
    const iv = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(iv);
        setPhase("playing");
        startGame();
      } else {
        setCountdown(count);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const startGame = useCallback(() => {
    const endTime = Date.now() + durationMs;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        // Submit final tap count
        socket.emit("breadcrumb:final_score", {
          roomCode,
          userId,
          username,
          taps: tapRef.current,
        });
        setPhase("results");
      }
    }, 100);
  }, [durationMs, socket, roomCode, userId, username]);

  useEffect(() => {
    socket.on("breadcrumb:score_update", (data: { scores: PlayerScore[] }) => {
      setPlayers(data.scores.sort((a, b) => b.taps - a.taps));
    });

    socket.on("breadcrumb:results", (data: { rankings: PlayerScore[] }) => {
      setPlayers(data.rankings);
      onGameEnd(data.rankings);
    });

    return () => {
      socket.off("breadcrumb:score_update");
      socket.off("breadcrumb:results");
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [socket, onGameEnd]);

  const handleTap = (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
    if (phase !== "playing") return;
    tapRef.current += 1;
    setTaps(tapRef.current);

    // Get tap position for ripple
    let x = 50, y = 50;
    if ("touches" in e && e.touches[0]) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
      y = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
    } else if ("clientX" in e) {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      x = ((e.clientX - rect.left) / rect.width) * 100;
      y = ((e.clientY - rect.top) / rect.height) * 100;
    }

    const id = rippleId.current++;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 600);

    // Broadcast tap every 5 taps to avoid spam
    if (tapRef.current % 5 === 0) {
      socket.emit("breadcrumb:tap", { roomCode, userId, username, taps: tapRef.current });
    }

    // Bread crumb eaten animation
    setCrumbEaten(true);
    setTimeout(() => setCrumbEaten(false), 150);
  };

  const progressPercent = (timeLeft / (durationMs / 1000)) * 100;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto select-none">
      {/* Timer bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Time left</span>
          <span className={timeLeft <= 3 ? "text-red-500 font-bold" : ""}>{timeLeft}s</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progressPercent}%`,
              background: timeLeft <= 3 ? "#E24B4A" : "#7F77DD",
            }}
          />
        </div>
      </div>

      {/* Countdown overlay */}
      {phase === "countdown" && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-gray-500 text-sm">Get ready to tap!</p>
          <div
            className="text-7xl font-black text-purple-600"
            style={{ animation: "ping 0.9s ease-in-out" }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Game area */}
      {phase === "playing" && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-gray-600 text-sm font-medium">
            Your taps: <span className="text-purple-600 font-bold text-xl">{taps}</span>
          </p>

          {/* Breadcrumb tap button */}
          <button
            onMouseDown={handleTap}
            onTouchStart={handleTap}
            className="relative w-48 h-48 rounded-full flex items-center justify-center overflow-hidden focus:outline-none active:scale-95 transition-transform"
            style={{ background: "#FAEEDA", border: "3px solid #FAC775" }}
          >
            {/* Ripples */}
            {ripples.map((r) => (
              <span
                key={r.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${r.x}%`,
                  top: `${r.y}%`,
                  transform: "translate(-50%, -50%)",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(127,119,221,0.35)",
                  animation: "ripple 0.6s ease-out forwards",
                }}
              />
            ))}

            {/* Breadcrumb */}
            <span
              className="text-5xl transition-transform duration-75"
              style={{
                transform: crumbEaten ? "scale(0.7)" : "scale(1)",
                filter: crumbEaten ? "brightness(1.5)" : "none",
              }}
            >
              🍞
            </span>

            {/* Goose avatars ring (simplified dots) */}
            {players.slice(0, 5).map((p, i) => {
              const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
              const r = 80;
              return (
                <span
                  key={p.userId}
                  className="absolute w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{
                    left: `calc(50% + ${Math.cos(angle) * r}px - 14px)`,
                    top: `calc(50% + ${Math.sin(angle) * r}px - 14px)`,
                    background: GOOSE_COLORS[i % GOOSE_COLORS.length],
                    fontSize: 11,
                  }}
                >
                  {p.username[0].toUpperCase()}
                </span>
              );
            })}
          </button>

          <p className="text-xs text-gray-400">Tap as fast as you can!</p>
        </div>
      )}

      {/* Results */}
      {phase === "results" && (
        <div className="w-full space-y-2">
          <h3 className="text-center font-bold text-gray-800 text-lg mb-3">Results 🏆</h3>
          {players.map((p, i) => (
            <div
              key={p.userId}
              className="flex items-center gap-3 px-4 py-2 rounded-xl"
              style={{
                background: i === 0 ? "#FAEEDA" : "#F1EFE8",
                border: i === 0 ? "1.5px solid #FAC775" : "1px solid #D3D1C7",
              }}
            >
              <span className="text-lg font-black w-6 text-center" style={{ color: i === 0 ? "#BA7517" : "#888780" }}>
                {i + 1}
              </span>
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: GOOSE_COLORS[i % GOOSE_COLORS.length] }}
              >
                {p.username[0].toUpperCase()}
              </span>
              <span className="flex-1 font-medium text-gray-800">{p.username}</span>
              <span className="text-sm text-gray-500 font-mono">{p.taps} taps</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes ripple {
          from { transform: translate(-50%,-50%) scale(0); opacity: 1; }
          to   { transform: translate(-50%,-50%) scale(4); opacity: 0; }
        }
        @keyframes ping {
          0%   { transform: scale(1); opacity: 1; }
          80%  { transform: scale(1.4); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
