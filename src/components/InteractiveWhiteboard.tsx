import React, { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { 
  Pencil, Eraser, Type, Minus, Square, Circle, ArrowUpRight, 
  Undo, Redo, Grid, ZoomIn, ZoomOut, Save, Share, GripVertical,
  BookOpen, Edit3, FileDown
} from 'lucide-react';
import { renderMathInText, isKaTeXAvailable } from '../lib/mathRenderer';

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

type ToolType = 'pen' | 'eraser' | 'text' | 'line' | 'rect' | 'circle' | 'arrow';

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
  { name: 'White', value: '#f8fafc' },
  { name: 'Cyan', value: '#22d3ee' },
  { name: 'Yellow', value: '#facc15' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Green', value: '#34d399' },
  { name: 'Purple', value: '#c084fc' },
  { name: 'Orange', value: '#fb923c' },
  { name: 'Red', value: '#ef4444' }
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
  const [color, setColor] = useState<string>('#f8fafc');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [zoom, setZoom] = useState<number>(100);
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(true);
  
  // Undo/Redo State
  const [actions, setActions] = useState<Action[]>([]);
  const [redoActions, setRedoActions] = useState<Action[]>([]);
  const [currentAction, setCurrentAction] = useState<Action | null>(null);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Notes / Splitter
  const [splitterPos, setSplitterPos] = useState<number>(70); // % width for canvas
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>(initialContent);
  
  // Text Input Overlay
  const [textInput, setTextInput] = useState<{ visible: boolean, x: number, y: number, text: string }>({
    visible: false, x: 0, y: 0, text: ''
  });
  const textInputRef = useRef<HTMLInputElement>(null);

  // Focus text input when it appears
  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput.visible]);

  // Handle Resize & DPI Scaling
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
    resizeCanvas(); // initial setup

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Handle AI Commands
  useEffect(() => {
    if (aiCommands && aiCommands.length > 0) {
      const newActions: Action[] = aiCommands.map(cmd => {
        if (cmd.type === 'clear') {
          return { id: cmd.id, tool: 'eraser', color: '#000', width: 9999, points: [] } as any; 
        }
        
        let tool: ToolType = 'pen';
        let points: Point[] = [];
        
        if (cmd.type === 'line' && cmd.x2 !== undefined && cmd.y2 !== undefined) {
          tool = 'line';
          points = [{ x: cmd.x, y: cmd.y }, { x: cmd.x2, y: cmd.y2 }];
        } else if (cmd.type === 'rect' && cmd.width !== undefined && cmd.height !== undefined) {
          tool = 'rect';
          points = [{ x: cmd.x, y: cmd.y }, { x: cmd.x + cmd.width, y: cmd.y + cmd.height }];
        } else if (cmd.type === 'circle' && cmd.radius !== undefined) {
          tool = 'circle';
          points = [{ x: cmd.x, y: cmd.y }, { x: cmd.x + cmd.radius, y: cmd.y }];
        } else if (cmd.type === 'text') {
          tool = 'text';
          points = [{ x: cmd.x, y: cmd.y }];
        }
        
        return {
          id: cmd.id,
          tool,
          color: cmd.color || color,
          width: cmd.width || lineWidth,
          points,
          text: cmd.text,
          fontSize: cmd.fontSize || 16
        };
      }).filter(a => a.points);
      
      if (newActions.length > 0) {
        setActions(prev => [...prev, ...newActions]);
        setRedoActions([]);
      }
    }
  }, [aiCommands]);

  // Redraw triggered by action changes or zoom
  useEffect(() => {
    redrawCanvas();
  }, [actions, currentAction, showGrid, zoom]);

  const drawAction = (ctx: CanvasRenderingContext2D, action: Action) => {
    if (action.points.length === 0) return;

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = action.width;

    if (action.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = action.width * 2;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
    }

    if (action.tool === 'pen' || action.tool === 'eraser') {
      if (action.points.length < 3) {
        const b = action.points[0];
        ctx.beginPath();
        ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
        ctx.fill();
        ctx.closePath();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(action.points[0].x, action.points[0].y);
      for (let i = 1; i < action.points.length - 2; i++) {
        const c = (action.points[i].x + action.points[i + 1].x) / 2;
        const d = (action.points[i].y + action.points[i + 1].y) / 2;
        ctx.quadraticCurveTo(action.points[i].x, action.points[i].y, c, d);
      }
      // For the last 2 points
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
      
      // Draw arrowhead
      const headlen = 15;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
      ctx.lineTo(end.x, end.y);
      ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
      ctx.stroke();
      ctx.fill();
    } else if (action.tool === 'text' && action.text) {
      ctx.font = `${action.fontSize || 16}px Inter, sans-serif`;
      ctx.fillText(action.text, action.points[0].x, action.points[0].y);
    }
    
    ctx.globalCompositeOperation = 'source-over'; // reset
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 20 * (zoom / 100);
    
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
    ctx.restore();
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We get logical dimensions (divided by DPI if we want to draw logically)
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = canvas.width / dpr;
    const logicalHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    
    // Setup for zoom
    ctx.save();
    const scale = zoom / 100;
    
    // Draw background
    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, logicalWidth / scale, logicalHeight / scale);

    if (showGrid) {
      drawGrid(ctx, logicalWidth / scale, logicalHeight / scale);
    }

    ctx.scale(scale, scale);

    // Draw saved actions
    actions.forEach(a => drawAction(ctx, a));

    // Draw current action
    if (currentAction) {
      drawAction(ctx, currentAction);
    }

    ctx.restore();
  }, [actions, currentAction, showGrid, zoom]);

  // Input Handling
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

    if (tool === 'pen' || tool === 'eraser') {
      setCurrentAction(prev => prev ? { ...prev, points: [...prev.points, pt] } : null);
    } else {
      // Shapes - just update the last point
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

  const commitText = () => {
    if (textInput.visible && textInput.text.trim()) {
      const newAction: Action = {
        id: Date.now().toString(),
        tool: 'text',
        color,
        width: lineWidth,
        points: [{ x: textInput.x, y: textInput.y }],
        text: textInput.text,
        fontSize: Math.max(16, lineWidth * 5)
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

  // Keyboard Shortcuts & Zoom
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
    setSplitterPos(Math.min(Math.max(20, newPos), 80));
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

  // Canvas Capture
  const handleCapture = () => {
    if (onCanvasCapture && canvasRef.current) {
      // Temporarily hide grid for capture if desired, or just capture as is
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onCanvasCapture(dataUrl);
    }
  };

  // Tool Item Helper
  const ToolButton = ({ t, icon: Icon, tooltip }: { t: ToolType, icon: any, tooltip: string }) => (
    <button
      onClick={() => setTool(t)}
      className={`p-3 rounded-xl transition-all group relative ${tool === t ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'}`}
      title={tooltip}
    >
      <Icon size={20} />
      <span className="absolute left-full ml-3 px-2 py-1 bg-slate-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
        {tooltip}
      </span>
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-[#0a0d1a] text-white overflow-hidden font-sans select-none">
      
      {/* LEFT: CANVAS AREA */}
      <div 
        className="relative flex flex-col" 
        style={{ width: `${splitterPos}%` }}
        onWheel={handleWheel}
      >
        {/* Floating Toolbar */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-[#121629]/80 backdrop-blur-md border border-slate-700/50 p-2 rounded-2xl flex flex-col gap-2 z-10 shadow-2xl">
          <ToolButton t="pen" icon={Pencil} tooltip="Pen (Freehand)" />
          <ToolButton t="eraser" icon={Eraser} tooltip="Eraser" />
          <div className="h-px w-full bg-slate-700/50 my-1" />
          <ToolButton t="text" icon={Type} tooltip="Text" />
          <ToolButton t="line" icon={Minus} tooltip="Line" />
          <ToolButton t="rect" icon={Square} tooltip="Rectangle" />
          <ToolButton t="circle" icon={Circle} tooltip="Circle" />
          <ToolButton t="arrow" icon={ArrowUpRight} tooltip="Arrow" />
          
          <div className="h-px w-full bg-slate-700/50 my-1" />
          <button onClick={handleUndo} disabled={actions.length === 0} className={`p-3 rounded-xl transition-all ${actions.length === 0 ? 'text-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Undo (Ctrl+Z)"><Undo size={20} /></button>
          <button onClick={handleRedo} disabled={redoActions.length === 0} className={`p-3 rounded-xl transition-all ${redoActions.length === 0 ? 'text-slate-600' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`} title="Redo (Ctrl+Y)"><Redo size={20} /></button>
        </div>

        {/* Top Floating Controls */}
        <div className="absolute top-4 left-24 bg-[#121629]/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-2xl flex items-center gap-6 z-10 shadow-lg">
          {/* Colors */}
          <div className="flex items-center gap-2">
            {COLORS.map(c => (
              <button
                key={c.name}
                onClick={() => setColor(c.value)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c.value ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#121629]' : 'hover:scale-110'}`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          <div className="w-px h-6 bg-slate-700/50" />

          {/* Stroke Width */}
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <input 
              type="range" 
              min="1" max="12" 
              value={lineWidth} 
              onChange={(e) => setLineWidth(parseInt(e.target.value))}
              className="w-24 accent-indigo-500"
            />
            <div className="w-5 h-5 rounded-full bg-slate-400" />
          </div>

          <div className="w-px h-6 bg-slate-700/50" />

          {/* Actions */}
          <button 
            onClick={() => setShowGrid(!showGrid)} 
            className={`p-2 rounded-lg transition-all ${showGrid ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
            title="Toggle Grid"
          >
            <Grid size={18} />
          </button>
          
          <button 
            onClick={handleCapture}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-lg font-medium transition-all shadow-md shadow-indigo-500/20"
          >
            <Share size={16} />
            <span>Share with {assistantName}</span>
          </button>
        </div>

        {/* Canvas Area */}
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
              className="absolute bg-transparent border border-indigo-500/50 outline-none px-1 rounded"
              style={{
                left: `${textInput.x * (zoom / 100)}px`,
                top: `${textInput.y * (zoom / 100) - (Math.max(16, lineWidth * 5))}px`,
                color: color,
                fontSize: `${Math.max(16, lineWidth * 5) * (zoom / 100)}px`,
                fontFamily: 'Inter, sans-serif'
              }}
              placeholder="Type and press Enter"
            />
          )}
        </div>

        {/* Status Bar */}
        <div className="h-8 bg-[#0a0d1a] border-t border-slate-800 flex items-center px-4 justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="capitalize">{tool} Tool</span>
            <span>{actions.length} Strokes</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setZoom(prev => Math.max(10, prev - 10))} className="hover:text-white"><ZoomOut size={14} /></button>
            <span className="w-12 text-center">{zoom}%</span>
            <button onClick={() => setZoom(prev => Math.min(500, prev + 10))} className="hover:text-white"><ZoomIn size={14} /></button>
          </div>
        </div>
      </div>

      {/* DRAGGABLE SPLITTER */}
      <div 
        className="w-1 bg-slate-800 hover:bg-indigo-500 cursor-col-resize flex items-center justify-center transition-colors relative z-20"
        onMouseDown={() => setIsDraggingSplitter(true)}
      >
        <div className="h-8 w-4 bg-slate-700 rounded-full flex items-center justify-center -ml-1.5 border border-slate-600 shadow-sm">
          <GripVertical size={12} className="text-slate-400" />
        </div>
      </div>

      {/* RIGHT: NOTES PANEL */}
      <div className="flex-1 flex flex-col bg-[#0d1120]" style={{ width: `${100 - splitterPos}%` }}>
        <div className="h-14 border-b border-slate-800 px-6 flex items-center justify-between bg-[#101426]">
          <input 
            type="text"
            placeholder="Note Title..."
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="bg-transparent border-none outline-none text-lg font-medium text-white placeholder-slate-500 flex-1"
          />
          <button 
            onClick={() => onSaveNotes && onSaveNotes(noteTitle, noteContent)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors text-sm font-medium"
          >
            <Save size={14} />
            <span>Save to Vault</span>
          </button>
          <button
            onClick={() => {
              if (onExportStudyPack && canvasRef.current) {
                const dataUrl = canvasRef.current.toDataURL('image/png');
                onExportStudyPack(dataUrl, noteTitle, noteContent);
              }
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors text-sm font-medium"
          >
            <FileDown size={14} />
            <span>Study Pack</span>
          </button>
          <button
            onClick={() => setIsEditingNotes(prev => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors text-sm font-medium"
          >
            {isEditingNotes ? <BookOpen size={14} /> : <Edit3 size={14} />}
            <span>{isEditingNotes ? 'Preview' : 'Edit'}</span>
          </button>
        </div>
        {isEditingNotes ? (
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Jot down your notes, equations, or insights here... Use $x^2$ for inline math and $$\frac{a}{b}$$ for block math."
            className="flex-1 w-full bg-transparent border-none outline-none p-6 text-slate-300 resize-none leading-relaxed font-mono text-sm"
          />
        ) : (
          <div
            className="flex-1 w-full overflow-y-auto p-6 text-slate-300 leading-relaxed prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMathInText(noteContent) }}
          />
        )}
      </div>

    </div>
  );
}
