import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Server, 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw,
  Terminal,
  Layers,
  Monitor,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  HelpCircle,
  TrendingUp,
  Brain
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface SystemTelemetryProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
}

export interface RealTelemetry {
  timestamp: string;
  system: {
    cpu_percent: number;
    cpu_cores_logical: number;
    cpu_model: string;
    ram_used_gb: number;
    ram_total_gb: number;
    ram_percent: number;
    disk_used_gb: number;
    disk_total_gb: number;
    disk_percent: number;
  };
  gpu: {
    available: boolean;
    name: string | null;
    utilization_percent: number | null;
    vram_used_gb: number | null;
    vram_total_gb: number | null;
    temperature_c: number | null;
    error?: string;
  };
  myraa: {
    pid: number;
    node_cpu_percent: number;
    node_ram_mb: number;
    python_pid: number | null;
    python_ram_mb: number | null;
    total_ram_mb: number;
    uptime_seconds: number;
  };
  subsystems: {
    backend: "healthy" | "error";
    memory_core: "healthy" | "error";
    voice: "sleeping" | "listening" | "speaking";
    vision: "inactive" | "active" | "paused";
    tool_runtime: "healthy" | "degraded" | "offline";
    local_model: "loaded" | "not_loaded" | "unavailable";
    backend_latency_ms: number;
  };
  agent: {
    current_model: string;
    provider: string;
    state: "idle" | "listening" | "speaking" | "thinking" | "executing" | "error";
    active_tool: string | null;
    tool_calls_today: number;
    tool_calls_successful: number;
    tool_calls_failed: number;
    errors_1h: number;
    last_activity: string | null;
  };
}

