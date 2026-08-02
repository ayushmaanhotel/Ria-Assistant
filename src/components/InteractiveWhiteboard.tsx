import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  MousePointer2, Pencil, Eraser, Type, Minus, Square, Circle,
  ArrowUpRight, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Grid3X3,
  MoreHorizontal, Star, MoreVertical, StickyNote, Image, X, ChevronLeft,
  Save, FileDown, Bold, Italic, Underline, List, ListOrdered, Link2,
  Sparkles, Trash2, Plus, BookOpen, CheckCircle2, XCircle, MinusCircle
} from 'lucide-react';
import { renderMathInText } from '../lib/mathRenderer';
import type { 
  BoardBlock, BoardMeta, QuestionBlock, ResultCardBlock, 
  EquationBlock, ExplanationBlock, DrawToolType, Point, Stroke,
  FlashcardBlock, TextBlockData
} from '../lib/boardTypes';

// Re-export for backward compat
export type ToolType = DrawToolType;
export type CanvasTheme = 'dark' | 'chalkboard' | 'graph' | 'dots' | 'ruled';

export interface AIDrawCommand {
  type: string;
  x?: number;
  y?: number;
  endX?: number;
  endY?: number;
  color?: string;
  width?: number;
  text?: string;
  // V2 structured content
  action?: string;
  block?: BoardBlock;
  meta?: BoardMeta;
}

export interface InteractiveWhiteboardProps {
  aiCommands?: AIDrawCommand[];
  onCanvasShare?: (dataUrl: string) => void;
  onSaveStudyPack?: (data: { image: string; notes: string }) => void;
}

const PEN_COLORS = [
  '#ffffff', '#f87171', '#facc15', '#34d399', 
  '#60a5fa', '#a78bfa', '#fb923c', '#22d3ee'
];

