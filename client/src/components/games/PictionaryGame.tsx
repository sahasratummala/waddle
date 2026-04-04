import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Timer, Sparkles, Trophy } from "lucide-react";
import type { Socket } from "socket.io-client";
import DrawingBoard, { DrawingBoardRef } from "./DrawingBoard";
import { useAuthStore } from "@/store/authStore";

interface PictionaryGameProps {
  socket?: typeof Socket.prototype;
  roomCode?: string;
  userId: string;
  username: string;
  onGameEnd: (result?: unknown) => void;
}

type GamePhase = "loading" | "drawing" | "won" | "lost" | "someone-won";

const GAME_SECONDS = 120;        // 2-minute timer
const CHECK_INTERVAL_MS = 4000;  // poll Gemini every 4s
const CHECK_START_DELAY_MS = 8000; // wait 8s before first check (give time to draw)

export default function PictionaryGame({
  socket,
  roomCode,
  userId,
  username,
  onGameEnd,
}: PictionaryGameProps) {
  const { session } = useAuthStore();
  const [phase, setPhase] = useState<GamePhase>("loading");
  const [word, setWord] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [geminiGuess, setGeminiGuess] = useState<string>("");
  const [winner, setWinner] = useState<{ userId: string; username: string } | null>(null);

  const drawingRef = useRef<DrawingBoardRef>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isChecking = useRef(false);
  const gameOver = useRef(false);

  const isSolo = !socket || !roomCode;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function stopTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (pollDelayRef.current) { clearTimeout(pollDelayRef.current); pollDelayRef.current = null; }
  }
  function endGame(p: GamePhase) {
    if (gameOver.current) return;
    gameOver.current = true;
    setPhase(p);
    stopTimer();
    stopPolling();
  }

  // ── Get word ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isSolo) {
      fetch("/api/games/pictionary/word", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
        .then((r) => r.json())
        .then((d) => { setWord(d.word); setPhase("drawing"); })
        .catch(() => { setWord("feather"); setPhase("drawing"); });
    } else {
      // Multiplayer: server broadcasts word to whole room after game:start
      const handleWord = ({ word: w }: { word: string }) => {
        setWord(w);
        setPhase("drawing");
      };
      socket!.on("pictionary:word", handleWord);
      // In case we mounted after the broadcast, request it again
      socket!.emit("pictionary:request-word", { roomCode });
      return () => { socket!.off("pictionary:word", handleWord); };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Multiplayer winner from another player ──────────────────────────────────
  useEffect(() => {
    if (isSolo || !socket) return;
    const handleWinner = (data: { userId: string; username: string }) => {
      setWinner({ userId: data.userId, username: data.username });
      endGame(data.userId === userId ? "won" : "someone-won");
    };
    socket.on("pictionary:winner", handleWinner);
    return () => { socket.off("pictionary:winner", handleWinner); };
  }, [socket, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Gemini check ─────────────────────────────────────────────────────────────
  const checkDrawing = useCallback(async () => {
    if (isChecking.current || gameOver.current || !word) return;
    const imageData = drawingRef.current?.getImageData();
    // Skip if canvas is nearly blank (tiny base64 = nothing drawn)
    if (!imageData || imageData.length < 300) return;

    isChecking.current = true;
    try {
      const res = await fetch("/api/games/pictionary/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          imageData,
          mimeType: "image/png",
          word,
          roomCode: isSolo ? undefined : roomCode,
          username,
        }),
      });
      const data = await res.json();
      if (data.attempt) setGeminiGuess(data.attempt);
      if (data.guessed && !gameOver.current) {
        setWinner({ userId, username });
        endGame("won");
      }
    } catch {
      // Non-fatal — keep polling
    } finally {
      isChecking.current = false;
    }
  }, [word, session, roomCode, isSolo, username, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start timer + polling once drawing begins ────────────────────────────────
  useEffect(() => {
    if (phase !== "drawing") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { endGame("lost"); return 0; }
        return prev - 1;
      });
    }, 1000);

    pollDelayRef.current = setTimeout(() => {
      if (!gameOver.current) {
        pollRef.current = setInterval(checkDrawing, CHECK_INTERVAL_MS);
      }
    }, CHECK_START_DELAY_MS);

    return () => { stopTimer(); stopPolling(); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmt(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <Loader2 className="w-8 h-8 text-avocado animate-spin" />
        <p className="text-forest/60 text-sm font-medium">Getting your word…</p>
      </div>
    );
  }

  // ── End screen ───────────────────────────────────────────────────────────────
  if (phase !== "drawing") {
    const isWin = phase === "won";
    const isLost = phase === "lost";
    return (
      <div className="flex flex-col items-center gap-5 py-10 text-center">
        <span className="text-6xl">{isWin ? "🏆" : isLost ? "⏰" : "🎉"}</span>
        <div>
          <h3 className="font-display text-2xl font-black text-forest mb-2">
            {isWin
              ? "Gemini guessed it!"
              : isLost
              ? "Time's up!"
              : `${winner?.username ?? "Someone"} won!`}
          </h3>
          <p className="text-forest/55 text-sm max-w-xs mx-auto">
            {isWin
              ? `Your drawing of "${word}" earned you 25 points! 🪿`
              : isLost
              ? `Gemini couldn't figure out "${word}" in 2 minutes. No points this round.`
              : `They drew "${word}" and Gemini figured it out first.`}
          </p>
        </div>
        <button
          onClick={() => onGameEnd()}
          className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #898433, #7E9DA2)" }}
        >
          {isSolo ? "Play Again" : "Back to Break"}
        </button>
      </div>
    );
  }

  // ── Drawing phase ────────────────────────────────────────────────────────────
  const urgent = timeLeft <= 30;
  const warning = timeLeft <= 60;
  const checkingStarted = timeLeft <= GAME_SECONDS - CHECK_START_DELAY_MS / 1000;

  return (
    <div className="flex flex-col gap-4">
      {/* Word + timer */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-forest/45 font-semibold uppercase tracking-widest mb-0.5">Draw this</p>
          <h2 className="font-display text-3xl font-black text-forest leading-none">{word}</h2>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono font-black text-xl border-2 transition-colors"
          style={{
            background: urgent ? "rgba(192,57,43,0.08)" : warning ? "rgba(251,140,0,0.08)" : "rgba(137,132,51,0.08)",
            color:      urgent ? "#c0392b" : warning ? "#e65100" : "#898433",
            borderColor: urgent ? "rgba(192,57,43,0.25)" : warning ? "rgba(251,140,0,0.25)" : "rgba(137,132,51,0.2)",
          }}
        >
          <Timer className="w-5 h-5" />
          {fmt(timeLeft)}
        </div>
      </div>

      {/* Gemini status */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-forest/8 bg-cream/50">
        <Sparkles className="w-3.5 h-3.5 text-avocado shrink-0" style={{ opacity: checkingStarted ? 1 : 0.4 }} />
        <p className="text-xs text-forest/55">
          {!checkingStarted
            ? "Keep drawing — Gemini will start guessing soon…"
            : geminiGuess
            ? <>Gemini thinks it's… <span className="font-bold text-forest">"{geminiGuess}"</span></>
            : "Gemini is studying your drawing…"}
        </p>
        {!isSolo && (
          <span className="ml-auto flex items-center gap-1 text-xs text-forest/35 font-medium shrink-0">
            <Trophy className="w-3 h-3" /> Race!
          </span>
        )}
      </div>

      {/* Drawing board */}
      <DrawingBoard ref={drawingRef} />

      <p className="text-xs text-center text-forest/30">
        Draw clearly — Gemini checks every few seconds.
        {!isSolo && " First player it guesses wins for everyone!"}
      </p>
    </div>
  );
}
