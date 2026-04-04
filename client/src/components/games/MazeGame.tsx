import { useState, useEffect, useCallback, useRef } from "react";
import type { Socket } from "socket.io-client";

interface MazeGameProps {
  socket?: Socket | null;
  roomCode: string;
  userId: string;
  username: string;
  onGameEnd?: () => void;
  onPointsEarned?: (points: number) => void; // Added points prop
  seed?: number;
  size?: number;
}

interface Cell {
  right: boolean;
  bottom: boolean;
}

interface Pos {
  r: number;
  c: number;
}

interface OtherPlayer {
  userId: string;
  username: string;
  pos: Pos;
  finished: boolean;
}

interface FinishRecord {
  userId: string;
  username: string;
  rank: number;
  timeSeconds: number;
}

const CELL = 32;
const GOOSE_COLORS = ["#898433", "#7E9DA2", "#45441A", "#6E6A28", "#56777D", "#282C15"];

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function buildMaze(seed: number, size: number): Cell[][] {
  const rng = makeRng(seed);
  const grid: Cell[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => ({
      right: c < size - 1,
      bottom: r < size - 1,
    }))
  );
  const visited = Array.from({ length: size }, () => new Array(size).fill(false));

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function carve(r: number, c: number) {
    visited[r][c] = true;
    for (const [dr, dc] of shuffle([[0, 1], [1, 0], [0, -1], [-1, 0]] as [number, number][])) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size || visited[nr][nc]) continue;
      if (dr === 0 && dc === 1) grid[r][c].right = false;
      else if (dr === 0 && dc === -1) grid[nr][nc].right = false;
      else if (dr === 1 && dc === 0) grid[r][c].bottom = false;
      else if (dr === -1 && dc === 0) grid[nr][nc].bottom = false;
      carve(nr, nc);
    }
  }

  carve(0, 0);
  return grid;
}