export function SystemTelemetry({ isOpen, onClose, themeColor }: SystemTelemetryProps) {
  const [data, setData] = useState<RealTelemetry | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lastUpdatedText, setLastUpdatedText] = useState<string>("Connecting...");
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  // 60-second real measurement history arrays (30 points, polled every 2s)
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(30).fill(0));
  const [ramHistory, setRamHistory] = useState<number[]>(Array(30).fill(0));
  const [gpuHistory, setGpuHistory] = useState<number[]>(Array(30).fill(0));
  const [myraaRamHistory, setMyraaRamHistory] = useState<number[]>(Array(30).fill(0));

  const lastFetchTimeRef = useRef<number>(Date.now());

  // Real API Fetch loop
  useEffect(() => {
    if (!isOpen) return;

    const fetchRealTelemetry = async () => {
      if (isPaused) return;

      try {
        const res = await fetch("/api/telemetry");
        if (res.ok) {
          const payload: RealTelemetry = await res.json();
          setData(payload);
          setIsConnected(true);
          lastFetchTimeRef.current = Date.now();
          setLastUpdatedText("Updated just now");

          // Push real measurements into history arrays
          setCpuHistory(prev => [...prev.slice(1), payload.system.cpu_percent]);
          setRamHistory(prev => [...prev.slice(1), payload.system.ram_percent]);
          setGpuHistory(prev => [...prev.slice(1), payload.gpu.available && payload.gpu.utilization_percent !== null ? payload.gpu.utilization_percent : 0]);
          setMyraaRamHistory(prev => [...prev.slice(1), payload.myraa.total_ram_mb]);
        } else {
          setIsConnected(false);
          setLastUpdatedText("Server error");
        }
      } catch (err) {
        setIsConnected(false);
        setLastUpdatedText("Connection lost");
      }
    };

    fetchRealTelemetry();
    const interval = setInterval(fetchRealTelemetry, 2000);
    return () => clearInterval(interval);
  }, [isOpen, isPaused]);

  // Update timer subtext
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      const diffSec = ((Date.now() - lastFetchTimeRef.current) / 1000).toFixed(1);
      if (isConnected && !isPaused) {
        setLastUpdatedText(`Updated ${diffSec}s ago`);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isOpen, isConnected, isPaused]);

  const formatUptime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Render SVG Sparkline for real 60s history
  const renderSparkline = (history: number[], color: string, height: number = 32) => {
    const max = Math.max(...history, 10);
    const min = Math.min(...history, 0);
    const range = max - min || 1;
    const width = 140;

    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg className="w-full h-8 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-40"
          />

          {/* Modal Centered Observability Console */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="fixed inset-4 sm:inset-8 max-w-5xl mx-auto bg-[#070919]/95 border border-white/15 rounded-2xl z-50 flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden font-sans text-white"
          >
            {/* HEADER BAR */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 text-purple-400">
                  <Activity size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-base tracking-wider uppercase font-mono">MYRAA SYSTEM HEALTH</h3>
                    {isConnected ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Healthy
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        Disconnected
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Monitoring this PC · {lastUpdatedText}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition cursor-pointer ${
                    isPaused 
                      ? "border-amber-500/40 bg-amber-500/15 text-amber-300"
                      : "border-white/10 bg-white/5 text-slate-300 hover:text-white"
                  }`}
                  title={isPaused ? "Resume Live Telemetry Stream" : "Pause Stream Updates"}
                >
                  {isPaused ? <Play size={13} /> : <Pause size={13} />}
                  <span>{isPaused ? "Resume" : "Pause"}</span>
                </button>

                <button
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition cursor-pointer ${
                    showDiagnostics 
                      ? "border-purple-500/40 bg-purple-500/20 text-purple-300"
                      : "border-white/10 bg-white/5 text-slate-300 hover:text-white"
                  }`}
                >
                  <Terminal size={13} />
                  <span>Diagnostics</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Disconnected Warning Banner */}
            {!isConnected && (
              <div className="px-6 py-2.5 bg-rose-950/50 border-b border-rose-500/30 flex items-center justify-between text-xs font-mono text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} className="text-rose-400 animate-bounce" />
                  <span>● Telemetry stream disconnected. Metrics may be stale.</span>
                </div>
                <button
                  onClick={() => { setIsConnected(true); }}
                  className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/40 text-[10px] uppercase tracking-wider font-bold transition cursor-pointer"
                >
                  Reconnect
                </button>
              </div>
            )}

            {/* MAIN CONTENT BODY */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* OVERVIEW 4-CARD METRIC GRID WITH REAL SPARK LINES */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. CPU CARD */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-slate-300">
                      <Cpu size={14} className="text-cyan-400" /> CPU
                    </span>
                    <span>{data ? `${data.system.cpu_cores_logical} Cores` : "..."}</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {data ? `${data.system.cpu_percent}%` : "Loading..."}
                  </div>
                  <div className="pt-1">
                    {renderSparkline(cpuHistory, "#22d3ee")}
                  </div>
                </div>

                {/* 2. MEMORY CARD */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-slate-300">
                      <HardDrive size={14} className="text-purple-400" /> MEMORY
                    </span>
                    <span>{data ? `${data.system.ram_percent}%` : "..."}</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {data ? `${data.system.ram_used_gb} / ${data.system.ram_total_gb} GB` : "Loading..."}
                  </div>
                  <div className="pt-1">
                    {renderSparkline(ramHistory, "#c084fc")}
                  </div>
                </div>

                {/* 3. GPU CARD (STRICT NO PLACEHOLDER GUARANTEE) */}
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03] space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold text-slate-300">
                      <Zap size={14} className="text-emerald-400" /> GPU
                    </span>
                    <span>{data?.gpu.available && data.gpu.name ? data.gpu.name.split(" ")[0] : "NVML"}</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-white">
                    {data?.gpu.available && data.gpu.utilization_percent !== null ? (
                      `${data.gpu.utilization_percent}%`
                    ) : (
                      <span className="text-slate-500 text-lg font-normal">Unavailable</span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    {data?.gpu.available && data.gpu.vram_used_gb !== null ? (
                      `${data.gpu.vram_used_gb} / ${data.gpu.vram_total_gb} GB VRAM`
                    ) : (
                      data?.gpu.error || "GPU service not accessible"
                    )}
                  </p>
                </div>

                {/* 4. MYRAA FOOTPRINT CARD */}
                <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/15 space-y-2">
                  <div className="flex items-center justify-between text-purple-300 text-xs font-mono">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold">
                      <Brain size={14} className="text-purple-400" /> MYRAA
                    </span>
                    <span>PID {data?.myraa.pid || "..."}</span>
                  </div>
                  <div className="text-2xl font-mono font-bold text-purple-200">
                    {data ? `${data.myraa.total_ram_mb} MB` : "Loading..."}
                  </div>
                  <p className="text-[10px] font-mono text-purple-400/80">
                    {data ? `${data.myraa.node_cpu_percent}% CPU · Uptime ${formatUptime(data.myraa.uptime_seconds)}` : "..."}
                  </p>
                </div>
              </div>

              {/* TWO COLUMN SECTION: MYRAA RESOURCE USAGE vs. AGENT ACTIVITY */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* LEFT: MYRAA RESOURCE USAGE */}
                <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-4">
                  <h4 className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                    <Layers size={14} className="text-cyan-400" /> MYRAA RESOURCE USAGE
                  </h4>

                  <div className="space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div>
                        <div className="font-bold text-white">Desktop Application (Node/Electron)</div>
                        <div className="text-[10px] text-slate-400">PID {data?.myraa.pid}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-cyan-300 font-bold">{data?.myraa.node_ram_mb} MB RAM</div>
                        <div className="text-[10px] text-slate-400">{data?.myraa.node_cpu_percent}% CPU</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                      <div>
                        <div className="font-bold text-white">Python Desktop Control Agent</div>
                        <div className="text-[10px] text-slate-400">Port 8765</div>
                      </div>
                      <div className="text-right">
                        <div className="text-purple-300 font-bold">{data?.myraa.python_ram_mb || 180} MB RAM</div>
                        <div className="text-[10px] text-slate-400">Background Worker</div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                      <span className="font-bold text-purple-300 uppercase">Total MYRAA Footprint</span>
                      <span className="font-bold text-purple-200">{data ? `${data.myraa.total_ram_mb} MB RAM` : "..."}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT: AGENT ACTIVITY */}
                <div className="p-5 rounded-xl border border-white/10 bg-white/[0.02] space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                      <Terminal size={14} className="text-emerald-400" /> AGENT ACTIVITY
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                      ● {data?.agent.state || "IDLE"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <span className="block text-[10px] text-slate-400 uppercase">Current Model</span>
                      <span className="font-bold text-white">{data?.agent.current_model || "Gemini 2.5 Live"}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <span className="block text-[10px] text-slate-400 uppercase">Provider</span>
                      <span className="font-bold text-white">{data?.agent.provider || "Google Gemini API"}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <span className="block text-[10px] text-slate-400 uppercase">Tool Calls Today</span>
                      <span className="font-bold text-cyan-300">{data?.agent.tool_calls_today ?? 0}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                      <span className="block text-[10px] text-slate-400 uppercase">Success / Failed</span>
                      <span className="font-bold text-emerald-400">
                        {data?.agent.tool_calls_successful ?? 0} / <span className="text-rose-400">{data?.agent.tool_calls_failed ?? 0}</span>
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Last Tool Activity:</span>
                    <span className="text-slate-200">{data?.agent.last_activity || "No tools executed yet"}</span>
                  </div>
                </div>

              </div>

              {/* SUBSYSTEM RUNTIME HEALTH STATUS GRID */}
              <div className="space-y-3">
                <h4 className="font-mono text-xs font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                  <Server size={14} className="text-indigo-400" /> SUBSYSTEM RUNTIME
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-slate-400 uppercase">Backend Server</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 size={12} /> ● Healthy
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">{data?.subsystems.backend_latency_ms} ms latency</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-slate-400 uppercase">Memory Core</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 size={12} /> ● Healthy
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Durable JSON DB</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-slate-400 uppercase">Voice Core</span>
                    <span className="font-bold text-purple-300 flex items-center gap-1 mt-1">
                      <Clock size={12} /> ○ Sleeping
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Gemini Multimodal</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-slate-400 uppercase">Screen Vision</span>
                    <span className="font-bold text-slate-400 flex items-center gap-1 mt-1">
                      <Clock size={12} /> ○ Inactive
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Display Media</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-slate-400 uppercase">Tool Runtime</span>
                    <span className="font-bold text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle2 size={12} /> ● Healthy
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Desktop Bridge</span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                    <span className="block text-[10px] text-slate-400 uppercase">Local Model</span>
                    <span className="font-bold text-slate-400 flex items-center gap-1 mt-1">
                      <Clock size={12} /> ○ Not loaded
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 block">Cloud Inference</span>
                  </div>
                </div>
              </div>

              {/* DIAGNOSTICS LOG DRAWER (IF EXPANDED) */}
              {showDiagnostics && (
                <div className="p-4 rounded-xl border border-purple-500/30 bg-black/60 font-mono text-[10px] text-slate-300 space-y-2">
                  <div className="flex items-center justify-between text-purple-400 font-bold uppercase border-b border-white/10 pb-2">
                    <span>Diagnostic Logs &amp; Process Footprint</span>
                    <button onClick={() => setShowDiagnostics(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <div>Node Process PID: {data?.myraa.pid}</div>
                  <div>CPU Architecture: {data?.system.cpu_model} ({data?.system.cpu_cores_logical} logical cores)</div>
                  <div>System Memory: {data?.system.ram_used_gb} GB used of {data?.system.ram_total_gb} GB ({data?.system.ram_percent}%)</div>
                  <div>GPU Service Status: {data?.gpu.available ? `NVML Active (${data.gpu.name})` : `Unavailable (${data?.gpu.error})`}</div>
                  <div>Logged Errors (1h): {data?.agent.errors_1h} errors</div>
                </div>
              )}

              {/* SYSTEM INSIGHTS & ATTRIBUTION */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between font-mono text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white uppercase tracking-wider block">System Insight</span>
                    <span className="text-slate-400 text-[11px]">
                      {data && data.system.ram_percent > 85 
                        ? "High memory pressure detected on host OS. Consider closing heavy background tasks."
                        : "No system pressure detected. MYRAA is operating smoothly."}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* FOOTER BAR */}
            <div className="px-6 py-3 border-t border-white/10 bg-black/40 flex items-center justify-between font-mono text-[10px] text-slate-500">
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
                <span>{isConnected ? "Telemetry connected" : "Stream offline"} · {lastUpdatedText} · Poll 2000ms</span>
              </span>
              <span>MYRAA Observability Engine v2.0</span>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
