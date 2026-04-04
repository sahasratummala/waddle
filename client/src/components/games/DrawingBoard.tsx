import { useRef, forwardRef, useImperativeHandle, useState } from "react";
import { Eraser, Trash2 } from "lucide-react";

const COLORS = [
  { name: "Black",  value: "#1a1a1a" },
  { name: "Red",    value: "#e53935" },
  { name: "Blue",   value: "#1e88e5" },
  { name: "Green",  value: "#43a047" },
  { name: "Orange", value: "#fb8c00" },
];

export interface DrawingBoardRef {
  /** Returns base64-encoded PNG of the canvas (without the data: prefix) */
  getImageData: () => string;
  clear: () => void;
}

interface DrawingBoardProps {
  disabled?: boolean;
}

const DrawingBoard = forwardRef<DrawingBoardRef, DrawingBoardProps>(
  ({ disabled = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [tool, setTool] = useState<"pen" | "eraser">("pen");
    const [color, setColor] = useState(COLORS[0].value);
    const isDrawing = useRef(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    useImperativeHandle(ref, () => ({
      getImageData: () => {
        const canvas = canvasRef.current;
        if (!canvas) return "";
        return canvas.toDataURL("image/png").split(",")[1];
      },
      clear: () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      },
    }));

    function getPos(
      e: React.MouseEvent | React.TouchEvent,
      canvas: HTMLCanvasElement
    ): { x: number; y: number } {
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
    }

    function startDraw(e: React.MouseEvent | React.TouchEvent) {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.preventDefault();
      isDrawing.current = true;
      lastPos.current = getPos(e, canvas);
    }

    function draw(e: React.MouseEvent | React.TouchEvent) {
      if (!isDrawing.current || disabled) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || !lastPos.current) return;
      e.preventDefault();
      const pos = getPos(e, canvas);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
      ctx.lineWidth = tool === "eraser" ? 28 : 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
    }

    function endDraw() {
      isDrawing.current = false;
      lastPos.current = null;
    }

    function handleClear() {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    return (
      <div className="flex flex-col gap-2">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-1">
          {/* Color swatches */}
          <div className="flex items-center gap-2">
            {COLORS.map((c) => {
              const active = color === c.value && tool === "pen";
              return (
                <button
                  key={c.name}
                  title={c.name}
                  onClick={() => { setColor(c.value); setTool("pen"); }}
                  className="rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    width: active ? 28 : 24,
                    height: active ? 28 : 24,
                    background: c.value,
                    borderColor: active ? "#282C15" : "rgba(40,44,21,0.15)",
                    boxShadow: active ? "0 0 0 2px #fff, 0 0 0 4px #282C15" : "none",
                  }}
                />
              );
            })}
          </div>

          {/* Tool buttons */}
          <div className="flex items-center gap-1.5">
            <button
              title="Eraser"
              onClick={() => setTool("eraser")}
              className={`p-1.5 rounded-lg border transition-all ${
                tool === "eraser"
                  ? "bg-forest/10 border-forest/30 text-forest"
                  : "border-forest/10 text-forest/40 hover:text-forest hover:border-forest/25"
              }`}
            >
              <Eraser className="w-4 h-4" />
            </button>
            <button
              title="Clear canvas"
              onClick={handleClear}
              className="p-1.5 rounded-lg border border-forest/10 text-forest/40 hover:text-red-500 hover:border-red-300 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={380}
          className="w-full rounded-2xl border-2 border-forest/12 bg-white touch-none"
          style={{
            cursor: tool === "eraser" ? "cell" : "crosshair",
            opacity: disabled ? 0.5 : 1,
          }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
    );
  }
);

DrawingBoard.displayName = "DrawingBoard";
export default DrawingBoard;
