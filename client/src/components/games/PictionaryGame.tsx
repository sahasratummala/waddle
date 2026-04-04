import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

interface PictionaryGameProps {
  socket: Socket;
  roomCode: string;
  userId: string;
  username: string;
  onGameEnd: (winnerId: string, winnerName: string) => void;
}

interface StrokePoint {
  x: number;
  y: number;
}

interface Stroke {
  points: StrokePoint[];
  color: string;
  width: number;
}

// Goose-themed drawing prompts
const PROMPTS = [
  "goose in a top hat",
  "goose riding a bicycle",
  "goose eating pizza",
  "goose at the beach",
  "gosling hatching from an egg",
  "goose playing guitar",
  "goose in a raincoat",
  "goose astronaut",
  "goose chasing someone",
  "goose doing yoga",
  "a flock of geese",
  "goose with sunglasses",
  "goose at a birthday party",
  "goose reading a book",
  "goose flying south",
];

const COLORS = ["#222", "#7F77DD", "#D85A30", "#1D9E75", "#D4537E", "#EF9F27"];
const WIDTHS = [3, 6, 12];

export default function PictionaryGame({
  socket,
  roomCode,
  userId,
  username,
  onGameEnd,
}: PictionaryGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#222");
  const [width, setWidth] = useState(6);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [aiGuess, setAiGuess] = useState<string | null>(null);
  const [isGuessing, setIsGuessing] = useState(false);
  const [guessHistory, setGuessHistory] = useState<{ guess: string; correct: boolean }[]>([]);
  const [winner, setWinner] = useState<{ userId: string; username: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const guessTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastGuessTime = useRef(0);
  const allStrokesRef = useRef<Stroke[]>([]);

  // Server assigns drawer role and prompt
  useEffect(() => {
    socket.on("pictionary:your_turn", ({ prompt: p }: { prompt: string }) => {
      setPrompt(p);
      setIsDrawer(true);
    });

    socket.on("pictionary:new_stroke", (stroke: Stroke) => {
      allStrokesRef.current = [...allStrokesRef.current, stroke];
      setStrokes([...allStrokesRef.current]);
      redrawCanvas(allStrokesRef.current);
    });

    socket.on("pictionary:clear", () => {
      allStrokesRef.current = [];
      setStrokes([]);
      clearCanvas();
    });

    socket.on("pictionary:winner", (data: { userId: string; username: string }) => {
      setWinner(data);
      onGameEnd(data.userId, data.username);
    });

    socket.on("pictionary:start", ({ drawerId, prompt: p }: { drawerId: string; prompt: string }) => {
      if (drawerId === userId) {
        setPrompt(p);
        setIsDrawer(true);
      }
      // Start countdown
      let t = 60;
      setTimeLeft(t);
      gameTimerRef.current = setInterval(() => {
        t--;
        setTimeLeft(t);
        if (t <= 0) {
          clearInterval(gameTimerRef.current!);
          socket.emit("pictionary:time_up", { roomCode });
        }
      }, 1000);
    });

    return () => {
      socket.off("pictionary:your_turn");
      socket.off("pictionary:new_stroke");
      socket.off("pictionary:clear");
      socket.off("pictionary:winner");
      socket.off("pictionary:start");
      if (guessTimerRef.current) clearInterval(guessTimerRef.current);
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [socket, roomCode, userId, onGameEnd]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const redrawCanvas = useCallback((strokeList: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokeList) {
      if (stroke.points.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const pt of stroke.points.slice(1)) ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    redrawCanvas(strokes);
  }, [strokes, redrawCanvas]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const pos = getPos(e, canvas);
    setIsDrawing(true);
    setCurrentStroke([pos]);

    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isDrawer) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const pos = getPos(e, canvas);
    setCurrentStroke((prev) => [...prev, pos]);

    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handleEnd = () => {
    if (!isDrawer || !isDrawing) return;
    setIsDrawing(false);

    const stroke: Stroke = { points: currentStroke, color, width };
    allStrokesRef.current = [...allStrokesRef.current, stroke];
    setStrokes([...allStrokesRef.current]);

    // Broadcast stroke to other players
    socket.emit("pictionary:stroke", { roomCode, stroke });

    // Throttle AI guessing to every 3 seconds
    const now = Date.now();
    if (!isGuessing && now - lastGuessTime.current > 3000) {
      lastGuessTime.current = now;
      triggerAiGuess();
    }
  };

  const triggerAiGuess = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGuessing(true);

    try {
      const imageData = canvas.toDataURL("image/png").split(",")[1];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 100,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/png", data: imageData },
                },
                {
                  type: "text",
                  text: `You are guessing what someone drew in a Pictionary-style game. The drawing is goose-themed. Look at this drawing and give your best guess in 1-5 words. Be specific and creative. Just say the guess, nothing else. Example: "goose riding a bicycle"`,
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      const guess = data.content?.[0]?.text?.trim() ?? "a mysterious goose";
      setAiGuess(guess);

      // Check if guess matches prompt (fuzzy match)
      const correct = prompt
        ? prompt.toLowerCase().split(" ").some((w) => guess.toLowerCase().includes(w) && w.length > 3)
        : false;

      setGuessHistory((prev) => [{ guess, correct }, ...prev.slice(0, 4)]);

      if (correct) {
        socket.emit("pictionary:ai_guessed", { roomCode, prompt, guess });
      }
    } catch (err) {
      console.error("AI guess failed:", err);
    } finally {
      setIsGuessing(false);
    }
  };

  const handleClear = () => {
    allStrokesRef.current = [];
    setStrokes([]);
    clearCanvas();
    socket.emit("pictionary:clear", { roomCode });
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {/* Timer + prompt */}
      <div className="flex items-center justify-between w-full">
        <div
          className="px-4 py-1.5 rounded-full text-sm font-semibold"
          style={{ background: "#EEEDFE", color: "#534AB7" }}
        >
          {isDrawer ? `Draw: "${prompt}"` : "Guess the drawing!"}
        </div>
        <div
          className="text-sm font-mono font-bold px-3 py-1 rounded-full"
          style={{
            background: timeLeft <= 10 ? "#FCEBEB" : "#EAF3DE",
            color: timeLeft <= 10 ? "#A32D2D" : "#3B6D11",
          }}
        >
          {timeLeft}s
        </div>
      </div>

      {/* Winner banner */}
      {winner && (
        <div
          className="w-full text-center py-3 rounded-xl font-bold text-lg"
          style={{ background: "#FAEEDA", color: "#BA7517", border: "1.5px solid #FAC775" }}
        >
          🏆 AI guessed "{prompt}" from {winner.username}'s drawing!
        </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={480}
        height={320}
        className="rounded-2xl touch-none w-full"
        style={{
          border: "2px solid #CECBF6",
          background: "#fff",
          cursor: isDrawer ? "crosshair" : "not-allowed",
          maxHeight: 320,
        }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />

      {/* Drawing tools */}
      {isDrawer && (
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {/* Colors */}
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{
                  background: c,
                  border: color === c ? "3px solid #7F77DD" : "2px solid transparent",
                  outline: color === c ? "2px solid white" : "none",
                }}
              />
            ))}
          </div>

          {/* Brush sizes */}
          <div className="flex gap-2 items-center">
            {WIDTHS.map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className="rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition"
                style={{
                  width: w + 16,
                  height: w + 16,
                  border: width === w ? "2px solid #7F77DD" : "2px solid transparent",
                }}
              >
                <span
                  className="rounded-full bg-gray-700"
                  style={{ width: w, height: w }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={handleClear}
            className="px-3 py-1 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition"
            style={{ border: "1px solid #D3D1C7" }}
          >
            Clear
          </button>
        </div>
      )}

      {/* AI guess feed */}
      <div className="w-full">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">AI Guesses</span>
          {isGuessing && (
            <span className="text-xs text-purple-500 animate-pulse">thinking…</span>
          )}
        </div>
        <div className="space-y-1.5">
          {guessHistory.length === 0 && (
            <p className="text-sm text-gray-400 italic">AI will guess as you draw…</p>
          )}
          {guessHistory.map((g, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
              style={{
                background: g.correct ? "#EAF3DE" : "#F1EFE8",
                border: g.correct ? "1px solid #C0DD97" : "1px solid #D3D1C7",
              }}
            >
              <span style={{ fontSize: 16 }}>{g.correct ? "✓" : "?"}</span>
              <span style={{ color: g.correct ? "#3B6D11" : "#5F5E5A" }}>{g.guess}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
