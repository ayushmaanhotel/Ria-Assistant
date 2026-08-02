import React, { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { 
  Pencil, Eraser, Type, Minus, Square, Circle, ArrowUpRight, 
  Undo, Redo, Grid, ZoomIn, ZoomOut, Save, Share, GripVertical,
  BookOpen, Edit3, FileDown, Highlighter, Sparkles, Trash2, 
  Calculator, Check, Copy, Compass
} from 'lucide-react';
import { renderMathInText } from '../lib/mathRenderer';

export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text' | 'line' | 'rect' | 'circle' | 'arrow' | 'stamp';
export type CanvasTheme = 'dark' | 'chalkboard' | 'graph' | 'dots' | 'ruled';

export interface AIDrawCommand {
  type: ToolType | 'clear';
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  color?: string;
  width?: number;
  text?: string;
}

export interface InteractiveWhiteboardProps {
  initialNotes?: string;
  onNotesChange?: (notes: string) => void;
  aiCommands?: AIDrawCommand[];
  onCanvasShare?: (dataUrl: string) => void;
  onSaveStudyPack?: (data: { image: string, notes: string }) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: ToolType;
  color: string;
  width: number;
  points: Point[];
  endX?: number;
  endY?: number;
  text?: string;
  isAI?: boolean;
}

const COLORS = [
  '#ffffff', '#ff5252', '#ffeb3b', '#4caf50', 
  '#2196f3', '#9c27b0', '#ff9800', '#00bcd4'
];

const STAMPS = ['π', '√x', '∫', '∑', 'α', 'θ', 'Δ', '∞', 'a/b'];

const FORMULA_SHEET = [
  { name: 'Quadratic', formula: '$$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$' },
  { name: 'Pythagorean', formula: '$$a^2 + b^2 = c^2$$' },
  { name: 'Euler\'s', formula: '$$e^{i\\pi} + 1 = 0$$' },
  { name: 'Calculus FTC', formula: '$$\\int_a^b f(x)dx = F(b) - F(a)$$' }
];

export const InteractiveWhiteboard: React.FC<InteractiveWhiteboardProps> = ({
  initialNotes = '',
  onNotesChange,
  aiCommands,
  onCanvasShare,
  onSaveStudyPack
}) => {
  // State
  const [activeTool, setActiveTool] = useState<ToolType>('pen');
  const [currentColor, setCurrentColor] = useState<string>(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(2);
  const [theme, setTheme] = useState<CanvasTheme>('dark');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(1);
  const [notes, setNotes] = useState<string>(initialNotes);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'formulas'>('edit');
  const [notesWidth, setNotesWidth] = useState<number>(400);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [textInput, setTextInput] = useState<{ x: number, y: number, value: string, visible: boolean }>({ x: 0, y: 0, value: '', visible: false });
  const [activeStamp, setActiveStamp] = useState<string>(STAMPS[0]);
  const [aiActive, setAiActive] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // Splitter logic
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      
      // Setup DPI scaling
      const dpr = window.devicePixelRatio || 1;
      const rect = parent.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctxRef.current = ctx;
        redrawCanvas();
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas(); // Initial setup

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Redraw canvas whenever relevant state changes
  useEffect(() => {
    redrawCanvas();
  }, [strokes, currentStroke, theme, showGrid, zoom]);

  // Process AI Commands
  useEffect(() => {
    if (!aiCommands || aiCommands.length === 0) return;
    
    setAiActive(true);
    let newStrokes = [...strokes];
    
    aiCommands.forEach(cmd => {
      if (cmd.type === 'clear') {
        newStrokes = [];
      } else {
        newStrokes.push({
          tool: cmd.type,
          color: cmd.color || currentColor,
          width: cmd.width || strokeWidth,
          points: [{ x: cmd.x, y: cmd.y }],
          endX: cmd.endX || cmd.x,
          endY: cmd.endY || cmd.y,
          text: cmd.text,
          isAI: true
        });
      }
    });
    
    setStrokes(newStrokes);
    setTimeout(() => setAiActive(false), 2000);
  }, [aiCommands]);

  const drawThemeBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    
    switch (theme) {
      case 'chalkboard':
        ctx.fillStyle = '#2c4c3b';
        ctx.fillRect(0, 0, width, height);
        break;
      case 'dark':
        ctx.fillStyle = '#1e1e24';
        ctx.fillRect(0, 0, width, height);
        break;
      case 'graph':
      case 'dots':
      case 'ruled':
        ctx.fillStyle = '#1e1e24'; // base
        ctx.fillRect(0, 0, width, height);
        break;
    }
    
    if (showGrid) {
      const gridSize = 20 * zoom;
      ctx.beginPath();
      ctx.strokeStyle = theme === 'chalkboard' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      
      if (theme === 'dots') {
        for (let x = gridSize; x < width; x += gridSize) {
          for (let y = gridSize; y < height; y += gridSize) {
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      } else if (theme === 'ruled') {
        // Horizontal lines only + margin
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)'; // cyan-ish
        ctx.beginPath();
        ctx.moveTo(80, 0);
        ctx.lineTo(80, height);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        for (let y = gridSize; y < height; y += gridSize * 2) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }
      } else {
        // Full grid (graph or default)
        for (let x = gridSize; x < width; x += gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = gridSize; y < height; y += gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        
        if (theme === 'graph') {
          // Axes
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width/2, 0);
          ctx.lineTo(width/2, height);
          ctx.moveTo(0, height/2);
          ctx.lineTo(width, height/2);
          ctx.stroke();
        } else {
          ctx.stroke();
        }
      }
    }
    
    ctx.restore();
  };

  const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Stroke) => {
    if (stroke.points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width * zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (stroke.tool === 'highlighter') {
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = stroke.width * zoom * 3;
    } else if (stroke.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = stroke.width * zoom * 5;
    }

    if (stroke.isAI) {
      ctx.shadowColor = 'rgba(34, 211, 238, 0.5)';
      ctx.shadowBlur = 10;
    }

    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    const ex = stroke.endX !== undefined ? stroke.endX : end.x;
    const ey = stroke.endY !== undefined ? stroke.endY : end.y;

    switch (stroke.tool) {
      case 'pen':
      case 'highlighter':
      case 'eraser':
        ctx.beginPath();
        ctx.moveTo(start.x * zoom, start.y * zoom);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * zoom, stroke.points[i].y * zoom);
        }
        ctx.stroke();
        break;
      case 'line':
        ctx.beginPath();
        ctx.moveTo(start.x * zoom, start.y * zoom);
        ctx.lineTo(ex * zoom, ey * zoom);
        ctx.stroke();
        break;
      case 'rect':
        ctx.beginPath();
        ctx.rect(start.x * zoom, start.y * zoom, (ex - start.x) * zoom, (ey - start.y) * zoom);
        ctx.stroke();
        break;
      case 'circle':
        ctx.beginPath();
        const r = Math.sqrt(Math.pow(ex - start.x, 2) + Math.pow(ey - start.y, 2));
        ctx.arc(start.x * zoom, start.y * zoom, r * zoom, 0, 2 * Math.PI);
        ctx.stroke();
        break;
      case 'arrow':
        const headlen = 15 * zoom;
        const angle = Math.atan2(ey - start.y, ex - start.x);
        ctx.beginPath();
        ctx.moveTo(start.x * zoom, start.y * zoom);
        ctx.lineTo(ex * zoom, ey * zoom);
        ctx.lineTo(ex * zoom - headlen * Math.cos(angle - Math.PI / 6), ey * zoom - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(ex * zoom, ey * zoom);
        ctx.lineTo(ex * zoom - headlen * Math.cos(angle + Math.PI / 6), ey * zoom - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
        break;
      case 'text':
      case 'stamp':
        if (stroke.text) {
          ctx.font = `${16 * zoom * Math.max(1, stroke.width/2)}px system-ui, sans-serif`;
          ctx.textBaseline = 'top';
          ctx.fillText(stroke.text, start.x * zoom, start.y * zoom);
        }
        break;
    }
    
    ctx.restore();
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    
    // Scale coords to logical CSS pixels based on parent
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    drawThemeBackground(ctx, rect.width, rect.height);
    
    strokes.forEach(s => drawStroke(ctx, s));
    if (currentStroke) {
      drawStroke(ctx, currentStroke);
    }
  };

  // Input Handling
  const getMousePos = (e: ReactMouseEvent | ReactTouchEvent | MouseEvent | TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as ReactMouseEvent | MouseEvent).clientX;
      clientY = (e as ReactMouseEvent | MouseEvent).clientY;
    }
    
    return {
      x: (clientX - rect.left) / zoom,
      y: (clientY - rect.top) / zoom
    };
  };

  const handleStart = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (activeTool === 'text') {
      const pos = getMousePos(e);
      if (textInput.visible) {
        // Commit text
        if (textInput.value.trim()) {
          commitText();
        } else {
          setTextInput({ ...textInput, visible: false });
        }
      } else {
        setTextInput({ x: pos.x, y: pos.y, value: '', visible: true });
        setTimeout(() => textInputRef.current?.focus(), 10);
      }
      return;
    }
    
    if (activeTool === 'stamp') {
      const pos = getMousePos(e);
      commitStamp(pos.x, pos.y);
      return;
    }

    setIsDrawing(true);
    const pos = getMousePos(e);
    setCurrentStroke({
      tool: activeTool,
      color: currentColor,
      width: strokeWidth,
      points: [pos],
      endX: pos.x,
      endY: pos.y
    });
  };

  const handleMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!isDrawing || !currentStroke) return;
    
    const pos = getMousePos(e);
    
    if (['pen', 'highlighter', 'eraser'].includes(activeTool)) {
      setCurrentStroke(prev => ({
        ...prev!,
        points: [...prev!.points, pos]
      }));
    } else {
      setCurrentStroke(prev => ({
        ...prev!,
        endX: pos.x,
        endY: pos.y
      }));
    }
  };

  const handleEnd = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    
    // Don't save tiny strokes if they are lines/shapes
    if (['line', 'rect', 'circle', 'arrow'].includes(activeTool)) {
      const dx = (currentStroke.endX || 0) - currentStroke.points[0].x;
      const dy = (currentStroke.endY || 0) - currentStroke.points[0].y;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
        setCurrentStroke(null);
        return;
      }
    }
    
    setStrokes([...strokes, currentStroke]);
    setRedoStack([]);
    setCurrentStroke(null);
  };

  const commitText = () => {
    if (textInput.value.trim()) {
      const newStroke: Stroke = {
        tool: 'text',
        color: currentColor,
        width: strokeWidth,
        points: [{ x: textInput.x, y: textInput.y }],
        text: textInput.value
      };
      setStrokes([...strokes, newStroke]);
      setRedoStack([]);
    }
    setTextInput({ x: 0, y: 0, value: '', visible: false });
  };
  
  const commitStamp = (x: number, y: number) => {
    const newStroke: Stroke = {
      tool: 'stamp',
      color: currentColor,
      width: strokeWidth,
      points: [{ x, y }],
      text: activeStamp
    };
    setStrokes([...strokes, newStroke]);
    setRedoStack([]);
  };

  const handleTextKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      commitText();
    } else if (e.key === 'Escape') {
      setTextInput({ ...textInput, visible: false, value: '' });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) setZoom(z => Math.min(3, z + 0.1));
        else setZoom(z => Math.max(0.5, z - 0.1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    canvasRef.current?.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      canvasRef.current?.removeEventListener('wheel', handleWheel);
    };
  }, [strokes, redoStack]);

  const undo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setStrokes(strokes.slice(0, -1));
    setRedoStack([...redoStack, last]);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setStrokes([...strokes, next]);
  };

  const clearCanvas = () => {
    setStrokes([]);
    setRedoStack([]);
  };

  const shareCanvas = () => {
    if (canvasRef.current && onCanvasShare) {
      onCanvasShare(canvasRef.current.toDataURL('image/png'));
    }
  };

  const saveStudyPack = () => {
    if (canvasRef.current && onSaveStudyPack) {
      onSaveStudyPack({
        image: canvasRef.current.toDataURL('image/png'),
        notes: notes
      });
    }
  };

  // Splitter Handlers
  const handleSplitterMouseDown = () => setIsDraggingSplitter(true);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSplitter || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newNotesWidth = rect.right - e.clientX;
      if (newNotesWidth > 200 && newNotesWidth < rect.width - 200) {
        setNotesWidth(newNotesWidth);
      }
    };
    const handleMouseUp = () => setIsDraggingSplitter(false);
    
    if (isDraggingSplitter) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplitter]);

  const insertFormula = (formula: string) => {
    setNotes(prev => prev + '\n' + formula + '\n');
    setActiveTab('edit');
    if (onNotesChange) onNotesChange(notes + '\n' + formula + '\n');
  };

  const renderToolButton = (tool: ToolType, Icon: any, tooltip: string) => (
    <button
      title={tooltip}
      className={`p-2 rounded-xl transition-all duration-200 ${
        activeTool === tool 
          ? 'bg-[#1a2240] text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.35)] ring-1 ring-cyan-500/50' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
      onClick={() => setActiveTool(tool)}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div ref={containerRef} className="w-full h-full flex bg-[#0a0e1a] text-white overflow-hidden text-[13px]">
      
      {/* 1. FIXED LEFT TOOLBAR (flex-shrink-0) */}
      <div className="w-[56px] shrink-0 bg-[#0f1328]/90 backdrop-blur-xl border-r border-white/[0.06] flex flex-col items-center py-4 gap-4 z-10">
        
        {/* Tools Section */}
        <div className="flex flex-col gap-2 w-full px-2">
          {renderToolButton('pen', Pencil, 'Pen')}
          {renderToolButton('highlighter', Highlighter, 'Highlighter')}
          {renderToolButton('eraser', Eraser, 'Eraser')}
          <div className="w-full h-px bg-white/10 my-1" />
          {renderToolButton('text', Type, 'Text')}
          {renderToolButton('stamp', Calculator, 'Math Stamp')}
          <div className="w-full h-px bg-white/10 my-1" />
          {renderToolButton('line', Minus, 'Line')}
          {renderToolButton('rect', Square, 'Rectangle')}
          {renderToolButton('circle', Circle, 'Circle')}
          {renderToolButton('arrow', ArrowUpRight, 'Arrow')}
        </div>
        
        <div className="w-full h-px bg-white/10" />
        
        {/* Actions */}
        <div className="flex flex-col gap-2 w-full px-2">
          <button onClick={undo} disabled={strokes.length===0} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"><Undo size={18}/></button>
          <button onClick={redo} disabled={redoStack.length===0} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30"><Redo size={18}/></button>
          <button onClick={clearCanvas} className="p-2 rounded-xl text-red-400 hover:bg-red-500/10"><Trash2 size={18}/></button>
        </div>

        <div className="w-full h-px bg-white/10" />

        {/* Colors (Grid) */}
        <div className="grid grid-cols-2 gap-2 px-3">
          {COLORS.map(c => (
            <button
              key={c}
              className={`w-5 h-5 rounded-full transition-transform ${currentColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0f1328]' : 'hover:scale-110'}`}
              style={{ backgroundColor: c }}
              onClick={() => setCurrentColor(c)}
            />
          ))}
        </div>

        {/* Stroke Width Slider (Vertical) */}
        <div className="flex-1 w-full flex flex-col items-center justify-end pb-4">
          <input 
            type="range" 
            min="1" max="20" 
            value={strokeWidth} 
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer -rotate-90 origin-center"
            style={{ marginBottom: '40px' }} // compensate for rotation
          />
        </div>

      </div>

      {/* 2. CANVAS COLUMN (flex-1) */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {/* Top Header Bar */}
        <div className="h-[44px] shrink-0 bg-[#0f1328]/90 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 z-10">
          
          <div className="flex items-center gap-3">
            <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
              {(['dark', 'chalkboard', 'graph', 'dots', 'ruled'] as CanvasTheme[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-3 py-1 rounded-md capitalize transition-colors ${theme === t ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-1.5 rounded-lg border transition-colors ${showGrid ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'border-white/10 text-gray-400'}`}
              title="Toggle Grid"
            >
              <Grid size={16} />
            </button>
            
            {/* Stamp Toolbar inline if active */}
            {activeTool === 'stamp' && (
              <div className="ml-4 flex items-center gap-1 bg-cyan-500/10 rounded-lg p-1 border border-cyan-500/30">
                {STAMPS.map(stamp => (
                  <button
                    key={stamp}
                    onClick={() => setActiveStamp(stamp)}
                    className={`w-7 h-7 rounded flex items-center justify-center font-serif text-sm ${activeStamp === stamp ? 'bg-cyan-500 text-white shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'text-cyan-200 hover:bg-white/10'}`}
                  >
                    {stamp}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {aiActive && (
              <div className="flex items-center gap-2 text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/30 animate-pulse">
                <Sparkles size={14} />
                <span>AI Drawing...</span>
              </div>
            )}
            <button 
              onClick={shareCanvas}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/5"
            >
              <Share size={14} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Canvas Viewport */}
        <div className="flex-1 relative cursor-crosshair overflow-hidden">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 touch-none"
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
          
          {textInput.visible && (
            <input
              ref={textInputRef}
              type="text"
              value={textInput.value}
              onChange={e => setTextInput({ ...textInput, value: e.target.value })}
              onKeyDown={handleTextKeyDown}
              onBlur={commitText}
              className="absolute bg-transparent outline-none m-0 p-0"
              style={{
                left: textInput.x * zoom,
                top: textInput.y * zoom,
                color: currentColor,
                font: `${16 * zoom * Math.max(1, strokeWidth/2)}px system-ui, sans-serif`,
                minWidth: '20px'
              }}
              autoFocus
            />
          )}
        </div>

        {/* Bottom Status Bar */}
        <div className="h-[28px] shrink-0 bg-[#0f1328]/90 border-t border-white/[0.06] flex items-center justify-between px-4 text-[11px] text-gray-500 z-10">
          <div className="flex items-center gap-4">
            <span className="capitalize">{activeTool} Mode</span>
            <span>{strokes.length} strokes</span>
            <span className="capitalize">{theme} Theme</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="hover:text-white"><ZoomOut size={12}/></button>
            <span className="w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="hover:text-white"><ZoomIn size={12}/></button>
          </div>
        </div>

      </div>

      {/* 3. SPLITTER (6px width) */}
      <div 
        className="w-[6px] bg-[#0a0e1a] hover:bg-cyan-500/20 cursor-col-resize flex flex-col justify-center items-center transition-colors border-x border-white/[0.02]"
        onMouseDown={handleSplitterMouseDown}
      >
        <div className="h-8 w-1 rounded-full bg-white/20" />
      </div>

      {/* 4. RIGHT NOTES PANEL (flex) */}
      <div 
        className="shrink-0 flex flex-col bg-[#0f1328]/90 backdrop-blur-xl"
        style={{ width: notesWidth }}
      >
        {/* Notes Header */}
        <div className="h-[44px] shrink-0 border-b border-white/[0.06] flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-cyan-400" />
            <input 
              type="text" 
              defaultValue="Untitled Note" 
              className="bg-transparent border-none text-white outline-none w-32 font-medium"
            />
          </div>
          <div className="flex bg-black/30 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setActiveTab('edit')}
              className={`p-1.5 rounded-md transition-colors ${activeTab === 'edit' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              title="Edit Markdown"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`p-1.5 rounded-md transition-colors ${activeTab === 'preview' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              title="KaTeX Preview"
            >
              <Check size={14} />
            </button>
            <button
              onClick={() => setActiveTab('formulas')}
              className={`p-1.5 rounded-md transition-colors ${activeTab === 'formulas' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              title="Formula Sheet"
            >
              <Compass size={14} />
            </button>
          </div>
          <button
            onClick={saveStudyPack}
            className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-colors shadow-lg shadow-cyan-500/20"
          >
            <FileDown size={14} />
            <span>Export</span>
          </button>
        </div>

        {/* Notes Content */}
        <div className="flex-1 overflow-auto bg-[#0a0e1a]/50 p-4">
          {activeTab === 'edit' && (
            <textarea
              className="w-full h-full bg-transparent text-gray-300 resize-none outline-none font-mono text-[13px] leading-relaxed"
              placeholder="# Study Notes&#10;&#10;Use Markdown and $$ LaTeX $$ for math formulas..."
              value={notes}
              onChange={e => {
                setNotes(e.target.value);
                if (onNotesChange) onNotesChange(e.target.value);
              }}
            />
          )}
          
          {activeTab === 'preview' && (
            <div 
              className="prose prose-invert prose-sm max-w-none text-gray-300 font-sans leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMathInText(notes || '*No notes yet*') }}
            />
          )}

          {activeTab === 'formulas' && (
            <div className="flex flex-col gap-3">
              <div className="text-gray-400 mb-2">Click a formula to insert into notes:</div>
              {FORMULA_SHEET.map((f, i) => (
                <div 
                  key={i} 
                  className="bg-white/5 border border-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/10 hover:border-cyan-500/30 transition-all group"
                  onClick={() => insertFormula(f.formula)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-white">{f.name}</span>
                    <Copy size={14} className="text-gray-500 group-hover:text-cyan-400" />
                  </div>
                  <div 
                    className="text-center py-2 bg-black/20 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: renderMathInText(f.formula) }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notes Footer */}
        <div className="h-[28px] shrink-0 border-t border-white/[0.06] flex items-center px-3 text-[11px] text-gray-500">
          <span>{notes.length} characters • Markdown & KaTeX supported</span>
        </div>
      </div>
      
    </div>
  );
};

export default InteractiveWhiteboard;
