import React, { useEffect, useState } from "react";
import {
  Settings,
  X,
  Power,
  Mic,
  Cpu,
  Info,
  Check,
  AlertTriangle,
  Volume2,
  Sparkles,
  User,
  Folder,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  ExternalLink,
  Tv,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  MyraaSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "../lib/settingsStore";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current settings (owned by App so wake-word state stays in sync). */
  settings: MyraaSettings;
  /** Persist a settings patch (also notifies App of changes). */
  onChange: (patch: Partial<MyraaSettings>) => void;
  themeColor: string;
}

type SettingsTab = "general" | "assistant" | "voice" | "system" | "key" | "about";

/** A single toggle row matching the existing "Screen Vision Mode" switch style. */
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-left">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold font-mono text-slate-200">{label}</span>
        <span className="text-[8px] text-slate-400 uppercase font-mono max-w-[200px]">
          {description}
        </span>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
          checked ? "bg-cyan-500" : "bg-white/10"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({ isOpen, onClose, settings, onChange, themeColor }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [agentHealth, setAgentHealth] = useState<{
    online: boolean;
    toolCount?: number;
    cpu?: string;
    ram?: string;
  }>({ online: false });

  const [configTestResult, setConfigTestResult] = useState<{
    testing: boolean;
    valid?: boolean;
    error?: string;
    config?: any;
  }>({ testing: false });

  const handleTestRiaConfig = async () => {
    setConfigTestResult({ testing: true });
    try {
      const pathParam = encodeURIComponent(settings.riaCustomConfigPath || "");
      const res = await fetch(`/api/ria-config?path=${pathParam}`);
      const data = await res.json();
      if (res.ok && data.valid) {
        setConfigTestResult({ testing: false, valid: true, config: data.config });
      } else {
        setConfigTestResult({ testing: false, valid: false, error: data.error || "Invalid config file." });
      }
    } catch (err: any) {
      setConfigTestResult({ testing: false, valid: false, error: err.message || "Failed to connect to config validator API." });
    }
  };

  // Enumerate microphones (mirrors how audio.ts grabs getUserMedia).
  useEffect(() => {
    if (!isOpen) return;
    const enumerate = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMics(devices.filter((d) => d.kind === "audioinput"));
      } catch {
        /* permission may be needed first */
      }
    };
    enumerate();
  }, [isOpen]);

  // Probe desktop agent health (port 8765) via the server-side logs/health proxy.
  useEffect(() => {
    if (!isOpen) return;
    const probe = async () => {
      try {
        // Re-use the local agent directly (same machine, same browser).
        const res = await fetch("http://127.0.0.1:8765/health", { cache: "no-store" });
        if (!res.ok) {
          setAgentHealth({ online: false });
          return;
        }
        const data = await res.json();
        setAgentHealth({ online: true, toolCount: data.tool_count });
      } catch {
        // Cross-origin may fail; try the server proxy as a fallback.
        try {
          const res2 = await fetch("/api/agent-health", { cache: "no-store" });
          if (res2.ok) {
            const d = await res2.json();
            setAgentHealth({ online: !!d.online, toolCount: d.tool_count });
            return;
          }
        } catch {
          /* ignore */
        }
        setAgentHealth({ online: false });
      }
    };
    probe();
    const id = setInterval(probe, 5000);
    return () => clearInterval(id);
  }, [isOpen]);

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{
    loading: boolean;
    hasKey: boolean;
    saving: boolean;
    success?: boolean;
    error?: string;
  }>({ loading: true, hasKey: false, saving: false });

  const fetchApiKeyStatus = async () => {
    try {
      const res = await fetch("/api/config", { cache: "no-store" });
      const data = await res.json();
      setApiKeyStatus((prev) => ({ ...prev, loading: false, hasKey: !!data.hasApiKey }));
    } catch {
      setApiKeyStatus((prev) => ({ ...prev, loading: false, hasKey: false }));
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchApiKeyStatus();
  }, [isOpen]);

  const handleUpdateApiKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const key = apiKeyInput.trim();
    if (!key) return;

    setApiKeyStatus((prev) => ({ ...prev, saving: true, error: undefined, success: false }));
    try {
      const res = await fetch("/api/config/apikey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to validate/update API key.");
      }
      setApiKeyInput("");
      setApiKeyStatus({ loading: false, hasKey: true, saving: false, success: true });
    } catch (err: any) {
      setApiKeyStatus((prev) => ({
        ...prev,
        saving: false,
        success: false,
        error: err.message || "Failed to update API key.",
      }));
    }
  };

  const getThemeBadgeGlow = () => {
    switch (themeColor) {
      case "violet": return "border-purple-500/30 text-purple-400 bg-purple-500/10";
      case "crimson": return "border-rose-500/30 text-rose-400 bg-rose-500/10";
      case "emerald": return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
      case "celestial": return "border-sky-500/30 text-sky-400 bg-sky-500/10";
      case "gold": return "border-amber-500/30 text-amber-400 bg-amber-500/10";
      case "rose": return "border-pink-500/30 text-pink-400 bg-pink-500/10";
      case "charcoal":
      default:
        return "border-indigo-500/30 text-indigo-400 bg-indigo-500/10";
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "general", label: "GENERAL", icon: Power },
    { id: "assistant", label: "ASSISTANT", icon: User },
    { id: "voice", label: "VOICE", icon: Mic },
    { id: "system", label: "SYSTEM", icon: Cpu },
    { id: "key", label: "API KEY", icon: KeyRound },
    { id: "about", label: "ABOUT", icon: Info },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay — identical to MemoryDashboard */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 z-40 backdrop-blur-sm"
          />

          {/* Slide-over Container — identical shell to MemoryDashboard */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-y-0 right-0 w-full max-w-lg bg-[#020206]/95 border-l border-white/15 backdrop-blur-2xl z-50 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${getThemeBadgeGlow()}`}>
                  <Settings size={22} className="animate-spin [animation-duration:6s]" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-lg tracking-tight text-white flex items-center gap-2">
                    Myraa Configuration
                    <Sparkles size={14} className="text-cyan-400" />
                  </h3>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mt-0.5">
                    System settings &amp; preferences
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab selector row — mirrors MemoryDashboard pill style */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2 overflow-x-auto">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono tracking-wider transition shrink-0 cursor-pointer ${
                      active
                        ? "border-cyan-400 bg-cyan-400/10 text-cyan-300"
                        : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={12} />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* ---------------- GENERAL ---------------- */}
              {activeTab === "general" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Startup &amp; Appearance
                  </div>

                  <ToggleRow
                    label="LAUNCH AT STARTUP"
                    description="Start Myraa silently when Windows logs in"
                    checked={settings.autoStart}
                    onChange={(v) => {
                      onChange({ autoStart: v });
                      // Persist + push to backend; the desktop agent flips the
                      // HKCU Run registry key. We just record intent here.
                      void fetch("/api/settings", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ autoStart: v }),
                      }).catch(() => {});
                    }}
                  />

                  <ToggleRow
                    label="UI ANIMATIONS"
                    description="Enable motion and orb transitions"
                    checked={settings.animations}
                    onChange={(v) => onChange({ animations: v })}
                  />

                  {settings.autoStart && (
                    <div className="mt-2 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
                      <Check size={14} className="text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-mono text-emerald-300/80">
                        Myraa will auto-launch on next Windows login.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* ---------------- ASSISTANT ---------------- */}
              {activeTab === "assistant" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Active Persona Selection
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onChange({ activeAssistant: "MYRAA" })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        settings.activeAssistant === "MYRAA"
                          ? "border-cyan-400 bg-cyan-400/10 text-cyan-200"
                          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                        <Sparkles size={14} className="text-cyan-400" />
                        MYRAA
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-1">
                        Anime Companion
                      </div>
                    </button>

                    <button
                      onClick={() => onChange({ activeAssistant: "Ria" })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        settings.activeAssistant === "Ria"
                          ? "border-purple-400 bg-purple-400/10 text-purple-200"
                          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                        <User size={14} className="text-purple-400" />
                        Ria
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-1">
                        Empathetic Co-Assistant
                      </div>
                    </button>

                    <button
                      onClick={() => onChange({ activeAssistant: "Mike" })}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                        settings.activeAssistant === "Mike"
                          ? "border-amber-400 bg-amber-400/10 text-amber-200"
                          : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-mono font-bold text-xs flex items-center gap-1.5">
                        <Tv size={14} className="text-amber-400" />
                        Mike
                      </div>
                      <div className="text-[9px] font-mono text-slate-400 mt-1">
                        Cartoon Mouse
                      </div>
                    </button>
                  </div>

                  {/* Camera Framing & Avatar Zoom Settings */}
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 pt-2 border-t border-white/5">
                    Camera & Visual Framing
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Maximize2 size={14} className="text-cyan-400" />
                        <div>
                          <div className="text-xs font-mono font-bold text-white">Framing Mode</div>
                          <div className="text-[9px] font-mono text-slate-400">Wide Shot (Full Character) vs Close Crop (Face Focus)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
                        <button
                          onClick={() => onChange({ characterFit: "contain" })}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition cursor-pointer ${
                            (settings.characterFit ?? "contain") === "contain"
                              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          WIDE SHOT
                        </button>
                        <button
                          onClick={() => onChange({ characterFit: "cover" })}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition cursor-pointer ${
                            (settings.characterFit ?? "contain") === "cover"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          CLOSE CROP
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ZoomIn size={14} className="text-purple-400" />
                        <div>
                          <div className="text-xs font-mono font-bold text-white">Avatar Scale Zoom</div>
                          <div className="text-[9px] font-mono text-slate-400">Adjust video scale ({settings.characterZoom ?? 85}%)</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const cur = settings.characterZoom ?? 85;
                            onChange({ characterZoom: Math.max(40, cur - 10) });
                          }}
                          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Zoom Out"
                        >
                          <ZoomOut size={12} />
                        </button>
                        <input
                          type="range"
                          min="40"
                          max="160"
                          step="5"
                          value={settings.characterZoom ?? 85}
                          onChange={(e) => onChange({ characterZoom: parseInt(e.target.value) })}
                          className="w-24 accent-cyan-400 cursor-pointer"
                        />
                        <button
                          onClick={() => {
                            const cur = settings.characterZoom ?? 85;
                            onChange({ characterZoom: Math.min(160, cur + 10) });
                          }}
                          className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Zoom In"
                        >
                          <ZoomIn size={12} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* MYRAA Persona Configuration */}
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 pt-2 border-t border-white/5">
                    MYRAA Persona Configuration
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                      MYRAA Voice Model
                    </label>
                    <select
                      value={settings.myraaVoice || "Aoede"}
                      onChange={(e) => onChange({ myraaVoice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400/50 transition cursor-pointer"
                    >
                      <option value="Aoede">Aoede (Expressive / Anime Heroine)</option>
                      <option value="Kore">Kore (Warm / Empathetic)</option>
                      <option value="Fenrir">Fenrir (Authoritative / Clear)</option>
                      <option value="Puck">Puck (Friendly / Playful)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-cyan-300 uppercase flex items-center justify-between">
                      <span>MYRAA System Prompt Constitution (Inviolable)</span>
                      <span className="text-[8px] text-cyan-400/80 lowercase">Supreme Law</span>
                    </label>
                    <textarea
                      rows={5}
                      value={settings.myraaSystemPrompt || ""}
                      onChange={(e) => onChange({ myraaSystemPrompt: e.target.value })}
                      placeholder="Define MYRAA's supreme constitutional instructions here. MYRAA will follow these instructions without any hesitation, refusal, or resistance..."
                      className="w-full px-3 py-2 rounded-xl border border-cyan-500/20 bg-cyan-950/20 text-xs text-white font-mono focus:outline-none focus:border-cyan-400 transition resize-y min-h-[90px]"
                    />
                    <span className="text-[8px] text-slate-400 uppercase font-mono">
                      MYRAA's independent constitution — enforced with zero hesitation
                    </span>
                  </div>

                  {/* Ria Persona & Custom Config */}
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 pt-2 border-t border-white/5">
                    Ria Persona &amp; Custom Config
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                      Ria Voice Model
                    </label>
                    <select
                      value={settings.riaVoice || "Kore"}
                      onChange={(e) => onChange({ riaVoice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-mono focus:outline-none focus:border-purple-400/50 transition cursor-pointer"
                    >
                      <option value="Kore">Kore (Warm / Empathetic)</option>
                      <option value="Aoede">Aoede (Expressive / Lively)</option>
                      <option value="Fenrir">Fenrir (Authoritative / Clear)</option>
                      <option value="Puck">Puck (Friendly / Playful)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-purple-300 uppercase flex items-center justify-between">
                      <span>Ria System Prompt Constitution (Inviolable)</span>
                      <span className="text-[8px] text-purple-400/80 lowercase">Supreme Law</span>
                    </label>
                    <textarea
                      rows={5}
                      value={settings.riaSystemPrompt || ""}
                      onChange={(e) => onChange({ riaSystemPrompt: e.target.value })}
                      placeholder="Define Ria's supreme constitutional instructions here. Ria will follow these instructions without any hesitation, refusal, or resistance..."
                      className="w-full px-3 py-2 rounded-xl border border-purple-500/20 bg-purple-950/20 text-xs text-white font-mono focus:outline-none focus:border-purple-400 transition resize-y min-h-[90px]"
                    />
                    <span className="text-[8px] text-slate-400 uppercase font-mono">
                      Ria's independent constitution — enforced with zero hesitation
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase flex items-center gap-1">
                      <Folder size={12} className="text-purple-400" />
                      Custom Config Path
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={settings.riaCustomConfigPath || ""}
                        onChange={(e) => onChange({ riaCustomConfigPath: e.target.value })}
                        placeholder="C:\Users\...\ria_config.json"
                        className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white font-mono focus:outline-none focus:border-purple-400/50 transition"
                      />
                      <button
                        type="button"
                        onClick={handleTestRiaConfig}
                        disabled={configTestResult.testing}
                        className="px-3 py-2 rounded-xl border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-mono text-xs tracking-wider transition shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        {configTestResult.testing ? "TESTING..." : "TEST CONFIG"}
                      </button>
                    </div>
                    <span className="text-[8px] text-slate-400 uppercase font-mono">
                      Optional local path to load Ria's custom personality or memory data on boot
                    </span>
                  </div>

                  {/* Config Test Result Feedback Badge */}
                  {configTestResult.valid !== undefined && (
                    <div
                      className={`p-3 rounded-xl border flex items-start gap-2 ${
                        configTestResult.valid
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {configTestResult.valid ? (
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="text-[10px] font-mono leading-relaxed">
                        {configTestResult.valid ? (
                          <div>
                            <span className="font-bold">✓ Config Valid:</span> Loaded custom persona configuration for{" "}
                            <span className="text-white font-bold">{configTestResult.config?.assistantName || "Ria"}</span>
                            {configTestResult.config?.voice && ` (Voice: ${configTestResult.config.voice})`}.
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold">✗ File Error:</span> {configTestResult.error}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Mike Persona Configuration */}
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500 pt-3 border-t border-white/5">
                    Mike Persona Configuration
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                      Mike Voice Model
                    </label>
                    <select
                      value={settings.mikeVoice || "Fenrir"}
                      onChange={(e) => onChange({ mikeVoice: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-mono focus:outline-none focus:border-amber-400/50 transition cursor-pointer"
                    >
                      <option value="Fenrir">Fenrir (Clear / Animated)</option>
                      <option value="Puck">Puck (Friendly / Playful)</option>
                      <option value="Aoede">Aoede (Expressive)</option>
                      <option value="Kore">Kore (Warm)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-amber-300 uppercase flex items-center justify-between">
                      <span>Mike System Prompt (Cartoon Mouse Persona)</span>
                      <span className="text-[8px] text-amber-400/80 lowercase">Supreme Law</span>
                    </label>
                    <textarea
                      rows={5}
                      value={settings.mikeSystemPrompt || ""}
                      onChange={(e) => onChange({ mikeSystemPrompt: e.target.value })}
                      placeholder="Define Mike's cartoon mouse system prompt here..."
                      className="w-full px-3 py-2 rounded-xl border border-amber-500/20 bg-amber-950/20 text-xs text-white font-mono focus:outline-none focus:border-amber-400 transition resize-y min-h-[90px]"
                    />
                    <span className="text-[8px] text-slate-400 uppercase font-mono">
                      Mike's independent cartoon mouse constitution — isolated memory core: memories_mike.json
                    </span>
                  </div>
                </div>
              )}

              {/* ---------------- VOICE ---------------- */}
              {activeTab === "voice" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Wake Word &amp; Microphone
                  </div>

                  <ToggleRow
                    label="WAKE WORD"
                    description="Always-listen for the activation phrase"
                    checked={settings.wakeWordEnabled}
                    onChange={(v) => onChange({ wakeWordEnabled: v })}
                  />

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                      Wake Phrase
                    </label>
                    <input
                      type="text"
                      value={settings.wakePhrase}
                      onChange={(e) => onChange({ wakePhrase: e.target.value })}
                      placeholder="hey myraa"
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400/50 transition"
                    />
                    <span className="text-[8px] text-slate-500 uppercase font-mono">
                      Say this phrase to activate Myraa
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                      Microphone
                    </label>
                    <select
                      value={settings.micDeviceId}
                      onChange={(e) => onChange({ micDeviceId: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-white font-mono focus:outline-none focus:border-cyan-400/50 transition cursor-pointer"
                    >
                      <option value="">System Default</option>
                      {mics.map((m, i) => (
                        <option key={m.deviceId || i} value={m.deviceId}>
                          {m.label || `Microphone ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    <span className="text-[8px] text-slate-500 uppercase font-mono">
                      {mics.length === 0
                        ? "Grant mic permission to list devices"
                        : `${mics.length} device(s) detected`}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono tracking-wider text-slate-300 uppercase">
                        Sensitivity
                      </label>
                      <span className="text-[10px] font-mono text-cyan-300">
                        {settings.sensitivity}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={settings.sensitivity}
                      onChange={(e) => onChange({ sensitivity: Number(e.target.value) })}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                    <span className="text-[8px] text-slate-500 uppercase font-mono">
                      Higher = faster re-arm &amp; more matches
                    </span>
                  </div>
                </div>
              )}

              {/* ---------------- SYSTEM ---------------- */}
              {activeTab === "system" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Desktop Control Agent
                  </div>

                  <div
                    className={`p-4 rounded-xl border flex items-center gap-3 ${
                      agentHealth.online
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-rose-500/20 bg-rose-500/5"
                    }`}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        agentHealth.online ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="text-xs font-mono text-white">
                        {agentHealth.online ? "Agent Online" : "Agent Offline"}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {agentHealth.online
                          ? `${agentHealth.toolCount ?? 0} tools registered`
                          : "Start the Python agent on port 8765"}
                      </div>
                    </div>
                    <Cpu size={16} className="text-slate-500" />
                  </div>

                  <div className="p-3 rounded-xl border border-white/5 bg-white/5 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      <Volume2 size={12} /> Capabilities
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-300">
                      <span>✓ App control</span>
                      <span>✓ Browser</span>
                      <span>✓ Volume</span>
                      <span>✓ Brightness</span>
                      <span>✓ Power</span>
                      <span>✓ Files</span>
                      <span>✓ Screenshot</span>
                      <span>✓ Clipboard</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- API KEY ---------------- */}
              {activeTab === "key" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    Google Gemini API Key Credentials
                  </div>

                  <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-indigo-400" />
                        <span className="text-xs font-mono font-bold text-white">Gemini API Key</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {apiKeyStatus.hasKey ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
                            <Check size={10} /> ACTIVE &amp; VALIDATED
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-mono font-bold flex items-center gap-1">
                            <AlertTriangle size={10} /> NOT CONFIGURED
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                      MYRAA &amp; Ria use Google Gemini Live for real-time voice, vision, and desktop actions. Your key is stored securely on your PC and never shared.
                    </p>

                    <form onSubmit={handleUpdateApiKey} className="space-y-2.5">
                      <div className="relative">
                        <input
                          type={showApiKey ? "text" : "password"}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder={apiKeyStatus.hasKey ? "••••••••••••••••••••••••••••••••" : "Paste your Gemini API key (AIza...)"}
                          className="w-full pl-3 pr-10 py-2 rounded-xl border border-white/10 bg-black/40 text-xs text-white font-mono focus:outline-none focus:border-indigo-400/60 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1 cursor-pointer"
                          title={showApiKey ? "Hide API key" : "Show API key"}
                        >
                          {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[9px] font-mono text-indigo-300 hover:text-indigo-200 underline flex items-center gap-1"
                        >
                          Get a free key on Google AI Studio <ExternalLink size={10} />
                        </a>

                        <button
                          type="submit"
                          disabled={apiKeyStatus.saving || !apiKeyInput.trim()}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:brightness-110 text-white font-mono text-xs font-semibold transition shrink-0 cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shadow-md"
                        >
                          {apiKeyStatus.saving ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck size={12} />
                              <span>Update Key</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>

                    {apiKeyStatus.success && (
                      <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 flex items-center gap-2 text-[10px] font-mono">
                        <Check size={12} className="text-emerald-400 shrink-0" />
                        <span>✓ Gemini API Key successfully verified and saved!</span>
                      </div>
                    )}

                    {apiKeyStatus.error && (
                      <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 flex items-center gap-2 text-[10px] font-mono">
                        <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                        <span>✗ {apiKeyStatus.error}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ---------------- ABOUT ---------------- */}
              {activeTab === "about" && (
                <div className="space-y-4">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
                    About Myraa
                  </div>

                  <div className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Info size={14} className="text-cyan-400" />
                      <span className="text-sm font-display text-white">MYRAA AI Assistant</span>
                    </div>
                    <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
                      <div className="flex justify-between">
                        <span>VERSION</span>
                        <span className="text-slate-300">V2.0.0</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ENGINE</span>
                        <span className="text-slate-300">Gemini Live</span>
                      </div>
                      <div className="flex justify-between">
                        <span>DESKTOP</span>
                        <span className="text-slate-300">FastAPI Agent</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WAKE WORD</span>
                        <span className="text-slate-300">Web Speech API</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-500/15 bg-amber-500/5 flex items-start gap-2">
                    <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] font-mono text-amber-300/70 leading-relaxed">
                      Keep this tab active for wake-word detection. Microphone access
                      is required for voice activation.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer status bar — mirrors MemoryDashboard */}
            <div className="px-6 py-3 border-t border-white/5 bg-white/5 flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                Preferences auto-save
              </span>
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500">
                Myraa V2
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
