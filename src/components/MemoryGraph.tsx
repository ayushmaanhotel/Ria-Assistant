import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Memory, MemoryCategory } from '../lib/memoryTypes';

interface MemoryGraphProps {
  memories: Memory[];
  onSelectMemory?: (memory: Memory) => void;
  themeColor?: string;
}

const CATEGORY_COLORS: Record<MemoryCategory, string> = {
  identity: '#fbbf24',
  preference: '#f472b6',
  goal: '#34d399',
  project: '#60a5fa',
  relationship: '#c084fc',
  emotional: '#fb923c',
  behavior: '#22d3ee',
};

// Common stopwords to exclude from edge detection
const STOPWORDS = new Set([
  'the', 'and', 'with', 'that', 'this', 'from', 'have', 'been', 'will', 'about',
  'for', 'are', 'was', 'were', 'which', 'their', 'there', 'they', 'what', 'when',
  'where', 'who', 'how', 'why', 'has', 'had', 'not', 'can', 'could', 'should',
  'would', 'may', 'might', 'must', 'shall', 'then', 'than', 'because', 'while'
]);

function getWords(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOPWORDS.has(word));
}

interface Node {
  id: string;
  memory: Memory;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  words: Set<string>;
}

interface Edge {
  source: Node;
  target: Node;
  strength: number;
}

