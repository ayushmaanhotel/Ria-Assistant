import React, { useRef, useState, useEffect } from "react";
import { 
  PenTool, 
  Eraser, 
  RotateCcw, 
  Download, 
  Sparkles, 
  FileDown, 
  Check,
  BookOpen
} from "lucide-react";

interface InteractiveWhiteboardProps {
  assistantName: string;
  initialContent?: string;
  onSaveNotes?: (title: string, content: string) => void;
}

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  size: number;
}

const COLOR_PALETTE = [
  { name: "Chalk White", hex: "#f8fafc", bg: "bg-slate-100" },
  { name: "Neon Cyan", hex: "#22d3ee", bg: "bg-cyan-400" },
  { name: "Math Yellow", hex: "#facc15", bg: "bg-yellow-400" },
  { name: "Hindi Pink", hex: "#f472b6", bg: "bg-pink-400" },
  { name: "Emerald Green", hex: "#34d399", bg: "bg-emerald-400" },
  { name: "Purple Glow", hex: "#c084fc", bg: "bg-purple-400" }
];

export const InteractiveWhiteboard: React.FC<InteractiveWhiteboardProps> = ({
  assistantName,
  initialContent,
  onSaveNotes
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<"pen" | "eraser">("pen");
  const [activeColor, setActiveColor] = useState("#22d3ee");
  const [strokeWidth, setStrokeWidth] = useState(3);
  
  // History for undo/redo
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

  // Teaching Notes Text Layer
  const [notesTitle, setNotesTitle] = useState("Mike's Blackboard Notes");
  const [whiteboardText, setWhiteboardText] = useState<string>(() => {
    return initialContent || 
      `# 📝 ${assistantName}'s Interactive Classroom Board\n\n` +
      `Welcome to the Private Room Whiteboard! Here is where we solve complex math, draw science diagrams, practice Hindi Swar/Vyanjan, and write step-by-step notes together.\n\n` +
      `### Example Step-by-Step Math Solution:\n` +
      `1. **Problem**: Solve $2x + 5 = 15$\n` +
      `2. **Step 1 (Subtract 5)**: $2x = 15 - 5 \\Rightarrow 2x = 10$\n` +
      `3. **Step 2 (Divide by 2)**: $x = \\frac{10}{2} \\Rightarrow x = 5$\n` +
      `4. **Answer**: $x = 5$ (Shabaash! 🎉)\n\n` +
      `*Draw or write directly on the board above to practice!*`;
  });

  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savedStatus, setSavedStatus] = useState(false);

  // Synchronize canvas dimensions & redraw strokes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions based on parent container
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // high-DPI scaling
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    redrawCanvas();
  }, [strokes]);

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    setIsDrawing(true);

    const newStroke: Stroke = {
      points: [coords],
      color: activeTool === "eraser" ? "#090b16" : activeColor,
      size: activeTool === "eraser" ? strokeWidth * 6 : strokeWidth
    };
    setCurrentStroke(newStroke);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    const coords = getCanvasCoords(e);

    const updatedStroke = {
      ...currentStroke,
      points: [...currentStroke.points, coords]
    };
    setCurrentStroke(updatedStroke);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = updatedStroke.color;
    ctx.lineWidth = updatedStroke.size;

    const pts = updatedStroke.points;
    if (pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && currentStroke) {
      setStrokes((prev) => [...prev, currentStroke]);
    }
    setIsDrawing(false);
    setCurrentStroke(null);
  };

  const clearBoard = () => {
    setStrokes([]);
    redrawCanvas();
  };

  const downloadCanvasAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `whiteboard_notes_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  const saveToPrivateVault = () => {
    if (onSaveNotes) {
      onSaveNotes(notesTitle, whiteboardText);
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 2500);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#060814] rounded-2xl overflow-hidden border border-white/10 shadow-2xl select-none">
      {/* Top Toolbar */}
      <div className="p-3 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
        {/* Drawing Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTool("pen")}
            className={`p-2 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all ${
              activeTool === "pen"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <PenTool size={14} />
            <span>CHALK / PEN</span>
          </button>

          <button
            onClick={() => setActiveTool("eraser")}
            className={`p-2 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all ${
              activeTool === "eraser"
                ? "bg-pink-500/20 text-pink-300 border border-pink-400/40 shadow-lg"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Eraser size={14} />
            <span>ERASER</span>
          </button>

          {/* Color Palette */}
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <div className="flex items-center space-x-1.5">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.name}
                onClick={() => {
                  setActiveColor(c.hex);
                  setActiveTool("pen");
                }}
                className={`w-6 h-6 rounded-full ${c.bg} transition-transform ${
                  activeColor === c.hex && activeTool === "pen" ? "scale-125 ring-2 ring-white" : "hover:scale-110"
                }`}
                title={c.name}
              />
            ))}
          </div>

          {/* Stroke Thickness */}
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <div className="flex items-center space-x-1">
            {[2, 4, 8].map((size) => (
              <button
                key={size}
                onClick={() => setStrokeWidth(size)}
                className={`w-6 h-6 rounded-lg text-[10px] font-mono flex items-center justify-center transition-all ${
                  strokeWidth === size ? "bg-white/20 text-white border border-white/30" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {size}px
              </button>
            ))}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={clearBoard}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-xs font-mono flex items-center gap-1"
            title="Clear Blackboard Canvas"
          >
            <RotateCcw size={14} />
            <span>CLEAR</span>
          </button>

          <button
            onClick={downloadCanvasAsImage}
            className="p-2 rounded-xl text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all text-xs font-mono flex items-center gap-1.5"
            title="Export Board Image"
          >
            <Download size={14} />
            <span>EXPORT PNG</span>
          </button>

          <button
            onClick={saveToPrivateVault}
            className="p-2 rounded-xl text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all text-xs font-mono flex items-center gap-1.5"
          >
            {savedStatus ? <Check size={14} className="text-emerald-400" /> : <FileDown size={14} />}
            <span>{savedStatus ? "SAVED TO VAULT!" : "SAVE NOTES"}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Whiteboard View (Split View: Canvas + Formatted Notes) */}
      <div className="flex-1 relative overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-0 bg-[#090b16]">
        {/* Left Half: Freehand Blackboard Drawing Canvas */}
        <div className="relative w-full h-full min-h-[300px] border-r border-white/10 bg-[#050711] flex flex-col">
          <div className="absolute top-3 left-3 z-10 text-[10px] font-mono text-cyan-300 bg-black/60 px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
            <Sparkles size={12} className="text-cyan-400 animate-pulse" />
            <span>BLACKBOARD DRAWING CANVAS</span>
          </div>

          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair touch-none"
          />
        </div>

        {/* Right Half: Formatted Teacher Lesson Notes & Formula Board */}
        <div className="relative w-full h-full flex flex-col bg-black/40 p-4 overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center space-x-2">
              <BookOpen size={16} className="text-amber-400" />
              <input
                type="text"
                value={notesTitle}
                onChange={(e) => setNotesTitle(e.target.value)}
                className="bg-transparent text-sm font-bold text-white font-sans focus:outline-none border-b border-transparent focus:border-amber-400/50"
              />
            </div>
            <button
              onClick={() => setIsEditingNotes(!isEditingNotes)}
              className="text-[10px] font-mono px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/10"
            >
              {isEditingNotes ? "VIEW FORMATTED" : "EDIT TEXT"}
            </button>
          </div>

          {isEditingNotes ? (
            <textarea
              value={whiteboardText}
              onChange={(e) => setWhiteboardText(e.target.value)}
              className="w-full flex-1 bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-none min-h-[250px]"
              placeholder="Write lesson notes, equations, or Hindi characters here..."
            />
          ) : (
            <div className="flex-1 text-xs text-slate-300 font-sans space-y-3 whitespace-pre-wrap leading-relaxed">
              {whiteboardText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
