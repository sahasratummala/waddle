import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

interface BreadcrumbGameProps {
  socket: Socket;
  roomCode: string;
  userId: string;
  username: string;
  onGameEnd?: (rankings: { userId: string; username: string; taps: number }[]) => void;
  onPointsEarned?: (points: number) => void;
  durationMs?: number;
}

interface PlayerScore {
  userId: string;
  username: string;
  taps: number;
}

const GOOSE_COLORS = ["#898433", "#7E9DA2", "#45441A", "#6E6A28", "#56777D", "#282C15"];
const GAME_DURATION = 60_000;

let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") {
    _audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _audioCtx;
}

function playTap() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.055), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 4) * 0.8;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch { }
}

function getOrbitPositions(count: number, radius: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export default function BreadcrumbGame({
  socket,
  roomCode,
  userId,
  username,
  onGameEnd,
  onPointsEarned,
  durationMs = GAME_DURATION,
}: BreadcrumbGameProps) {
  const { session, refreshProfile } = useAuthStore();
  const isSolo = roomCode === "SOLO_GAME";

  const [taps, setTaps] = useState(0);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [timeLeft, setTimeLeft] = useState(durationMs / 1000);
  const [phase, setPhase] = useState<"countdown" | "playing" | "results">("countdown");
  const [countdown, setCountdown] = useState(3);
  const [crumbEaten, setCrumbEaten] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const [pointsAwarded, setPointsAwarded] = useState<number | null>(null);
  const [round, setRound] = useState(0);

  const tapRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rippleId = useRef(0);
  const gameEndedRef = useRef(false);
  const playersRef = useRef<PlayerScore[]>([]);

  const awardPoints = useCallback(async (pts: number) => {
    const token = session?.access_token;
    if (!token || pts <= 0) return;
    try {
      await fetch("/api/goose/game-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ points: pts }),
      });
      await refreshProfile();
    } catch { }
  }, [session, refreshProfile]);

  const resolveGame = useCallback(async (finalTaps: number, allPlayers: PlayerScore[]) => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const sorted = [...allPlayers].sort((a, b) => b.taps - a.taps);
    setPlayers(sorted);

    const isWinner = sorted[0]?.userId === userId;
    const pts = Math.round(finalTaps * 0.1) + (isWinner && sorted.length > 1 ? 25 : 0);
    setPointsAwarded(pts);
    setPhase("results");
    if (pts > 0) onPointsEarned?.(pts);
    await awardPoints(pts);
    if (!isSolo && pts > 0) {
      socket.emit("game:points-earned", { roomCode, points: pts });
    }
  }, [userId, isSolo, socket, roomCode, awardPoints, onPointsEarned]);

  const endGame = useCallback(() => {
    if (gameEndedRef.current) return;
    // Build the final player list: latest known scores + this player's final tap count
    const knownPlayers = new Map(playersRef.current.map((p) => [p.userId, p]));
    knownPlayers.set(userId, { userId, username, taps: tapRef.current });
    resolveGame(tapRef.current, [...knownPlayers.values()]);
  }, [userId, username, resolveGame]);

  const startTimer = useCallback(() => {
    const endTime = Date.now() + durationMs;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        endGame();
      }
    }, 100);
  }, [durationMs, endGame]);

  // Full reset + countdown on each new round
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    tapRef.current = 0;
    gameEndedRef.current = false;
    setTaps(0);
    setPlayers([]);
    setTimeLeft(durationMs / 1000);
    setPointsAwarded(null);
    setPhase("countdown");
    setCountdown(3);
    setCrumbEaten(false);
    setRipples([]);

    let count = 3;
    const iv = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(iv);
        setPhase("playing");
        startTimer();
      } else {
        setCountdown(count);
      }
    }, 1000);

    return () => {
      clearInterval(iv);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [round]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep playersRef in sync for use in endGame closure
  useEffect(() => { playersRef.current = players; }, [players]);

  // Multiplayer socket listeners
  useEffect(() => {
    if (isSolo) return;
    socket.on("breadcrumb:score_update", (data: { scores: PlayerScore[] }) => {
      setPlayers(data.scores.sort((a, b) => b.taps - a.taps));
    });
    socket.on("breadcrumb:results", (data: { rankings: PlayerScore[] }) => {
      resolveGame(tapRef.current, data.rankings);
    });
    return () => {
      socket.off("breadcrumb:score_update");
      socket.off("breadcrumb:results");
    };
  }, [socket, isSolo, resolveGame]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      if (phase !== "playing") return;

      tapRef.current += 1;
      setTaps(tapRef.current);
      playTap();

      const rect = e.currentTarget.getBoundingClientRect();
      let x = 50, y = 50;
      if ("touches" in e && e.touches[0]) {
        x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
        y = ((e.touches[0].clientY - rect.top) / rect.height) * 100;
      } else if ("clientX" in e) {
        x = ((e.clientX - rect.left) / rect.width) * 100;
        y = ((e.clientY - rect.top) / rect.height) * 100;
      }

      const id = rippleId.current++;
      setRipples((prev) => [...prev.slice(-8), { id, x, y }]);
      setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 500);

      if (!isSolo && tapRef.current % 5 === 0) {
        socket.emit("breadcrumb:tap", { roomCode, userId, username, taps: tapRef.current });
      }

      setCrumbEaten(true);
      setTimeout(() => setCrumbEaten(false), 70);
    },
    [phase, isSolo, socket, roomCode, userId, username]
  );

  const progressPercent = (timeLeft / (durationMs / 1000)) * 100;
  const isCritical = timeLeft <= 10;

  const livePlayers: PlayerScore[] = isSolo
    ? [{ userId, username, taps }]
    : (() => {
      const map = new Map(players.map((p) => [p.userId, p]));
      map.set(userId, { userId, username, taps });
      return [...map.values()].sort((a, b) => b.taps - a.taps);
    })();

  const showOrbit = !isSolo && livePlayers.length > 1;
  const orbitPositions = getOrbitPositions(livePlayers.length, 130);

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm mx-auto select-none">

      {/* Timer bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs font-medium mb-1">
          <span className="text-forest/40">Time left</span>
          <span className={`font-black ${isCritical ? "text-red-500" : "text-forest"}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="w-full h-3 bg-forest/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progressPercent}%`,
              background: isCritical ? "#C0392B" : "linear-gradient(90deg, #898433, #7E9DA2)",
            }}
          />
        </div>
      </div>

      {/* Countdown */}
      {phase === "countdown" && (
        <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-forest/50 text-sm font-medium">Get ready to tap!</p>
          <div
            key={countdown}
            className="text-9xl font-black text-avocado"
            style={{ animation: "countPop 0.9s ease-in-out" }}
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Playing */}
      {phase === "playing" && (
        <div className="flex flex-col items-center gap-4 w-full">
          <p className="text-forest/60 text-sm font-medium">
            Your taps: <span className="text-avocado font-black text-2xl">{taps}</span>
          </p>

          {/* Arena */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 320, height: 320 }}
          >
            {/* Orbiting avatars (multiplayer only) */}
            {showOrbit && livePlayers.map((p, i) => {
              const pos = orbitPositions[i];
              const color = GOOSE_COLORS[i % GOOSE_COLORS.length];
              const isMe = p.userId === userId;
              return (
                <div
                  key={p.userId}
                  className="absolute flex flex-col items-center gap-0.5 transition-all duration-200"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: "translate(-50%, -50%)",
                    zIndex: 10,
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full text-white font-black text-sm shadow-md"
                    style={{
                      width: 42,
                      height: 42,
                      background: color,
                      border: isMe ? "3px solid #282C15" : "2px solid white",
                      outline: isMe ? `2px solid ${color}` : undefined,
                    }}
                  >
                    {p.username[0].toUpperCase()}
                  </div>
                  <div
                    className="rounded-full text-white font-black text-center"
                    style={{
                      fontSize: 10,
                      lineHeight: "15px",
                      background: color,
                      minWidth: 26,
                      padding: "0 4px",
                    }}
                  >
                    {isMe ? taps : p.taps}
                  </div>
                </div>
              );
            })}

            {/* Center tap button */}
            <button
              onMouseDown={handleTap}
              onTouchStart={handleTap}
              className="relative rounded-full flex items-center justify-center overflow-hidden focus:outline-none active:scale-90 transition-transform duration-75 z-20"
              style={{
                width: 148,
                height: 148,
                background: "#F5F2EA",
                border: `4px solid ${isCritical ? "#C0392B" : "#898433"}`,
                boxShadow: isCritical
                  ? "0 0 20px rgba(192,57,43,0.3)"
                  : "0 4px 20px rgba(137,132,51,0.25)",
              }}
            >
              {ripples.map((r) => (
                <span
                  key={r.id}
                  className="absolute pointer-events-none rounded-full"
                  style={{
                    left: `${r.x}%`,
                    top: `${r.y}%`,
                    transform: "translate(-50%,-50%)",
                    width: 40,
                    height: 40,
                    background: "rgba(137,132,51,0.2)",
                    animation: "ripple 0.5s ease-out forwards",
                  }}
                />
              ))}
              <img
                src="/food/breadcrumb.png"
                alt="breadcrumb"
                draggable={false}
                className="pointer-events-none"
                style={{
                  width: 110,
                  height: 110,
                  objectFit: "contain",
                  transform: crumbEaten ? "scale(0.82)" : "scale(1)",
                  filter: crumbEaten ? "brightness(1.35)" : "none",
                  transition: "transform 0.07s, filter 0.07s",
                }}
              />
            </button>
          </div>

          <p className="text-xs text-forest/35 font-medium">Tap as fast as you can!</p>
        </div>
      )}

      {/* Results */}
      {phase === "results" && (
        <div className="w-full flex flex-col gap-3">
          <h3 className="text-center font-display font-black text-forest text-2xl">Time's up! 🪿</h3>

          {pointsAwarded !== null && (
            <div className="flex flex-wrap items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-avocado/10 border-2 border-avocado/20">
              <span className="text-avocado font-black text-lg">+{pointsAwarded} pts earned</span>
              {livePlayers[0]?.userId === userId && livePlayers.length > 1 && (
                <span className="text-xs bg-avocado text-white px-2 py-0.5 rounded-full font-bold">
                  Winner +25 bonus!
                </span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {(players.length ? players : [{ userId, username, taps }]).map((p, i) => (
              <div
                key={p.userId}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 ${i === 0
                    ? "bg-avocado/10 border-avocado/30"
                    : "bg-cream border-forest/10"
                  }`}
              >
                <span className={`text-lg font-black w-6 text-center ${i === 0 ? "text-avocado" : "text-forest/30"}`}>
                  {i + 1}
                </span>
                <div
                  className="flex items-center justify-center rounded-full text-white font-black text-sm shrink-0"
                  style={{
                    width: 34,
                    height: 34,
                    background: GOOSE_COLORS[i % GOOSE_COLORS.length],
                  }}
                >
                  {p.username[0].toUpperCase()}
                </div>
                <span className="flex-1 font-bold text-forest truncate">{p.username}</span>
                <span className="text-sm text-forest/50 font-mono font-semibold">{p.taps} taps</span>
              </div>
            ))}
          </div>

          {isSolo ? (
            <button
              onClick={() => setRound((r) => r + 1)}
              className="mt-1 w-full py-3 rounded-2xl font-display font-black text-white text-sm transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)" }}
            >
              Play Again
            </button>
          ) : (
            <div className="mt-1 flex gap-2">
              <button
                onClick={() => setRound((r) => r + 1)}
                className="flex-1 py-3 rounded-2xl font-display font-black text-forest text-sm border-2 border-forest/15 bg-white transition-all active:scale-95"
              >
                Play Again
              </button>
              <button
                onClick={() => onGameEnd?.(players.length ? players : [{ userId, username, taps }])}
                className="flex-1 py-3 rounded-2xl font-display font-black text-white text-sm transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)" }}
              >
                Back to Room
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes ripple {
          from { transform: translate(-50%,-50%) scale(0); opacity: 1; }
          to   { transform: translate(-50%,-50%) scale(5); opacity: 0; }
        }
        @keyframes countPop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}