export function MemoryGraph({ memories, onSelectMemory, themeColor }: MemoryGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  
  // Interaction state
  const isDragging = useRef(false);
  const isPanning = useRef(false);
  const draggedNode = useRef<Node | null>(null);
  const lastMouse = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>();

  // Initialize graph
  useEffect(() => {
    if (!memories.length) return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const nodes: Node[] = memories.map(memory => {
      const radius = Math.max(8, Math.min(24, 8 + Math.sqrt(memory.text.length) * 0.5));
      return {
        id: memory.id,
        memory,
        x: width / 2 + (Math.random() - 0.5) * 400,
        y: height / 2 + (Math.random() - 0.5) * 400,
        vx: 0,
        vy: 0,
        radius,
        color: CATEGORY_COLORS[memory.category] || '#9ca3af',
        words: new Set(getWords(memory.text))
      };
    });

    const edges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let shared = 0;
        nodes[i].words.forEach(word => {
          if (nodes[j].words.has(word)) shared++;
        });
        
        if (shared >= 2) {
          edges.push({
            source: nodes[i],
            target: nodes[j],
            strength: shared * 0.1
          });
        }
      }
    }

    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [memories]);

  // Physics Simulation & Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    
    resize();
    window.addEventListener('resize', resize);

    const simulationLoop = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const damping = 0.92;
      const repulsion = 200;

      // Category centers for clustering
      const categories = Object.keys(CATEGORY_COLORS);
      const angleStep = (Math.PI * 2) / categories.length;
      const categoryCenters = categories.reduce((acc, cat, idx) => {
        const radius = Math.min(width, height) * 0.3;
        acc[cat] = {
          x: width / 2 + Math.cos(angleStep * idx) * radius,
          y: height / 2 + Math.sin(angleStep * idx) * radius
        };
        return acc;
      }, {} as Record<string, { x: number, y: number }>);

      // Physics step
      nodes.forEach(node => {
        if (node === draggedNode.current) return;

        let fx = 0;
        let fy = 0;

        // Node repulsion
        nodes.forEach(other => {
          if (node === other) return;
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 0 && distSq < 100000) {
            const dist = Math.sqrt(distSq);
            const force = repulsion / distSq;
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }
        });

        // Attraction to category center
        const center = categoryCenters[node.memory.category];
        if (center) {
          const dx = center.x - node.x;
          const dy = center.y - node.y;
          fx += dx * 0.001;
          fy += dy * 0.001;
        }

        // Center gravity
        const cx = width / 2 - node.x;
        const cy = height / 2 - node.y;
        fx += cx * 0.0005;
        fy += cy * 0.0005;

        node.vx = (node.vx + fx) * damping;
        node.vy = (node.vy + fy) * damping;
      });

      // Edge attraction
      edges.forEach(edge => {
        const dx = edge.target.x - edge.source.x;
        const dy = edge.target.y - edge.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
          const force = (dist - 100) * 0.01 * edge.strength;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (edge.source !== draggedNode.current) {
            edge.source.vx += fx;
            edge.source.vy += fy;
          }
          if (edge.target !== draggedNode.current) {
            edge.target.vx -= fx;
            edge.target.vy -= fy;
          }
        }
      });

      // Apply velocity
      nodes.forEach(node => {
        if (node === draggedNode.current) return;
        node.x += node.vx;
        node.y += node.vy;
      });

      // Render
      ctx.clearRect(0, 0, width, height);

      // Draw Grid
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      ctx.strokeStyle = '#ffffff10';
      ctx.lineWidth = 1 / transform.scale;
      const gridSize = 50;
      const viewMinX = -transform.x / transform.scale - width;
      const viewMaxX = (width - transform.x) / transform.scale + width;
      const viewMinY = -transform.y / transform.scale - height;
      const viewMaxY = (height - transform.y) / transform.scale + height;
      
      ctx.beginPath();
      for (let x = Math.floor(viewMinX / gridSize) * gridSize; x < viewMaxX; x += gridSize) {
        ctx.moveTo(x, viewMinY);
        ctx.lineTo(x, viewMaxY);
      }
      for (let y = Math.floor(viewMinY / gridSize) * gridSize; y < viewMaxY; y += gridSize) {
        ctx.moveTo(viewMinX, y);
        ctx.lineTo(viewMaxX, y);
      }
      ctx.stroke();

      // Draw Central Core Node (Myraa Core)
      const cx = width / 2;
      const cy = height / 2;

      // Draw radial connecting lines from center core to nodes
      nodes.forEach(node => {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(node.x, node.y);
        ctx.strokeStyle = node.color + '40';
        ctx.lineWidth = 1 / transform.scale;
        ctx.stroke();
      });

      // Draw Central Core Node Glow & Circle
      ctx.beginPath();
      ctx.arc(cx, cy, 36, 0, Math.PI * 2);
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 52);
      coreGrad.addColorStop(0, '#7c3aedff');
      coreGrad.addColorStop(0.7, '#6d28d988');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.fill();

      ctx.fillStyle = '#4c1d95';
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2 / transform.scale;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Myraa Core', cx, cy);

      // Draw edges
      edges.forEach(edge => {
        ctx.beginPath();
        ctx.moveTo(edge.source.x, edge.source.y);
        ctx.lineTo(edge.target.x, edge.target.y);
        
        const isSelectedEdge = selectedMemory && (edge.source.id === selectedMemory.id || edge.target.id === selectedMemory.id);
        const isHoveredEdge = hoveredNode && (edge.source.id === hoveredNode.id || edge.target.id === hoveredNode.id);

        if (isSelectedEdge || isHoveredEdge) {
          ctx.strokeStyle = '#ffffff60';
          ctx.lineWidth = 2 / transform.scale;
        } else {
          ctx.strokeStyle = '#ffffff20';
          ctx.lineWidth = 1 / transform.scale;
        }
        
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach(node => {
        const isSelected = selectedMemory?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        
        // Glow effect
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 2);
        gradient.addColorStop(0, `${node.color}${isSelected || isHovered ? 'ff' : '88'}`);
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(node.x - node.radius * 2, node.y - node.radius * 2, node.radius * 4, node.radius * 4);

        ctx.fillStyle = node.color;
        ctx.fill();

        if (isSelected || isHovered) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2 / transform.scale;
          ctx.stroke();
        }

        // Label
        if (transform.scale > 0.8 || isSelected || isHovered) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.max(10, 11 / transform.scale)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const label = node.memory.text.substring(0, 18) + (node.memory.text.length > 18 ? '...' : '');
          ctx.fillText(label, node.x, node.y + node.radius + 4 / transform.scale);
        }
      });

      ctx.restore();

      animationRef.current = requestAnimationFrame(simulationLoop);
    };

    animationRef.current = requestAnimationFrame(simulationLoop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [memories, transform, selectedMemory, hoveredNode]);

  // Interaction Handlers
  const getMousePos = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - transform.x) / transform.scale;
    const y = (e.clientY - rect.top - transform.y) / transform.scale;
    return { x, y };
  }, [transform]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);
    lastMouse.current = { x: e.clientX, y: e.clientY };

    // Find clicked node
    const clickedNode = [...nodesRef.current].reverse().find(node => {
      const dx = x - node.x;
      const dy = y - node.y;
      return dx * dx + dy * dy <= node.radius * node.radius;
    });

    if (clickedNode) {
      isDragging.current = true;
      draggedNode.current = clickedNode;
      if (onSelectMemory) {
        onSelectMemory(clickedNode.memory);
      }
      setSelectedMemory(clickedNode.memory);
    } else {
      isPanning.current = true;
      setSelectedMemory(null);
      if (onSelectMemory) {
        onSelectMemory(null as any);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getMousePos(e);

    if (isDragging.current && draggedNode.current) {
      draggedNode.current.x = x;
      draggedNode.current.y = y;
      draggedNode.current.vx = 0;
      draggedNode.current.vy = 0;
    } else if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    } else {
      // Hover detection
      const hovered = [...nodesRef.current].reverse().find(node => {
        const dx = x - node.x;
        const dy = y - node.y;
        return dx * dx + dy * dy <= node.radius * node.radius;
      });
      setHoveredNode(hovered || null);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isPanning.current = false;
    draggedNode.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const delta = -e.deltaY * zoomSensitivity;
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform(prev => {
      const newScale = Math.min(Math.max(0.3, prev.scale * (1 + delta)), 3);
      const scaleRatio = newScale / prev.scale;
      
      return {
        x: mouseX - (mouseX - prev.x) * scaleRatio,
        y: mouseY - (mouseY - prev.y) * scaleRatio,
        scale: newScale
      };
    });
  };

  const resetTransform = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  if (!memories.length) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#060814] text-slate-400 font-sans">
        <p>No memories yet. Add some memories to populate graph nodes.</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-[#060814] overflow-hidden font-sans select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      style={{ cursor: isDragging.current ? 'grabbing' : isPanning.current ? 'grabbing' : hoveredNode ? 'pointer' : 'grab' }}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Legend Box */}
      <div className="absolute top-4 right-4 bg-[#0a0d24]/90 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-2xl pointer-events-none w-44">
        <h3 className="text-white text-xs font-bold font-mono tracking-wider mb-2.5 uppercase">Categories</h3>
        <div className="flex flex-col gap-1.5 font-mono text-[10px]">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="capitalize">{cat}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Zoom & Reset View Bar */}
      <div className="absolute bottom-4 inset-x-4 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-[#090b1c]/90 backdrop-blur-md text-slate-300 text-xs font-mono">
          <button onClick={() => setTransform(p => ({ ...p, scale: Math.max(0.4, p.scale - 0.1) }))} className="px-2 py-0.5 hover:text-white cursor-pointer font-bold">-</button>
          <span>{Math.round(transform.scale * 100)}%</span>
          <button onClick={() => setTransform(p => ({ ...p, scale: Math.min(2.5, p.scale + 0.1) }))} className="px-2 py-0.5 hover:text-white cursor-pointer font-bold">+</button>
        </div>

        <button
          onClick={resetTransform}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-[#090b1c]/90 backdrop-blur-md text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
        >
          <span>🔄 Reset View</span>
        </button>
      </div>

      {/* Hover Tooltip */}
      {hoveredNode && !selectedMemory && !isDragging.current && !isPanning.current && (
        <div className="absolute bottom-16 right-4 max-w-xs bg-[#090b1c]/95 backdrop-blur-md p-3.5 rounded-xl border border-white/15 shadow-2xl pointer-events-none">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredNode.color }} />
            <span className="text-slate-300 text-[10px] font-mono uppercase font-bold">{hoveredNode.memory.category}</span>
          </div>
          <p className="text-white text-xs leading-relaxed line-clamp-3">{hoveredNode.memory.text}</p>
        </div>
      )}

      {/* Selected Node Panel */}
      {selectedMemory && (
        <div className="absolute bottom-16 right-4 w-72 bg-[#090b1c]/95 backdrop-blur-xl p-4 rounded-xl border border-purple-500/30 shadow-2xl">
          <button 
            onClick={() => setSelectedMemory(null)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition cursor-pointer text-sm"
          >
            ×
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div 
              className="w-2.5 h-2.5 rounded-full" 
              style={{ backgroundColor: CATEGORY_COLORS[selectedMemory.category] || '#9ca3af' }} 
            />
            <span className="text-slate-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              {selectedMemory.category}
            </span>
          </div>
          <p className="text-white text-xs leading-relaxed mb-3 max-h-36 overflow-y-auto pr-1">
            {selectedMemory.text}
          </p>
          <div className="text-slate-400 text-[9px] font-mono">
            Recorded: {new Date(selectedMemory.createdAt).toLocaleDateString()}
          </div>
        </div>
      )}
    </div>
  );
}
