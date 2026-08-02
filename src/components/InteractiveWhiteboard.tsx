import React, { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { 
  Pencil, Eraser, Type, Minus, Square, Circle, ArrowUpRight, 
  Undo, Redo, Grid, ZoomIn, ZoomOut, Save, Share, GripVertical,
  BookOpen, Edit3, FileDown, Highlighter, Sparkles, Trash2, 
  Calculator, Check, Copy, Compass
} from 'lucide-react';
import { renderMathInText } from '../lib/mathRenderer';

export interface AIDrawCommand {
  id: string;
  type: 'text' | 'line' | 'rect' | 'circle' | 'clear';
  x: number;
  y: number;
  text?: string;
  fontSize?: number;
  color?: string;
  width?: number;
  height?: number;
  radius?: number;
  x2?: number;
  y2?: number;
}

export interface InteractiveWhiteboardProps {
  assistantName: string;
  initialContent?: string;
  onSaveNotes?: (title: string, content: string) => void;
  onCanvasCapture?: (dataUrl: string) => void;
  onExportStudyPack?: (canvasImage: string, notesTitle: string, notesContent: string) => void;
  aiCommands?: AIDrawCommand[];
}

export type ToolType = 'pen' | 'highlighter' | 'eraser' | 'text' | 'line' | 'rect' | 'circle' | 'arrow' | 'stamp';
export type CanvasTheme = 'dark' | 'chalkboard' | 'grid' | 'graph' | 'ruled';

interface Point {
  x: number;
  y: number;
}

interface Action {
  id: string;
  tool: ToolType;
  color: string;
  width: number;
  points: Point[];
  text?: string;
  fontSize?: number;
}

const COLORS = [
  { name: 'Chalk White', value: '#f8fafc' },
  { name: 'Neon Cyan', value: '#22d3ee' },
  { name: 'Electric Yellow', value: '#facc15' },
  { name: 'Pastel Pink', value: '#f472b6' },
  { name: 'Emerald Green', value: '#34d399' },
  { name: 'Neon Violet', value: '#c084fc' },
  { name: 'Bright Orange', value: '#fb923c' },
  { name: 'Flame Red', value: '#ef4444' }
];

const MATH_STAMPS = [
  { symbol: 'π', latex: '\\pi', label: 'Pi' },
  { symbol: '√x', latex: '\\sqrt{x}', label: 'Square Root' },
  { symbol: '∫', latex: '\\int', label: 'Integral' },
  { symbol: '∑', latex: '\\sum', label: 'Summation' },
  { symbol: 'α', latex: '\\alpha', label: 'Alpha' },
  { symbol: 'θ', latex: '\\theta', label: 'Theta' },
  { symbol: 'Δ', latex: '\\Delta', label: 'Delta' },
  { symbol: '∞', latex: '\\infty', label: 'Infinity' },
  { symbol: 'a/b', latex: '\\frac{a}{b}', label: 'Fraction' }
];

const FORMULA_PRESETS = [
  { title: 'Pythagorean Theorem', code: 'a^2 + b^2 = c^2' },
  { title: 'Quadratic Formula', code: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { title: 'Mass-Energy Equivalence', code: 'E = mc^2' },
  { title: 'Trigonometric Identity', code: '\\sin^2\\theta + \\cos^2\\theta = 1' },
  { title: 'Definite Integral', code: '\\int_a^b f(x) dx = F(b) - F(a)' },
  { title: 'Newton\'s Second Law', code: 'F = m \\cdot a' },
  { title: 'Euler\'s Identity', code: 'e^{i\\pi} + 1 = 0' },
  { title: 'Area of Circle', code: 'A = \\pi r^2' }
];

export function InteractiveWhiteboard({
  assistantName,
  initialContent = '',
  onSaveNotes,
  onCanvasCapture,
  onExportStudyPack,
  aiCommands
}: InteractiveWhiteboardProps) {
  // State
  const [tool, setTool] = useState<ToolType>('pen');
  const [color, setColor] = useState<string>('#22d3ee');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [theme, setTheme] = useState<CanvasTheme>('dark');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(100);
  const [activeStamp, setActiveStamp] = useState<string>('π');
  
  // Right Panel Tabs
  const [rightPanelTab, setRightPanelTab] = useState<'editor' | 'preview' | 'cheatsheet'>('editor');
  const [noteTitle, setNoteTitle] = useState<string>('Physics & Math Study Notes');
  const [noteContent, setNoteContent] = useState<string>(
    initialContent || `# Study Notes & Equations\n\n- Topic: Motion and Forces\n- Formula: $F = m \\cdot a$\n- Energy: $E = mc^2$\n\n$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$`
  );
  
  // Undo/Redo State
  const [actions, setActions] = useState<Action[]>([]);
  const [redoActions, setRedoActions] = useState<Action[]>([]);
  const [currentAction, setCurrentAction] = useState<Action | null>(null);
  const [aiDrawingNotice, setAiDrawingNotice] = useState<string | null>(null);
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Splitter
  const [splitterPos, setSplitterPos] = useState<number>(68); // % width for canvas
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  
  // Text Input Overlay
  const [textInput, setTextInput] = useState<{ visible: boolean, x: number, y: number, text: string }>({
    visible: false, x: 0, y: 0, text: ''
  });
  const textInputRef = useRef<HTMLInputElement>(null);

  // Focus text input when visible
  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput.visible]);

  // Canvas DPI Scaling
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        redrawCanvas();
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Handle incoming AI Commands
  useEffect(() => {
    if (aiCommands && aiCommands.length > 0) {
      setAiDrawingNotice(`${assistantName} is updating the study whiteboard...`);
      const timer = setTimeout(() => setAiDrawingNotice(null), 3500);

      const newActions: Action[] = aiCommands.map(cmd => {
        if (cmd.type === 'clear') {
          return { id: cmd.id, tool: 'eraser', color: '#000', width: 9999, points: [] } as any; 
        }
        
        let cmdTool: ToolType = 'pen';
        let points: Point[] = [];
        
        if (cmd.type === 'line' && cmd.x2 !== undefined && cmd.y2 !== undefined) {
          cmdTool = 'line';
          points = [{ x: cmd.x, y: cmd.y }, { x: cmd.x2, y: cmd.y2 }];
        } else if (cmd.type === 'rect' && cmd.width !== undefined && cmd.height !== undefined) {
          cmdTool = 'rect';
          points = [{ x: cmd.x, y: cmd.y }, { x: cmd.x + cmd.width, y: cmd.y + cmd.height }];
        } else if (cmd.type === 'circle' && cmd.radius !== undefined) {
          cmdTool = 'circle';
          points = [{ x: cmd.x, y: cmd.y }, { x: cmd.x + cmd.radius, y: cmd.y }];
        } else if (cmd.type === 'text') {
          cmdTool = 'text';
          points = [{ x: cmd.x, y: cmd.y }];
        }
        
        return {
          id: cmd.id,
          tool: cmdTool,
          color: cmd.color || color,
          width: cmd.width || lineWidth,
          points,
          text: cmd.text,
          fontSize: cmd.fontSize || 20
        };
      }).filter(a => a.points);
      
      if (newActions.length > 0) {
        setActions(prev => [...prev, ...newActions]);
        setRedoActions([]);
      }

      return () => clearTimeout(timer);
    }
  }, [aiCommands, assistantName]);

  // Redraw canvas on action/theme/zoom change
  useEffect(() => {
    redrawCanvas();
  }, [actions, currentAction, showGrid, zoom, theme]);

  const drawAction = (ctx: CanvasRenderingContext2D, action: Action) => {
    if (action.points.length === 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (action.tool === 'highlighter') {
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = action.width * 3.5;
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
    } else if (action.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = action.width * 2.5;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = action.width;
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
    }

    if (action.tool === 'pen' || action.tool === 'highlighter' || action.tool === 'eraser') {
      if (action.points.length < 3) {
        const b = action.points[0];
        ctx.beginPath();
        ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, true);
        ctx.fill();
        ctx.closePath();
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length - 2; i++) {
        const c = (action.points[i].x + action.points[i + 1].x) / 2;
        const d = (action.points[i].y + action.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(action.points[i].x, action.points[i].y, c, d);
      }
      ctx.quadraticCurveTo(
        action.points[action.points.length - 2].x,
        action.points[action.points.length - 2].y,
        action.points[action.points.length - 1].x,
        action.points[action.points.length - 1].y
      );
      ctx.stroke();
    } else if (action.tool === 'line') {
      ctx.moveTo(action.points[0].x, action.points[0].y);
      ctx.lineTo(action.points[action.points.length - 1].x, action.points[action.points.length - 1].y);
      ctx.stroke();
    } else if (action.tool === 'rect') {
      const start = action.points[0];
      const end = action.points[action.points.length - 1];
      ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
      ctx.stroke();
    } else if (action.tool === 'circle') {
      const start = action.points[0];
      const end = action.points[action.points.length - 1];
      const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
      ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (action.tool === 'arrow') {
      const start = action.points[0];
      const end = action.points[action.points.length - 1];
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      
      const headlen = 16;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.fill();
    } else if ((action.tool === 'text' || action.tool === 'stamp') && action.text) {
      ctx.font = `bold ${action.fontSize || 22}px 'Segoe UI', system-ui, sans-serif`;
      ctx.fillText(action.text, action.points[0].x, action.points[0].y);
    }
    
    ctx.restore();
  };

  const drawThemeBackground = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    
    // Background colors
    if (theme === 'chalkboard') {
      ctx.fillStyle = '#0f291e'; // Deep Chalkboard Green
      ctx.fillRect(0, 0, width, height);
      
      // Subtle chalk texture overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      for (let i = 0; i < 40; i++) {
        ctx.fillRect((i * 47) % width, (i * 83) % height, (i * 12) + 20, 2);
      }
    } else {
      ctx.fillStyle = '#050711'; // Dark OLED Cyber
      ctx.fillRect(0, 0, width, height);
    }

    if (!showGrid) {
      ctx.restore();
      return;
    }

    const scale = zoom / 100;
    
    if (theme === 'graph') {
      // Cartesian Graph Axes & Subgrid
      const step = 25 * scale;
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      for (let x = 0; x <= width; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major axes lines (origin center guide)
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

    } else if (theme === 'dots') {
      // Dot Matrix Paper
      const step = 24 * scale;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let x = step / 2; x < width; x += step) {
        for (let y = step / 2; y < height; y += step) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

    } else if (theme === 'ruled') {
      // Lined Notebook Paper
      const lineSpacing = 32 * scale;
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = lineSpacing; y < height; y += lineSpacing) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Red Margin Line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(60 * scale, 0);
      ctx.lineTo(60 * scale, height);
      ctx.stroke();

    } else {
      // Default Grid
      const gridSize = 24 * scale;
      ctx.strokeStyle = theme === 'chalkboard' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    ctx.restore();
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    
    ctx.save();
    const scale = zoom / 100;
    
    drawThemeBackground(ctx, logicalWidth, logicalHeight);

    ctx.scale(scale, scale);

    // Draw saved actions
    actions.forEach(a => drawAction(ctx, a));

    // Draw active drawing action
    if (currentAction) {
      drawAction(ctx, currentAction);
    }

    ctx.restore();
  }, [actions, currentAction, showGrid, zoom, theme]);

  // Pointer & Touch Events
  const getCoordinates = (e: ReactMouseEvent | ReactTouchEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as ReactMouseEvent).clientX;
      clientY = (e as ReactMouseEvent).clientY;
    }

    const scale = zoom / 100;
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  };

  const handlePointerDown = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (tool === 'text') {
      const pt = getCoordinates(e);
      if (pt) {
        setTextInput({ visible: true, x: pt.x, y: pt.y, text: '' });
      }
      return;
    }

    if (tool === 'stamp') {
      const pt = getCoordinates(e);
      if (pt) {
        const stampAction: Action = {
          id: Date.now().toString(),
          tool: 'stamp',
          color,
          width: lineWidth,
          points: [pt],
          text: activeStamp,
          fontSize: 28
        };
        setActions(prev => [...prev, stampAction]);
        setRedoActions([]);
      }
      return;
    }

    if (textInput.visible) {
      commitText();
    }

    const pt = getCoordinates(e);
    if (!pt) return;

    const newAction: Action = {
      id: Date.now().toString(),
      tool,
      color,
      width: lineWidth,
      points: [pt]
    };
    setCurrentAction(newAction);
  };

  const handlePointerMove = (e: ReactMouseEvent | ReactTouchEvent) => {
    if (!currentAction) return;
    const pt = getCoordinates(e);
    if (!pt) return;

    if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
      setCurrentAction(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
    } else {
      setCurrentAction(prev => prev ? { ...prev, points: [prev.points[0], pt] } : null);
    }
  };

  const handlePointerUp = () => {
    if (currentAction) {
      setActions(prev => [...prev, currentAction]);
      setRedoActions([]);
      setCurrentAction(null);
    }
  };

  const handleUndo = () => {
    if (actions.length === 0) return;
    const newActions = [...actions];
    const undone = newActions.pop();
    setActions(newActions);
    if (undone) {
      setRedoActions(prev => [...prev, undone]);
    }
  };

  const handleRedo = () => {
    if (redoActions.length === 0) return;
    const newRedo = [...redoActions];
    const redone = newRedo.pop();
    setRedoActions(newRedo);
    if (redone) {
      setActions(prev => [...prev, redone]);
    }
  };

  const handleClearBoard = () => {
    if (actions.length === 0) return;
    setActions([]);
    setRedoActions([]);
  };

  const commitText = () => {
    if (textInput.visible && textInput.text.trim()) {
      const newAction: Action = {
        id: Date.now().toString(),
        tool: 'text',
        color,
        width: lineWidth,
        points: [{ x: textInput.x, y: textInput.y }],
        text: textInput.text,
        fontSize: Math.max(18, lineWidth * 5)
      };
      setActions(prev => [...prev, newAction]);
      setRedoActions([]);
    }
    setTextInput({ visible: false, x: 0, y: 0, text: '' });
  };

  const handleTextKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter') {
      commitText();
    } else if (e.key === 'Escape') {
      setTextInput({ visible: false, x: 0, y: 0, text: '' });
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          handleUndo();
        } else if (e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, redoActions]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -10 : 10;
      setZoom(prev => Math.min(Math.max(10, prev + delta), 500));
    }
  };

  // Splitter Dragging
  const handleSplitterMove = useCallback((e: MouseEvent) => {
    if (!isDraggingSplitter) return;
    const newPos = (e.clientX / window.innerWidth) * 100;
    setSplitterPos(Math.min(Math.max(25, newPos), 82));
  }, [isDraggingSplitter]);

  const handleSplitterUp = useCallback(() => {
    setIsDraggingSplitter(false);
  }, []);

  useEffect(() => {
    if (isDraggingSplitter) {
      window.addEventListener('mousemove', handleSplitterMove);
      window.addEventListener('mouseup', handleSplitterUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleSplitterMove);
      window.removeEventListener('mouseup', handleSplitterUp);
    };
  }, [isDraggingSplitter, handleSplitterMove, handleSplitterUp]);

  // Canvas Capture & Share
  const handleCapture = () => {
    if (onCanvasCapture && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onCanvasCapture(dataUrl);
    }
  };

  const handleInsertFormulaToNotes = (code: string) => {
    const snippet = `\n$$${code}$$\n`;
    setNoteContent(prev => prev + snippet);
    setCopiedFormula(code);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  // Tool Item Helper
  const ToolButton = ({ t, icon: Icon, tooltip }: { t: ToolType, icon: any, tooltip: string }) => (
    <button
      onClick={() => setTool(t)}
      className={`p-2.5 rounded-xl transition-all group relative cursor-pointer ${
        tool === t 
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
          : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
      }`}
      title={tooltip}
    >
      <Icon size={18} />
      <span className="absolute left-full ml-3 px-2 py-1 bg-slate-900 border border-white/10 text-[10px] font-mono text-white rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 shadow-lg">
        {tooltip}
      </span>
    </button>
  );

  return (
    <div className="flex h-full w-full bg-[#050711] text-white overflow-hidden font-sans select-none relative">
      
      {/* LEFT: CANVAS AREA */}
      <div 
        className="relative flex flex-col h-full overflow-hidden" 
        style={{ width: `${splitterPos}%` }}
        onWheel={handleWheel}
      >
        {/* TOP BAR: HEADER CONTROLS */}
        <div className="h-14 bg-[#080b18]/90 backdrop-blur-xl border-b border-white/10 px-4 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Compass className="text-cyan-400 animate-spin-slow" size={20} />
              <h2 className="font-display font-semibold text-sm tracking-tight text-white hidden sm:block">
                Interactive Study Canvas
              </h2>
            </div>

            {/* Canvas Theme Selector */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setTheme('dark')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${theme === 'dark' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Dark Cyber
              </button>
              <button
                onClick={() => setTheme('chalkboard')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${theme === 'chalkboard' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Chalkboard
              </button>
              <button
                onClick={() => setTheme('graph')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${theme === 'graph' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Graph Axis
              </button>
              <button
                onClick={() => setTheme('dots')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${theme === 'dots' ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Dots
              </button>
              <button
                onClick={() => setTheme('ruled')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${theme === 'ruled' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Ruled
              </button>
            </div>
          </div>

          {/* AI Activity Notice Toast */}
          {aiDrawingNotice && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono animate-bounce">
              <Sparkles size={13} />
              <span>{aiDrawingNotice}</span>
            </div>
          )}

          {/* Top Right Action Tools */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowGrid(!showGrid)} 
              className={`p-2 rounded-lg border transition cursor-pointer ${showGrid ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-white/10 text-slate-400 hover:text-white'}`}
              title="Toggle Grid Overlay"
            >
              <Grid size={16} />
            </button>
            
            <button 
              onClick={handleCapture}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-mono tracking-wider transition cursor-pointer"
              title={`Send canvas snapshot to ${assistantName}`}
            >
              <Share size={14} />
              <span className="hidden md:inline">Share Screen</span>
            </button>
          </div>
        </div>

        {/* FLOATING VERTICAL TOOLBAR */}
        <div className="absolute left-4 top-20 bg-[#0c1024]/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex flex-col gap-1.5 z-20 shadow-2xl">
          <ToolButton t="pen" icon={Pencil} tooltip="Pen (Freehand)" />
          <ToolButton t="highlighter" icon={Highlighter} tooltip="Neon Highlighter" />
          <ToolButton t="eraser" icon={Eraser} tooltip="Eraser" />
          <div className="h-px w-full bg-white/10 my-1" />
          <ToolButton t="text" icon={Type} tooltip="Add Text" />
          <ToolButton t="stamp" icon={Calculator} tooltip="Math Symbol Stamps" />
          <ToolButton t="line" icon={Minus} tooltip="Straight Line" />
          <ToolButton t="rect" icon={Square} tooltip="Rectangle" />
          <ToolButton t="circle" icon={Circle} tooltip="Circle / Arc" />
          <ToolButton t="arrow" icon={ArrowUpRight} tooltip="Vector Arrow" />
          
          <div className="h-px w-full bg-white/10 my-1" />
          <button 
            onClick={handleUndo} 
            disabled={actions.length === 0} 
            className={`p-2.5 rounded-xl transition cursor-pointer ${actions.length === 0 ? 'text-slate-600' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} 
            title="Undo (Ctrl+Z)"
          >
            <Undo size={18} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={redoActions.length === 0} 
            className={`p-2.5 rounded-xl transition cursor-pointer ${redoActions.length === 0 ? 'text-slate-600' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} 
            title="Redo (Ctrl+Y)"
          >
            <Redo size={18} />
          </button>
          <button 
            onClick={handleClearBoard} 
            disabled={actions.length === 0}
            className={`p-2.5 rounded-xl transition cursor-pointer ${actions.length === 0 ? 'text-slate-600' : 'text-rose-400 hover:bg-rose-500/20'}`} 
            title="Clear Entire Canvas"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* SECONDARY CONTROL DOCK (COLORS & STROKE WIDTH) */}
        <div className="absolute top-18 left-20 bg-[#0c1024]/90 backdrop-blur-xl border border-white/10 p-2.5 rounded-2xl flex items-center gap-4 z-20 shadow-xl">
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setColor(c.value)}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${color === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0c1024]' : 'hover:scale-110 opacity-80 hover:opacity-100'}`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-white/10" />

          {/* Stroke Width Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">Width</span>
            <input 
              type="range" 
              min="1" max="14" 
              value={lineWidth} 
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-20 accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-cyan-300 w-3">{lineWidth}</span>
          </div>

          {/* Math Stamp Sub-bar if tool is stamp */}
          {tool === 'stamp' && (
            <>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-xs">
                {MATH_STAMPS.map((st) => (
                  <button
                    key={st.symbol}
                    onClick={() => setActiveStamp(st.symbol)}
                    className={`px-2 py-0.5 rounded-lg border text-xs font-bold transition cursor-pointer ${activeStamp === st.symbol ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
                    title={st.label}
                  >
                    {st.symbol}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* CANVAS CANVAS VIEWPORT */}
        <div 
          ref={containerRef} 
          className="flex-1 w-full h-full cursor-crosshair relative overflow-hidden"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <canvas ref={canvasRef} className="absolute inset-0 touch-none" />
          
          {textInput.visible && (
            <input
              ref={textInputRef}
              type="text"
              value={textInput.text}
              onChange={(e) => setTextInput(prev => ({ ...prev, text: e.target.value }))}
              onKeyDown={handleTextKeyDown}
              onBlur={commitText}
              className="absolute bg-transparent border border-cyan-400/60 outline-none px-2 py-0.5 rounded text-white shadow-xl"
              style={{
                left: `${textInput.x * (zoom / 100)}px`,
                top: `${textInput.y * (zoom / 100) - (Math.max(18, lineWidth * 5))}px`,
                color: color,
                fontSize: `${Math.max(18, lineWidth * 5) * (zoom / 100)}px`,
                fontFamily: 'Segoe UI, system-ui, sans-serif'
              }}
              placeholder="Type notes and press Enter..."
            />
          )}
        </div>

        {/* STATUS FOOTER */}
        <div className="h-7 bg-[#04060e] border-t border-white/10 flex items-center px-4 justify-between text-[10px] font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-4">
            <span className="capitalize text-cyan-400">Tool: {tool}</span>
            <span>Strokes: {actions.length}</span>
            <span className="text-slate-500">Theme: {theme}</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setZoom(prev => Math.max(10, prev - 10))} className="hover:text-white cursor-pointer"><ZoomOut size={13} /></button>
            <span className="w-10 text-center text-slate-300">{zoom}%</span>
            <button onClick={() => setZoom(prev => Math.min(500, prev + 10))} className="hover:text-white cursor-pointer"><ZoomIn size={13} /></button>
          </div>
        </div>
      </div>

      {/* DRAGGABLE SPLITTER */}
      <div 
        className="w-1.5 bg-[#0e1329] hover:bg-cyan-400 cursor-col-resize flex items-center justify-center transition-colors relative z-30 shrink-0"
        onMouseDown={() => setIsDraggingSplitter(true)}
      >
        <div className="h-10 w-4 bg-[#141b3b] rounded-full flex items-center justify-center -ml-1 border border-white/10 shadow-md">
          <GripVertical size={11} className="text-slate-400" />
        </div>
      </div>

      {/* RIGHT: INTEGRATED STUDY NOTEBOOK & PREVIEW */}
      <div className="flex-1 flex flex-col h-full bg-[#080b18] overflow-hidden" style={{ width: `${100 - splitterPos}%` }}>
        {/* Header & Tabs */}
        <div className="h-14 border-b border-white/10 px-4 flex items-center justify-between bg-[#0b0f24] shrink-0 gap-2">
          <input 
            type="text"
            placeholder="Study Note Title..."
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="bg-transparent border-none outline-none text-xs font-semibold text-white placeholder-slate-500 flex-1 font-display"
          />

          {/* Mode Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] shrink-0">
            <button
              onClick={() => setRightPanelTab('editor')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer font-mono ${rightPanelTab === 'editor' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Edit3 size={12} />
              <span>Edit</span>
            </button>
            <button
              onClick={() => setRightPanelTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer font-mono ${rightPanelTab === 'preview' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <BookOpen size={12} />
              <span>KaTeX Math</span>
            </button>
            <button
              onClick={() => setRightPanelTab('cheatsheet')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition cursor-pointer font-mono ${rightPanelTab === 'cheatsheet' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              <Calculator size={12} />
              <span>Formulas</span>
            </button>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => onSaveNotes && onSaveNotes(noteTitle, noteContent)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg transition text-xs font-mono cursor-pointer"
              title="Save notes to Vault"
            >
              <Save size={13} />
              <span className="hidden lg:inline">Vault</span>
            </button>
            <button
              onClick={() => {
                if (onExportStudyPack && canvasRef.current) {
                  const dataUrl = canvasRef.current.toDataURL('image/png');
                  onExportStudyPack(dataUrl, noteTitle, noteContent);
                }
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg transition text-xs font-mono uppercase tracking-wider cursor-pointer shadow-md"
              title="Export complete Study Pack"
            >
              <FileDown size={13} />
              <span>Study Pack</span>
            </button>
          </div>
        </div>

        {/* NOTEBOOK CONTENT PANEL */}
        <div className="flex-1 overflow-y-auto p-5 text-slate-300 font-sans text-xs">
          {rightPanelTab === 'editor' && (
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your study notes, equations, or formulas here... Use $x^2$ for inline math and $$\int_0^\infty f(x) dx$$ for block equations."
              className="w-full h-full bg-transparent border-none outline-none text-slate-200 resize-none leading-relaxed font-mono text-xs placeholder:text-slate-600 focus:outline-none"
            />
          )}

          {rightPanelTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
                <span>Rendering KaTeX Math Equations & Markdown Formatting</span>
                <Sparkles size={13} />
              </div>
              <div
                className="prose prose-invert max-w-none text-slate-200 leading-relaxed font-sans text-xs"
                dangerouslySetInnerHTML={{ __html: renderMathInText(noteContent) }}
              />
            </div>
          )}

          {rightPanelTab === 'cheatsheet' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h4 className="font-mono text-xs font-bold text-cyan-300 uppercase tracking-wider">
                  Quick Formula Library (Click to Insert)
                </h4>
                {copiedFormula && (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <Check size={11} /> Inserted!
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {FORMULA_PRESETS.map((f) => (
                  <div
                    key={f.title}
                    onClick={() => handleInsertFormulaToNotes(f.code)}
                    className="p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-cyan-400/40 transition cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-slate-300 group-hover:text-cyan-300 transition">
                        {f.title}
                      </span>
                      <Copy size={12} className="text-slate-500 group-hover:text-cyan-400 transition" />
                    </div>
                    <code className="text-[11px] font-mono text-cyan-400 block bg-black/40 p-1.5 rounded-lg border border-white/5">
                      $${f.code}$$
                    </code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* NOTEBOOK FOOTER */}
        <div className="h-7 bg-[#04060e] border-t border-white/10 flex items-center px-4 justify-between text-[10px] font-mono text-slate-500 shrink-0">
          <span>LaTeX & KaTeX Math Renderer Enabled</span>
          <span>STUDY PACK VAULT READY</span>
        </div>
      </div>

    </div>
  );
}
