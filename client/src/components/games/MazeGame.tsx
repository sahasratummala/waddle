import { useEffect, useRef, useState, useCallback } from "react";
import { Socket } from "socket.io-client";

interface MazeGameProps {
  socket: Socket;
  roomCode: string;
  userId: string;
  username: string;
  onGameEnd: (winnerId: string, winnerName: string) => void;
}

interface Cell {
  row: number;
  col: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

const COLS = 11;
const ROWS = 11;
const CELL_SIZE = 36;

function seededMaze(seed: number) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };

  const grid: Cell[][] = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => ({
      row: r, col: c,
      walls: { top: true, right: true, bottom: true, left: true },
      visited: false,
    }))
  );

  const stack: Cell[] = [];
  grid[0][0].visited = true;
  stack.push(grid[0][0]);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const { row, col } = current;
    const neighbors: { cell: Cell; dir: string }[] = [];

    if (row > 0 && !grid[row - 1][col].visited)
      neighbors.push({ cell: grid[row - 1][col], dir: "top" });
    if (col < COLS - 1 && !grid[row][col + 1].visited)
      neighbors.push({ cell: grid[row][col + 1], dir: "right" });
    if (row < ROWS - 1 && !grid[row + 1][col].visited)
      neighbors.push({ cell: grid[row + 1][col], dir: "bottom" });
    if (col > 0 && !grid[row][col - 1].visited)
      neighbors.push({ cell: grid[row][col - 1], dir: "left" });

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const idx = Math.floor(rand() * neighbors.length);
      const { cell: next, dir } = neighbors[idx];
      if (dir === "top") { current.walls.top = false; next.walls.bottom = false; }
      if (dir === "right") { current.walls.right = false; next.walls.left = false; }
      if (dir === "bottom") { current.walls.bottom = false; next.walls.top = false; }
      if (dir === "left") { current.walls.left = false; next.walls.right = false; }
      next.visited = true;
      stack.push(next);
    }
  }

  return grid;
}