function canStep(grid: Cell[][], pos: Pos, dir: "up" | "down" | "left" | "right", size: number): boolean {
  const { r, c } = pos;
  if (dir === "right") return c < size - 1 && !grid[r][c].right;
  if (dir === "down")  return r < size - 1 && !grid[r][c].bottom;
  if (dir === "left")  return c > 0 && !grid[r][c - 1].right;
  if (dir === "up")    return r > 0 && !grid[r - 1][c].bottom;
  return false;
}

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function MazeGame({
  socket,
  roomCode,
  userId,
  username,
  onGameEnd,
  onPointsEarned,
  seed: seedProp,
  size = 8,
}: MazeGameProps) {
  const isSolo = !socket || roomCode === "SOLO_GAME";

  const seed = seedProp ?? (() => {
    let h = 5381;
    for (let i = 0; i < roomCode.length; i++) h = ((h << 5) + h + roomCode.charCodeAt(i)) >>> 0;
    return (h % 9000) + 1000;
  })();

  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"countdown" | "playing" | "results">("countdown");
  const [countdown, setCountdown] = useState(3);
  const [pos, setPos] = useState<Pos>({ r: 0, c: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [myTime, setMyTime] = useState<number | null>(null);
  const [others, setOthers] = useState<OtherPlayer[]>([]);
  const [finished, setFinished] = useState<FinishRecord[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  const grid = useRef(buildMaze(seed + round, size));
  const phaseRef = useRef<"countdown" | "playing" | "results">("countdown");
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    grid.current = buildMaze(seed + round, size);
    phaseRef.current = "countdown";
    startTimeRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("countdown");
    setCountdown(3);
    setPos({ r: 0, c: 0 });
    setElapsed(0);
    setMyTime(null);
    setOthers([]);
    setFinished([]);
    setMyRank(null);

    let c = 3;
    const iv = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(iv);
        const now = Date.now();
        startTimeRef.current = now;
        phaseRef.current = "playing";
        setPhase("playing");
        timerRef.current = setInterval(() => {
          setElapsed(Math.floor((Date.now() - startTimeRef.current!) / 1000));
        }, 250);
      } else {
        setCountdown(c);
      }
    }, 1000);

    return () => {
      clearInterval(iv);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [round, seed, size]); 

  const move = useCallback((dir: "up" | "down" | "left" | "right") => {
    if (phaseRef.current !== "playing") return;

    setPos((prev) => {
      if (!canStep(grid.current, prev, dir, size)) return prev;

      const next: Pos = {
        r: prev.r + (dir === "down" ? 1 : dir === "up" ? -1 : 0),
        c: prev.c + (dir === "right" ? 1 : dir === "left" ? -1 : 0),
      };

      if (!isSolo && socket) {
        socket.emit("maze-move", {
          roomCode,
          userId,
          username, // FIX: Included username to prevent crash on other screens
          direction: dir.toUpperCase(),
          position: { x: next.c, y: next.r },
        });
      }

      if (next.r === size - 1 && next.c === size - 1) {
        const timeSeconds = startTimeRef.current
          ? Math.floor((Date.now() - startTimeRef.current) / 1000)
          : 0;
        if (timerRef.current) clearInterval(timerRef.current);
        phaseRef.current = "results";
        setPhase("results");
        setMyTime(timeSeconds);

        if (!isSolo && socket) {
          socket.emit("maze-complete", { roomCode, userId, username, timeSeconds });
        }
      }

      return next;
    });
  }, [isSolo, socket, roomCode, userId, username, size]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up", w: "up", ArrowDown: "down", s: "down",
        ArrowLeft: "left", a: "left", ArrowRight: "right", d: "right",
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); move(dir); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [move]);

  // Touch swipe
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchOrigin.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchOrigin.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchOrigin.current.x;
    const dy = t.clientY - touchOrigin.current.y;
    touchOrigin.current = null;
    if (Math.abs(dx) < 15 && Math.abs(dy) < 15) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  };

  // Multiplayer listeners
  useEffect(() => {
    if (isSolo || !socket) return;

    const handleMove = (data: { userId: string; username: string; position: { x: number; y: number } }) => {
      if (data.userId === userId) return;
      setOthers((prev) => {
        const idx = prev.findIndex((p) => p.userId === data.userId);
        const updated = { 
          userId: data.userId, 
          username: data.username || "Goose", // FIX: Fallback just in case
          pos: { r: data.position.y, c: data.position.x }, 
          finished: false 
        };
        if (idx >= 0) return prev.map((p, i) => i === idx ? { ...p, pos: updated.pos } : p);
        return [...prev, updated];
      });
    };

    const handleComplete = (data: { userId: string; username: string; rank: number; timeSeconds: number }) => {
      if (data.userId === userId) {
        setMyRank(data.rank);
        // ADDED: Give points to the 1st place winner!
        if (data.rank === 1 && onPointsEarned) {
          onPointsEarned(50); // Gives 50 points for winning
        }
        return;
      }
      setOthers((prev) => prev.map((p) => p.userId === data.userId ? { ...p, finished: true } : p));
      setFinished((prev) => {
        if (prev.some((p) => p.userId === data.userId)) return prev;
        const name = data.username || others.find((p) => p.userId === data.userId)?.username || "Player";
        return [...prev, { userId: data.userId, username: name, rank: data.rank, timeSeconds: data.timeSeconds }];
      });
    };

    socket.on("maze-move", handleMove);
    socket.on("maze-complete", handleComplete);
    return () => { socket.off("maze-move", handleMove); socket.off("maze-complete", handleComplete); };
  }, [isSolo, socket, userId, others, onPointsEarned]);

  const allFinished: FinishRecord[] = myTime !== null
    ? [{ userId, username, rank: myRank ?? 1, timeSeconds: myTime }, ...finished]
    : finished;

  return (
    <div
      className="flex flex-col items-center gap-4 select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {phase === "countdown" && (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-forest/50 text-sm font-medium">Navigate your goose to the exit! 🚪</p>
          <div
            key={`${round}-${countdown}`}
            className="text-9xl font-black text-avocado"
            style={{ animation: "mazePop 0.9s ease-in-out" }}
          >
            {countdown}
          </div>
          <p className="text-xs text-forest/30 font-medium">Arrow keys · WASD · D-pad · Swipe</p>
        </div>
      )}

      {phase !== "countdown" && (
        <>
          <div className="flex items-center gap-3 text-sm font-bold text-forest/60">
            <span>⏱ {fmtTime(myTime ?? elapsed)}</span>
            {!isSolo && (
              <span className="text-forest/30">
                · {[...others.filter((p) => p.finished), ...(myTime !== null ? [{}] : [])].length}/{others.length + 1} done
              </span>
            )}
          </div>

          <div
            className="relative"
            style={{
              border: "3px solid #282C15",
              borderRadius: 6,
              background: "#F5F2EA",
              display: "inline-block",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${size}, ${CELL}px)`,
                gridTemplateRows: `repeat(${size}, ${CELL}px)`,
              }}
            >
              {grid.current.map((row, r) =>
                row.map((cell, c) => {
                  const isExit = r === size - 1 && c === size - 1;
                  const isEntry = r === 0 && c === 0;
                  const myHere = pos.r === r && pos.c === c;
                  const othersHere = others.filter((o) => o.pos.r === r && o.pos.c === c);

                  return (
                    <div
                      key={`${r}-${c}`}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRight: cell.right ? "2px solid #282C15" : "2px solid transparent",
                        borderBottom: cell.bottom ? "2px solid #282C15" : "2px solid transparent",
                        background: isExit ? "rgba(137,132,51,0.18)" : isEntry ? "rgba(126,157,162,0.12)" : undefined,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isExit && <span style={{ fontSize: 16, lineHeight: 1, pointerEvents: "none" }}>🚪</span>}

                      {othersHere.map((o, i) => {
                        const firstInitial = (o.username && o.username.length > 0) ? o.username[0].toUpperCase() : "G";
                        return (
                          <div
                            key={o.userId}
                            style={{
                              position: "absolute",
                              top: 3, right: 3,
                              width: 16, height: 16,
                              borderRadius: "50%",
                              background: GOOSE_COLORS[(i + 1) % GOOSE_COLORS.length],
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 8, color: "white", fontWeight: "bold",
                              opacity: o.finished ? 0.35 : 0.9,
                            }}
                          >
                            {firstInitial}
                          </div>
                        );
                      })}

                      {myHere && (
                        <div
                          style={{
                            position: "absolute",
                            width: 24, height: 24,
                            borderRadius: "50%",
                            background: "#898433",
                            border: "2px solid #282C15",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13,
                            zIndex: 5,
                            opacity: phase === "results" ? 0.6 : 1,
                          }}
                        >
                          🪿
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 44px)", gridTemplateRows: "repeat(2, 44px)", gap: 6 }}>
            <div />
            <button
              onPointerDown={(e) => { e.preventDefault(); move("up"); }}
              className="rounded-xl bg-forest/8 hover:bg-forest/15 active:bg-forest/25 flex items-center justify-center text-forest font-black text-base transition-colors"
            >↑</button>
            <div />
            <button
              onPointerDown={(e) => { e.preventDefault(); move("left"); }}
              className="rounded-xl bg-forest/8 hover:bg-forest/15 active:bg-forest/25 flex items-center justify-center text-forest font-black text-base transition-colors"
            >←</button>
            <button
              onPointerDown={(e) => { e.preventDefault(); move("down"); }}
              className="rounded-xl bg-forest/8 hover:bg-forest/15 active:bg-forest/25 flex items-center justify-center text-forest font-black text-base transition-colors"
            >↓</button>
            <button
              onPointerDown={(e) => { e.preventDefault(); move("right"); }}
              className="rounded-xl bg-forest/8 hover:bg-forest/15 active:bg-forest/25 flex items-center justify-center text-forest font-black text-base transition-colors"
            >→</button>
          </div>
        </>
      )}

      {phase === "results" && (
        <div className="w-full flex flex-col gap-3 max-w-sm">
          <h3 className="text-center font-display font-black text-forest text-2xl">Maze Done! 🪿</h3>

          <div className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-avocado/10 border-2 border-avocado/20">
            <span className="text-avocado font-black text-lg">{fmtTime(myTime ?? elapsed)}</span>
            <span className="text-avocado/70 text-sm font-semibold">your time</span>
            {myRank === 1 && !isSolo && (
              <span className="text-xs bg-avocado text-white px-2 py-0.5 rounded-full font-bold ml-1">1st! 🏆</span>
            )}
          </div>

          {!isSolo && allFinished.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-forest/40 text-xs font-bold uppercase tracking-wider text-center">Leaderboard</p>
              {[...allFinished].sort((a, b) => a.timeSeconds - b.timeSeconds).map((p, i) => (
                <div
                  key={p.userId}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 ${
                    i === 0 ? "bg-avocado/10 border-avocado/30" : "bg-cream border-forest/10"
                  }`}
                >
                  <span className={`text-lg font-black w-6 text-center ${i === 0 ? "text-avocado" : "text-forest/30"}`}>{i + 1}</span>
                  <div
                    className="flex items-center justify-center rounded-full text-white font-black text-sm shrink-0"
                    style={{ width: 34, height: 34, background: GOOSE_COLORS[i % GOOSE_COLORS.length] }}
                  >
                    {p.username[0]?.toUpperCase()}
                  </div>
                  <span className="flex-1 font-bold text-forest truncate">{p.username}</span>
                  <span className="text-sm text-forest/50 font-mono font-semibold">{fmtTime(p.timeSeconds)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mt-1">
            {isSolo && (
              <button
                onClick={() => setRound((r) => r + 1)}
                className="flex-1 py-3 rounded-2xl font-display font-black text-white text-sm transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)" }}
              >
                Play Again
              </button>
            )}
            {!isSolo && (
              <>
                <button
                  onClick={() => setRound((r) => r + 1)}
                  className="flex-1 py-3 rounded-2xl font-display font-black text-forest text-sm border-2 border-forest/15 bg-white transition-all active:scale-95"
                >
                  Play Again
                </button>
                <button
                  onClick={() => onGameEnd?.()}
                  className="flex-1 py-3 rounded-2xl font-display font-black text-white text-sm transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)" }}
                >
                  Back to Room
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes mazePop {
          0%   { transform: scale(0.5); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}