export const InteractiveWhiteboard: React.FC<InteractiveWhiteboardProps> = ({
  aiCommands = [],
  onCanvasShare,
  onSaveStudyPack
}) => {
  // UI State
  const [activeTool, setActiveTool] = useState<DrawToolType>('select');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penWidth, setPenWidth] = useState(2);
  const [zoom, setZoom] = useState(100);
  const [showNotes, setShowNotes] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Notes state
  const [notesTitle, setNotesTitle] = useState('');
  const [notesContent, setNotesContent] = useState('');

  // Board Data
  const [blocks, setBlocks] = useState<BoardBlock[]>([]);
  const [boardMeta, setBoardMeta] = useState<BoardMeta>({
    title: 'Untitled Board'
  });

  // Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoneStrokes, setUndoneStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Process AI commands
  useEffect(() => {
    if (aiCommands.length === 0) return;
    
    // We only process the last command for simplicity in this demo,
    // in reality you'd process them sequentially or keep a cursor.
    const cmd = aiCommands[aiCommands.length - 1];
    
    if (cmd.action === 'add-block' && cmd.block) {
      setBlocks(prev => [...prev.filter(b => b.id !== cmd.block!.id), cmd.block!]);
    } else if (cmd.action === 'update-block' && cmd.block) {
      setBlocks(prev => prev.map(b => b.id === cmd.block!.id ? cmd.block! : b));
    } else if (cmd.action === 'remove-block' && (cmd as any).blockId) {
      setBlocks(prev => prev.filter(b => b.id !== (cmd as any).blockId));
    } else if (cmd.action === 'set-board-meta' && cmd.meta) {
      setBoardMeta(cmd.meta);
    } else if (cmd.action === 'clear') {
      setBlocks([]);
      setStrokes([]);
      setUndoneStrokes([]);
    }
  }, [aiCommands]);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;
    
    allStrokes.forEach(stroke => {
      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = stroke.width * 2;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
        ctx.fillStyle = stroke.color;
        ctx.lineWidth = stroke.width;
      }

      if (stroke.points.length === 0) return;

      if (stroke.tool === 'pen' || stroke.tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          // simple drawing without smooth curve for brevity
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      } else if (stroke.tool === 'line' && stroke.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        ctx.lineTo(stroke.points[stroke.points.length - 1].x, stroke.points[stroke.points.length - 1].y);
        ctx.stroke();
      } else if (stroke.tool === 'rect' && stroke.points.length > 1) {
        ctx.beginPath();
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        ctx.stroke();
      } else if (stroke.tool === 'circle' && stroke.points.length > 1) {
        ctx.beginPath();
        const start = stroke.points[0];
        const end = stroke.points[stroke.points.length - 1];
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    });

  }, [strokes, currentStroke]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (activeTool === 'select') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setCurrentStroke({
      id: Math.random().toString(36).substr(2, 9),
      tool: activeTool,
      color: penColor,
      width: penWidth,
      points: [{ x, y }]
    });
    setUndoneStrokes([]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStroke) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setCurrentStroke(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        points: [...prev.points, { x, y }]
      };
    });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    setStrokes(prev => [...prev, currentStroke]);
    setCurrentStroke(null);
  };

  const undo = () => {
    if (strokes.length === 0) return;
    const lastStroke = strokes[strokes.length - 1];
    setStrokes(prev => prev.slice(0, -1));
    setUndoneStrokes(prev => [...prev, lastStroke]);
  };

  const redo = () => {
    if (undoneStrokes.length === 0) return;
    const nextStroke = undoneStrokes[undoneStrokes.length - 1];
    setUndoneStrokes(prev => prev.slice(0, -1));
    setStrokes(prev => [...prev, nextStroke]);
  };

  // Block Rendering
  const renderBlock = (block: BoardBlock) => {
    switch (block.type) {
      case 'question': {
        const qBlock = block as QuestionBlock;
        let statusBorder = 'border-white/[0.06]';
        if (qBlock.status === 'correct') statusBorder = 'border-l-4 border-l-emerald-400 border-white/[0.06]';
        if (qBlock.status === 'incorrect') statusBorder = 'border-l-4 border-l-red-400 border-white/[0.06]';
        
        return (
          <div key={block.id} className={`bg-[#1a1a2e] ${statusBorder} rounded-2xl p-6 mb-4 relative group`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-sm">
                  {qBlock.number < 10 ? `0${qBlock.number}` : qBlock.number}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {qBlock.marks > 0 && (
                  <span className="text-violet-400 text-xs font-semibold">{qBlock.marks} marks</span>
                )}
                <button className="text-gray-500 hover:text-yellow-400">
                  <Star size={16} fill={qBlock.starred ? 'currentColor' : 'none'} />
                </button>
                <button className="text-gray-500 hover:text-white">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
            
            <div 
              className="text-[#e2e8f0] text-lg font-medium mb-6 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderMathInText(qBlock.questionText) }} 
            />
            
            {qBlock.options && qBlock.options.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {qBlock.options.map(opt => (
                  <label key={opt.label} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="w-4 h-4 rounded-full border border-gray-400 flex items-center justify-center">
                      {qBlock.userAnswer === opt.label && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                    </div>
                    <span className="text-gray-400 font-medium">{opt.label}.</span>
                    <span className="text-gray-200">{opt.text}</span>
                  </label>
                ))}
              </div>
            ) : qBlock.answerInput ? (
              <div className="mt-4">
                <input 
                  type="text" 
                  placeholder="Type your answer..."
                  className="bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white w-full max-w-md focus:outline-none focus:border-violet-500 transition-colors"
                  defaultValue={qBlock.userAnswer}
                />
              </div>
            ) : null}
          </div>
        );
      }
      case 'result-card': {
        const rBlock = block as ResultCardBlock;
        const percentage = Math.round((rBlock.score / rBlock.total) * 100) || 0;
        
        return (
          <div key={block.id} className="bg-[#1a1a2e] border border-white/[0.06] rounded-2xl p-8 mb-4 flex flex-col items-center">
            <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-wider">{rBlock.title}</h3>
            
            <div className="relative w-32 h-32 mb-8">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="56" className="stroke-white/10" strokeWidth="12" fill="none" />
                <circle cx="64" cy="64" r="56" className="stroke-violet-500" strokeWidth="12" fill="none" strokeDasharray={`${percentage * 3.51} 351`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{percentage}%</span>
              </div>
            </div>
            
            <div className="text-gray-400 mb-8 font-medium">
              Score: <span className="text-white text-xl">{rBlock.score}</span> / {rBlock.total}
            </div>
            
            <div className="flex gap-8 mb-8">
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-emerald-400">{rBlock.correct}</span>
                <span className="text-xs text-gray-500 uppercase">Correct</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-red-400">{rBlock.incorrect}</span>
                <span className="text-xs text-gray-500 uppercase">Incorrect</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold text-gray-400">{rBlock.unattempted}</span>
                <span className="text-xs text-gray-500 uppercase">Skipped</span>
              </div>
            </div>
            
            <div className="flex gap-4 w-full justify-center">
              <button className="px-6 py-2 rounded-lg border border-white/10 text-white font-medium hover:bg-white/5 transition-colors">
                Review Mistakes
              </button>
              <button className="px-6 py-2 rounded-lg bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors">
                Ask MYRAA
              </button>
            </div>
          </div>
        );
      }
      default:
        return (
          <div key={block.id} className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4 text-gray-400 text-sm">
            Unsupported block type: {block.type}
          </div>
        );
    }
  };

  // Stats calculation for test widget
  const questions = blocks.filter(b => b.type === 'question') as QuestionBlock[];
  const hasQuestions = questions.length > 0;
  const correctCount = questions.filter(q => q.status === 'correct').length;
  const incorrectCount = questions.filter(q => q.status === 'incorrect').length;
  const unattemptedCount = questions.filter(q => q.status === 'unanswered').length;
  const totalScore = questions.reduce((acc, q) => acc + (q.status === 'correct' ? q.marks : 0), 0);
  const totalMarks = questions.reduce((acc, q) => acc + q.marks, 0);
  const testPercentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

  return (
    <div className="flex h-full w-full bg-[#0f0f17] text-gray-200 overflow-hidden font-sans">
      
      {/* 1. LEFT TOOLBAR */}
      <div className="w-14 shrink-0 flex flex-col items-center border-r border-white/[0.06] bg-[#13131f] py-4">
        <div className="flex flex-col gap-2">
          {[
            { id: 'select', icon: MousePointer2 },
            { id: 'pen', icon: Pencil },
            { id: 'eraser', icon: Eraser },
            { id: 'text', icon: Type },
            { id: 'line', icon: Minus },
            { id: 'rect', icon: Square },
            { id: 'circle', icon: Circle },
            { id: 'sticky', icon: StickyNote },
            { id: 'more', icon: MoreHorizontal }
          ].map(tool => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as DrawToolType)}
                className={`p-2 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-violet-600/20 text-violet-400 shadow-[0_0_12px_rgba(124,58,237,0.4)]' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon size={20} />
              </button>
            );
          })}
        </div>
        
        {/* Contextual pen options */}
        {(activeTool === 'pen' || activeTool === 'line' || activeTool === 'rect' || activeTool === 'circle' || activeTool === 'arrow') && (
          <div className="mt-4 flex flex-col items-center gap-2 border-t border-white/[0.06] pt-4 w-full">
            <div className="grid grid-cols-2 gap-1.5 px-2 w-full">
              {PEN_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setPenColor(color)}
                  className={`w-4 h-4 rounded-full mx-auto ${penColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="mt-2 w-full px-2 flex flex-col gap-1 items-center">
              {[1, 2, 4, 8].map(w => (
                <button
                  key={w}
                  onClick={() => setPenWidth(w)}
                  className={`w-full h-6 flex items-center justify-center rounded ${penWidth === w ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="bg-gray-400 rounded-full" style={{ width: 16, height: w }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1" />
        
        <button 
          onClick={() => setShowNotes(!showNotes)}
          className={`p-2 rounded-lg mb-4 transition-all ${showNotes ? 'bg-violet-600/20 text-violet-400' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
        >
          <BookOpen size={20} />
        </button>

        {/* Test Progress Widget */}
        {hasQuestions && (
          <div className="w-full border-t border-white/[0.06] pt-4 flex flex-col items-center text-xs pb-2">
            <div className="text-[10px] text-gray-500 font-bold mb-2 uppercase scale-90">Progress</div>
            <div className="relative w-10 h-10 mb-2">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="20" cy="20" r="16" className="stroke-white/10" strokeWidth="4" fill="none" />
                <circle cx="20" cy="20" r="16" className="stroke-violet-500" strokeWidth="4" fill="none" strokeDasharray={`${testPercentage} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                {testPercentage}%
              </div>
            </div>
            <div className="flex flex-col items-center gap-1 w-full px-1">
              <div className="flex justify-between w-full text-[#34d399]">
                <CheckCircle2 size={12} /> <span>{correctCount}</span>
              </div>
              <div className="flex justify-between w-full text-[#f87171]">
                <XCircle size={12} /> <span>{incorrectCount}</span>
              </div>
              <div className="flex justify-between w-full text-gray-500">
                <MinusCircle size={12} /> <span>{unattemptedCount}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. BOARD AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#13131f]">
        
        {/* Header */}
        <div className="h-11 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="w-6 h-6 rounded bg-violet-600 flex items-center justify-center text-white">
              <Sparkles size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white leading-tight">{boardMeta.title}</span>
              {boardMeta.subject && (
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{boardMeta.subject} • {boardMeta.questionCount || questions.length} Questions</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded transition-colors ${showGrid ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
              <Grid3X3 size={16} />
            </button>
            <button className="p-1.5 rounded text-gray-400 hover:bg-white/5 transition-colors">
              <Maximize2 size={16} />
            </button>
            <div className="text-xs text-gray-500 px-2">{zoom}%</div>
            <button className="p-1.5 rounded text-gray-400 hover:bg-white/5 transition-colors ml-2">
              <MoreVertical size={16} />
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 relative overflow-hidden" style={{ backgroundImage: showGrid ? 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)' : 'none', backgroundSize: '24px 24px' }}>
          
          {/* Structured DOM Layer */}
          <div className="absolute inset-0 overflow-y-auto px-8 py-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto pb-32">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500 mt-20">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Sparkles size={24} className="text-gray-600" />
                  </div>
                  <p className="text-sm">Start drawing or ask MYRAA to generate content</p>
                </div>
              ) : (
                blocks.map(block => renderBlock(block))
              )}
            </div>
          </div>

          {/* Freeform Canvas Layer */}
          <canvas 
            ref={canvasRef}
            className={`absolute inset-0 ${activeTool === 'select' ? 'pointer-events-none' : 'pointer-events-auto touch-none'}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOut={handlePointerUp}
          />
        </div>

        {/* Bottom Bar */}
        <div className="h-9 shrink-0 border-t border-white/[0.06] flex items-center justify-center gap-1 px-4 text-gray-400 bg-[#0f0f17]">
          <button onClick={() => setZoom(z => Math.max(10, z - 10))} className="p-1 rounded hover:bg-white/5 hover:text-white"><ZoomOut size={14} /></button>
          <span className="text-xs font-medium w-12 text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(400, z + 10))} className="p-1 rounded hover:bg-white/5 hover:text-white"><ZoomIn size={14} /></button>
          <div className="w-px h-4 bg-white/10 mx-2" />
          <button className="p-1 rounded hover:bg-white/5 hover:text-white" title="Fit Board"><Maximize2 size={14} /></button>
          <div className="w-px h-4 bg-white/10 mx-2" />
          <button onClick={undo} disabled={strokes.length === 0} className={`p-1 rounded ${strokes.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5 hover:text-white'}`}><Undo2 size={14} /></button>
          <button onClick={redo} disabled={undoneStrokes.length === 0} className={`p-1 rounded ${undoneStrokes.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/5 hover:text-white'}`}><Redo2 size={14} /></button>
          <div className="w-px h-4 bg-white/10 mx-2" />
          <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 hover:text-white text-xs font-medium">
            <Plus size={14} /> Add Page
          </button>
        </div>
      </div>

      {/* 3. NOTES PANEL */}
      {showNotes && (
        <div className="w-80 shrink-0 flex flex-col border-l border-white/[0.06] bg-[#13131f]">
          <div className="h-11 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-4">
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Notes</span>
            <button onClick={() => setShowNotes(false)} className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
              <X size={16} />
            </button>
          </div>
          
          <input 
            type="text" 
            placeholder="Note title..." 
            value={notesTitle}
            onChange={e => setNotesTitle(e.target.value)}
            className="w-full bg-transparent border-b border-white/[0.06] px-4 py-3 text-white font-medium focus:outline-none placeholder:text-gray-600"
          />
          
          <div className="flex items-center border-b border-white/[0.06] px-3 py-2 gap-1 text-gray-400">
            <button className="p-1.5 rounded hover:bg-white/5 hover:text-white"><Bold size={14} /></button>
            <button className="p-1.5 rounded hover:bg-white/5 hover:text-white"><Italic size={14} /></button>
            <button className="p-1.5 rounded hover:bg-white/5 hover:text-white"><Underline size={14} /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button className="p-1.5 rounded hover:bg-white/5 hover:text-white"><List size={14} /></button>
            <button className="p-1.5 rounded hover:bg-white/5 hover:text-white"><ListOrdered size={14} /></button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button className="p-1.5 rounded hover:bg-white/5 hover:text-white"><Link2 size={14} /></button>
          </div>
          
          <textarea 
            placeholder="Type your study notes here..."
            value={notesContent}
            onChange={e => setNotesContent(e.target.value)}
            className="flex-1 w-full bg-transparent p-4 text-gray-300 resize-none focus:outline-none placeholder:text-gray-600 text-sm leading-relaxed"
          />
          
          <div className="shrink-0 border-t border-white/[0.06] px-4 py-3 flex flex-col gap-3">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{notesContent.split(/\s+/).filter(Boolean).length} words</span>
              <span>Saved</span>
            </div>
            <button className="w-full py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
              <Save size={16} /> Save to Vault
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveWhiteboard;