export default function MazeGame({ socket, roomCode, userId, username, onGameEnd }: MazeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [maze, setMaze] = useState<Cell[][] | null>(null);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
  const posRef = useRef({ row: 0, col: 0 });
  const displayRef = useRef({ x: CELL_SIZE / 2 + 1, y: CELL_SIZE / 2 + 1 });
  const animRef = useRef<number | null>(null);
  // This ref lets us lock input immediately without waiting for React state update
  const wonRef = useRef(false);

  const centerOf = (row: number, col: number) => ({
    x: col * CELL_SIZE + CELL_SIZE / 2 + 1,
    y: row * CELL_SIZE + CELL_SIZE / 2 + 1,
  });

  useEffect(() => {
    if (roomCode === "SOLO_GAME") {
      setMaze(seededMaze(seed));
      return;
    }

    socket.on("maze:seed", (incomingSeed: number) => {
      setMaze(seededMaze(incomingSeed));
    });

    // This fires for ALL players when anyone finishes — locks everyone out
    socket.on("maze:winner", (data: { userId: string; username: string }) => {
      wonRef.current = true;
      setWinner({ id: data.userId, name: data.username });
      setDrawing(false);
      onGameEnd(data.userId, data.username);
    });

    socket.emit("maze:sync_seed", { roomCode, seed });

    return () => {
      socket.off("maze:seed");
      socket.off("maze:winner");
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [socket, roomCode, seed, onGameEnd]);

  const drawMaze = useCallback((currentPath: { x: number; y: number }[]) => {
    const canvas = canvasRef.current;
    if (!canvas || !maze) return;
    const ctx = canvas.getContext("2d")!;
    canvas.width = COLS * CELL_SIZE + 2;
    canvas.height = ROWS * CELL_SIZE + 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Finish square
    ctx.fillStyle = "#9FE1CB";
    ctx.beginPath();
    (ctx as any).roundRect((COLS - 1) * CELL_SIZE + 1, (ROWS - 1) * CELL_SIZE + 1, CELL_SIZE - 1, CELL_SIZE - 1, 6);
    ctx.fill();
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🏁", (COLS - 1) * CELL_SIZE + CELL_SIZE / 2 + 1, (ROWS - 1) * CELL_SIZE + CELL_SIZE / 2 + 1);

    // Walls
    ctx.strokeStyle = "#97C459";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = maze[r][c];
        const x = c * CELL_SIZE + 1;
        const y = r * CELL_SIZE + 1;
        ctx.beginPath();
        if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + CELL_SIZE, y); }
        if (cell.walls.right) { ctx.moveTo(x + CELL_SIZE, y); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); }
        if (cell.walls.bottom) { ctx.moveTo(x, y + CELL_SIZE); ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE); }
        if (cell.walls.left) { ctx.moveTo(x, y); ctx.lineTo(x, y + CELL_SIZE); }
        ctx.stroke();
      }
    }

    // Path trail
    if (currentPath.length > 1) {
      ctx.strokeStyle = "#C0DD97";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      for (const p of currentPath.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // Player token
    const { x: px, y: py } = displayRef.current;
    ctx.fillStyle = "rgba(99,153,34,0.15)";
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#639922";
    ctx.beginPath();
    ctx.arc(px, py, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "13px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐣", px, py);
  }, [maze]);

  const animateTo = useCallback((tx: number, ty: number, currentPath: { x: number; y: number }[]) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const step = () => {
      displayRef.current.x += (tx - displayRef.current.x) * 0.35;
      displayRef.current.y += (ty - displayRef.current.y) * 0.35;
      drawMaze(currentPath);
      if (Math.abs(displayRef.current.x - tx) > 0.5 || Math.abs(displayRef.current.y - ty) > 0.5) {
        animRef.current = requestAnimationFrame(step);
      } else {
        displayRef.current.x = tx;
        displayRef.current.y = ty;
        drawMaze(currentPath);
      }
    };
    step();
  }, [drawMaze]);

  useEffect(() => {
    if (!maze) return;
    drawMaze(path);
  }, [maze, drawMaze]);

  const cellFromCanvas = (x: number, y: number) => ({
    col: Math.floor((x - 1) / CELL_SIZE),
    row: Math.floor((y - 1) / CELL_SIZE),
  });

  const canMove = (from: { row: number; col: number }, to: { row: number; col: number }) => {
    if (!maze) return false;
    const dr = to.row - from.row;
    const dc = to.col - from.col;
    if (Math.abs(dr) + Math.abs(dc) !== 1) return false;
    const cell = maze[from.row][from.col];
    if (dr === -1 && cell.walls.top) return false;
    if (dr === 1 && cell.walls.bottom) return false;
    if (dc === 1 && cell.walls.right) return false;
    if (dc === -1 && cell.walls.left) return false;
    return true;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (wonRef.current || !maze) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current!.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current!.height / rect.height);
    const cell = cellFromCanvas(x, y);
    if (cell.row === posRef.current.row && cell.col === posRef.current.col) {
      setDrawing(true);
      const c = centerOf(posRef.current.row, posRef.current.col);
      setPath([c]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || wonRef.current || !maze) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasRef.current!.width / rect.width);
    const y = (e.clientY - rect.top) * (canvasRef.current!.height / rect.height);
    const cell = cellFromCanvas(x, y);

    if (
      cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS &&
      canMove(posRef.current, cell)
    ) {
      posRef.current = cell;
      const c = centerOf(cell.row, cell.col);
      const newPath = [...path, c];
      setPath(newPath);
      animateTo(c.x, c.y, newPath);

      if (cell.row === ROWS - 1 && cell.col === COLS - 1) {
        wonRef.current = true;
        setDrawing(false);
        if (roomCode !== "SOLO_GAME") {
          // Tell the server — server awards points and broadcasts maze:winner to all players
          socket.emit("maze:solved", { roomCode, userId, username });
        } else {
          // Solo mode — just end locally
          setWinner({ id: userId, name: username });
          onGameEnd(userId, username);
        }
      }
    }
  };

  const handleMouseUp = () => setDrawing(false);

  if (!maze) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 text-lg animate-pulse">🌱 Growing the maze…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4 flex-wrap justify-center text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-full bg-green-600"></span> You
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-teal-300"></span> Finish
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 h-1 rounded bg-green-200"></span> Your path
        </span>
      </div>

      {winner && (
        <div className="bg-green-50 border-2 border-green-300 rounded-2xl px-6 py-3 text-green-800 font-semibold text-lg text-center">
          {winner.id === userId ? "🌸 You solved it first! 🌸" : `🏆 ${winner.name} solved the maze first!`}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="rounded-2xl touch-none"
        style={{ border: "2.5px solid #97C459", maxWidth: "100%", imageRendering: "crisp-edges", cursor: wonRef.current ? "default" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <p className="text-xs text-gray-400">Click your 🐣, then drag through the passages</p>
    </div>
  );
}