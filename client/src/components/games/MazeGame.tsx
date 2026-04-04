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

const COLS = 12;
const ROWS = 12;
const CELL_SIZE = 36;

function generateMaze(rows: number, cols: number): Cell[][] {
  const grid: Cell[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r,
      col: c,
      walls: { top: true, right: true, bottom: true, left: true },
      visited: false,
    }))
  );

  const stack: Cell[] = [];
  const start = grid[0][0];
  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors: { cell: Cell; dir: string }[] = [];
    const { row, col } = current;

    if (row > 0 && !grid[row - 1][col].visited)
      neighbors.push({ cell: grid[row - 1][col], dir: "top" });
    if (col < cols - 1 && !grid[row][col + 1].visited)
      neighbors.push({ cell: grid[row][col + 1], dir: "right" });
    if (row < rows - 1 && !grid[row + 1][col].visited)
      neighbors.push({ cell: grid[row + 1][col], dir: "bottom" });
    if (col > 0 && !grid[row][col - 1].visited)
      neighbors.push({ cell: grid[row][col - 1], dir: "left" });

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const { cell: next, dir } = neighbors[Math.floor(Math.random() * neighbors.length)];
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

type MazeSeed = number;

function seededMaze(seed: MazeSeed) {
  // Deterministic maze using seed — same seed = same maze for all players
  // We encode seed into a stable grid by using it to shuffle directions
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
  const [playerPos, setPlayerPos] = useState({ row: 0, col: 0 });
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [winner, setWinner] = useState<{ id: string; name: string } | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 100000));
  const posRef = useRef({ row: 0, col: 0 });

  // On mount, broadcast seed to sync maze across all players
  useEffect(() => {
    socket.emit("maze:sync_seed", { roomCode, seed });

    socket.on("maze:seed", (incomingSeed: number) => {
      setMaze(seededMaze(incomingSeed));
    });

    socket.on("maze:winner", (data: { userId: string; username: string }) => {
      setWinner({ id: data.userId, name: data.username });
      onGameEnd(data.userId, data.username);
    });

    return () => {
      socket.off("maze:seed");
      socket.off("maze:winner");
    };
  }, [socket, roomCode, seed, onGameEnd]);

  useEffect(() => {
    if (!maze) return;
    drawMaze();
  }, [maze, path]);

  const drawMaze = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !maze) return;
    const ctx = canvas.getContext("2d")!;
    const W = COLS * CELL_SIZE;
    const H = ROWS * CELL_SIZE;
    canvas.width = W + 2;
    canvas.height = H + 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw finish
    ctx.fillStyle = "#5DCAA5";
    ctx.fillRect(
      (COLS - 1) * CELL_SIZE + 1, (ROWS - 1) * CELL_SIZE + 1,
      CELL_SIZE - 1, CELL_SIZE - 1
    );

    // Draw walls
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
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

    // Draw user path
    if (path.length > 1) {
      ctx.strokeStyle = "#7F77DD";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (const p of path.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }

    // Draw player goose emoji placeholder
    const { row, col } = posRef.current;
    ctx.fillStyle = "#7F77DD";
    ctx.beginPath();
    ctx.arc(
      col * CELL_SIZE + CELL_SIZE / 2 + 1,
      row * CELL_SIZE + CELL_SIZE / 2 + 1,
      10, 0, Math.PI * 2
    );
    ctx.fill();
  }, [maze, path]);

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
    if (winner || !maze) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = cellFromCanvas(x, y);
    if (cell.row === posRef.current.row && cell.col === posRef.current.col) {
      setDrawing(true);
      setPath([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !maze) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cell = cellFromCanvas(x, y);

    if (
      cell.row >= 0 && cell.row < ROWS && cell.col >= 0 && cell.col < COLS &&
      canMove(posRef.current, cell)
    ) {
      posRef.current = cell;
      setPlayerPos({ ...cell });
      setPath((prev) => [...prev, { x, y }]);

      // Check win condition
      if (cell.row === ROWS - 1 && cell.col === COLS - 1) {
        socket.emit("maze:solved", { roomCode, userId, username });
        setDrawing(false);
      }
    }
  };

  const handleMouseUp = () => setDrawing(false);

  if (!maze) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-lg animate-pulse">Loading maze…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-gray-500">
        Draw a path from the <span className="font-semibold text-purple-600">top-left</span> to the{" "}
        <span className="font-semibold text-teal-500">bottom-right</span>. First to finish wins!
      </p>

      {winner && (
        <div className="bg-yellow-100 border border-yellow-300 rounded-xl px-6 py-3 text-yellow-800 font-semibold text-lg">
          🏆 {winner.name} solved the maze first!
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="border border-gray-300 rounded-xl cursor-crosshair touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ maxWidth: "100%", imageRendering: "crisp-edges" }}
      />

      <p className="text-xs text-gray-400">Click your token, then drag through the maze walls</p>
    </div>
  );
}
