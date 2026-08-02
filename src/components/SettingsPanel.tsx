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
  Globe,
  Sun,
  Shield,
  Code,
  ChevronRight,
  Moon,
  Laptop
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

type SettingsTab = "general" | "assistant" | "voice" | "system" | "key" | "security" | "advanced" | "about";

/** Sleek Card Toggle Row matching modern high-contrast UI */
function SettingsToggleCard({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: any;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-white/5 bg-[#121324] flex items-center justify-between hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3.5">
        <div className="p-2.5 rounded-lg bg-white/5 border border-white/5 text-purple-400">
          <Icon size={18} />
        </div>
        <div>
          <div className="text-sm font-medium text-white">{title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{description}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer relative shrink-0 ${
          checked ? "bg-purple-600 shadow-[0_0_12px_rgba(147,51,234,0.4)]" : "bg-white/10"
        }`}
      >
        <div
          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel({ isOpen, onClose, settings, onChange, themeColor }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [selectedTheme, setSelectedTheme] = useState<"dark" | "deep-dark" | "midnight" | "amoled">("dark");
  const [selectedAccent, setSelectedAccent] = useState<string>("violet");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("en-US");
  const [darkModeToggle, setDarkModeToggle] = useState<boolean>(true);
  const [minimizeToTray, setMinimizeToTray] = useState<boolean>(true);

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

  // Enumerate microphones
  useEffect(() => {
    if (!isOpen) return;
    const enumerate = async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        setMics(devices.filter((d) => d.kind === "audioinput"));
      } catch {
        /* permission needed */
      }
    };
    enumerate();
  }, [isOpen]);

  // Desktop Agent Probe
  useEffect(() => {
    if (!isOpen) return;
    const probe = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8765/health", { cache: "no-store" });
        if (!res.ok) {
          setAgentHealth({ online: false });
          return;
        }
        const data = await res.json();
        setAgentHealth({ online: true, toolCount: data.tool_count });
      } catch {
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

  // API Key Status
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

  const navItems: { id: SettingsTab; label: string; sub: string; icon: any }[] = [
    { id: "general", label: "General", sub: "Startup, appearance & language", icon: Settings },
    { id: "assistant", label: "Assistant", sub: "AI personality & behavior", icon: User },
    { id: "voice", label: "Voice", sub: "Voice settings & audio", icon: Mic },
    { id: "system", label: "System", sub: "System level preferences", icon: Cpu },
    { id: "key", label: "API Keys", sub: "Manage your API connections", icon: KeyRound },
    { id: "security", label: "Security", sub: "Privacy, data & encryption", icon: Shield },
    { id: "advanced", label: "Advanced", sub: "Developer & advanced tools", icon: Code },
    { id: "about", label: "About MYRAA", sub: "Version, updates & info", icon: Info },
  ];

  const topTabs: { id: SettingsTab; label: string; icon: any }[] = [
    { id: "general", label: "GENERAL", icon: Settings },
    { id: "assistant", label: "ASSISTANT", icon: User },
    { id: "voice", label: "VOICE", icon: Mic },
    { id: "system", label: "SYSTEM", icon: Cpu },
    { id: "key", label: "API KEYS", icon: KeyRound },
  ];

  const themeOptions = [
    { id: "dark", label: "Dark", dots: ["#38bdf8", "#3b82f6", "#8b5cf6"] },
    { id: "deep-dark", label: "Deep Dark", dots: ["#3b82f6", "#0284c7", "#1e3a8a"] },
    { id: "midnight", label: "Midnight", dots: ["#a855f7", "#06b6d4", "#0e7490"] },
    { id: "amoled", label: "AMOLED", dots: ["#22c55e", "#eab308", "#f97316"] },
  ];

  const accentColors = [
    { id: "violet", bg: "bg-purple-600", ring: "ring-purple-500" },
    { id: "blue", bg: "bg-blue-500", ring: "ring-blue-400" },
    { id: "cyan", bg: "bg-cyan-400", ring: "ring-cyan-300" },
    { id: "lime", bg: "bg-lime-500", ring: "ring-lime-400" },
    { id: "orange", bg: "bg-orange-500", ring: "ring-orange-400" },
    { id: "pink", bg: "bg-pink-500", ring: "ring-pink-400" },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-md">
          {/* Backdrop click to dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="relative w-full max-w-5xl h-[780px] bg-[#0b0c16] border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden text-white z-10"
          >
            {/* Main Window Header */}
            <div className="h-16 border-b border-white/10 bg-[#0e0f1d] px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                    Myraa Configuration
                    <Sparkles size={14} className="text-purple-400" />
                  </h2>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    SYSTEM SETTINGS &amp; PREFERENCES
                  </p>
                </div>
              </div>

              {/* Close Window Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split View Body */}
            <div className="flex-1 flex min-h-0">
              {/* LEFT NAVIGATION SIDEBAR */}
              <div className="w-64 shrink-0 bg-[#080912] border-r border-white/5 flex flex-col justify-between p-4">
                {/* Vertical Navigation Items */}
                <div className="space-y-1 overflow-y-auto pr-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full p-3 rounded-xl flex items-start gap-3 transition-all text-left cursor-pointer ${
                          isActive
                            ? "bg-purple-900/30 border border-purple-500/40 text-white shadow-[0_0_15px_rgba(147,51,234,0.15)]"
                            : "hover:bg-white/5 border border-transparent text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            isActive ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400"
                          }`}
                        >
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold leading-tight">{item.label}</div>
                          <div className="text-[10px] text-slate-500 truncate mt-0.5 font-normal">
                            {item.sub}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar Bottom Widgets */}
                <div className="space-y-3 pt-3 border-t border-white/5">
                  {/* MYRAA Premium Card */}
                  <div className="p-3.5 rounded-xl border border-purple-500/20 bg-gradient-to-b from-purple-950/30 to-purple-900/10 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                      <Sparkles size={14} className="text-purple-400" />
                      <span>MYRAA Premium</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug">
                      Unlock advanced features and get the best experience.
                    </p>
                    <button
                      type="button"
                      className="w-full py-1.5 px-3 rounded-lg border border-purple-500/40 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-xs font-medium flex items-center justify-between transition cursor-pointer"
                    >
                      <span>Upgrade Now</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>

                  {/* Dark Mode Toggle at bottom */}
                  <div className="px-2 pt-1 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                      <Moon size={14} className="text-purple-400" />
                      <span>Dark Mode</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDarkModeToggle(!darkModeToggle)}
                      className="w-10 h-5 rounded-full p-0.5 bg-purple-600 transition-colors focus:outline-none cursor-pointer relative shrink-0"
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                          darkModeToggle ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT MAIN CONTENT AREA */}
              <div className="flex-1 bg-[#0c0d19] flex flex-col min-w-0 overflow-hidden">
                {/* Horizontal Top Sub-Tabs */}
                <div className="h-14 border-b border-white/5 bg-[#0e0f1d]/50 px-6 flex items-center gap-2 overflow-x-auto shrink-0">
                  {topTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                          isActive
                            ? "bg-purple-600/20 border border-purple-500/40 text-purple-300"
                            : "bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <Icon size={14} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Scrollable Viewport */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* ---------------- GENERAL TAB ---------------- */}
                  {activeTab === "general" && (
                    <div className="space-y-6 max-w-3xl">
                      {/* Section 1: Startup & Appearance */}
                      <div className="space-y-3">
                        <div>
                          <h3 className="text-sm font-semibold text-white">Startup &amp; Appearance</h3>
                          <p className="text-xs text-slate-400">
                            Customize how MYRAA looks and behaves when you start.
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          <SettingsToggleCard
                            icon={Power}
                            title="Launch at Startup"
                            description="Start MYRAA automatically when Windows logs in"
                            checked={settings.autoStart}
                            onChange={(v) => {
                              onChange({ autoStart: v });
                              void fetch("/api/settings", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ autoStart: v }),
                              }).catch(() => {});
                            }}
                          />

                          <SettingsToggleCard
                            icon={Sparkles}
                            title="UI Animations"
                            description="Enable smooth animations and transitions across the app"
                            checked={settings.animations}
                            onChange={(v) => onChange({ animations: v })}
                          />
                        </div>
                      </div>

                      {/* Section 2: Appearance */}
                      <div className="space-y-4 pt-2">
                        <div>
                          <h3 className="text-sm font-semibold text-white">Appearance</h3>
                          <p className="text-xs text-slate-400">
                            Customize the look and feel of MYRAA
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Theme Cards Grid */}
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-medium text-slate-300">Theme</label>
                            <div className="grid grid-cols-4 gap-2.5">
                              {themeOptions.map((t) => {
                                const isSelected = selectedTheme === t.id;
                                return (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedTheme(t.id as any)}
                                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition cursor-pointer relative ${
                                      isSelected
                                        ? "border-purple-500 bg-purple-950/30 ring-1 ring-purple-500"
                                        : "border-white/10 bg-[#121324] hover:border-white/20 text-slate-400"
                                    }`}
                                  >
                                    {isSelected && (
                                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-purple-500 text-white flex items-center justify-center">
                                        <Check size={10} />
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 my-1">
                                      {t.dots.map((dot, i) => (
                                        <div
                                          key={i}
                                          className="w-2.5 h-2.5 rounded-full"
                                          style={{ backgroundColor: dot }}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs font-medium text-white">{t.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Language Dropdown & Accent Colors */}
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-300">Language</label>
                              <div className="relative">
                                <select
                                  value={selectedLanguage}
                                  onChange={(e) => setSelectedLanguage(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-[#121324] text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                                >
                                  <option value="en-US">English (US)</option>
                                  <option value="en-GB">English (UK)</option>
                                  <option value="hi-IN">Hindi (हिंदी)</option>
                                  <option value="es-ES">Spanish (Español)</option>
                                </select>
                                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-slate-300">Accent Color</label>
                              <div className="flex items-center gap-2">
                                {accentColors.map((c) => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setSelectedAccent(c.id)}
                                    className={`w-6 h-6 rounded-full ${c.bg} transition transform ${
                                      selectedAccent === c.id
                                        ? `scale-110 ring-2 ${c.ring} ring-offset-2 ring-offset-[#0c0d19]`
                                        : "opacity-80 hover:opacity-100"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Other Preferences */}
                      <div className="space-y-3 pt-2">
                        <div>
                          <h3 className="text-sm font-semibold text-white">Other Preferences</h3>
                          <p className="text-xs text-slate-400">
                            Additional general preferences
                          </p>
                        </div>

                        <SettingsToggleCard
                          icon={Sun}
                          title="Minimize to System Tray"
                          description="Close button minimizes MYRAA to system tray"
                          checked={minimizeToTray}
                          onChange={(v) => setMinimizeToTray(v)}
                        />
                      </div>
                    </div>
                  )}

                  {/* ---------------- ASSISTANT TAB ---------------- */}
                  {activeTab === "assistant" && (
                    <div className="space-y-6 max-w-3xl">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Active Persona Selection</h3>
                        <p className="text-xs text-slate-400">Choose your active AI companion</p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => onChange({ activeAssistant: "MYRAA" })}
                          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                            settings.activeAssistant === "MYRAA"
                              ? "border-purple-500 bg-purple-950/40 text-purple-200 ring-1 ring-purple-500"
                              : "border-white/10 bg-[#121324] text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          <div className="font-semibold text-sm text-white flex items-center gap-2">
                            <Sparkles size={16} className="text-purple-400" />
                            MYRAA
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Anime Companion</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onChange({ activeAssistant: "Ria" })}
                          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                            settings.activeAssistant === "Ria"
                              ? "border-cyan-500 bg-cyan-950/40 text-cyan-200 ring-1 ring-cyan-500"
                              : "border-white/10 bg-[#121324] text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          <div className="font-semibold text-sm text-white flex items-center gap-2">
                            <User size={16} className="text-cyan-400" />
                            Ria
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Empathetic Co-Assistant</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => onChange({ activeAssistant: "Mike" })}
                          className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                            settings.activeAssistant === "Mike"
                              ? "border-amber-500 bg-amber-950/40 text-amber-200 ring-1 ring-amber-500"
                              : "border-white/10 bg-[#121324] text-slate-400 hover:bg-white/5"
                          }`}
                        >
                          <div className="font-semibold text-sm text-white flex items-center gap-2">
                            <Tv size={16} className="text-amber-400" />
                            Mike
                          </div>
                          <div className="text-xs text-slate-400 mt-1">Cartoon Mouse</div>
                        </button>
                      </div>

                      {/* Camera framing */}
                      <div className="p-4 rounded-xl border border-white/10 bg-[#121324] space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Maximize2 size={16} className="text-purple-400" />
                            <div>
                              <div className="text-xs font-semibold text-white">Framing Mode</div>
                              <div className="text-[11px] text-slate-400">Wide Shot vs Close Crop</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
                            <button
                              type="button"
                              onClick={() => onChange({ characterFit: "contain" })}
                              className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                                (settings.characterFit ?? "contain") === "contain"
                                  ? "bg-purple-600 text-white"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Wide Shot
                            </button>
                            <button
                              type="button"
                              onClick={() => onChange({ characterFit: "cover" })}
                              className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                                (settings.characterFit ?? "contain") === "cover"
                                  ? "bg-purple-600 text-white"
                                  : "text-slate-400 hover:text-white"
                              }`}
                            >
                              Close Crop
                            </button>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <ZoomIn size={16} className="text-purple-400" />
                            <div>
                              <div className="text-xs font-semibold text-white">Avatar Scale Zoom</div>
                              <div className="text-[11px] text-slate-400">
                                Current scale: {settings.characterZoom ?? 100}%
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onChange({ characterZoom: Math.max(40, (settings.characterZoom ?? 100) - 10) })}
                              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                            >
                              <ZoomOut size={14} />
                            </button>
                            <input
                              type="range"
                              min="40"
                              max="160"
                              step="5"
                              value={settings.characterZoom ?? 100}
                              onChange={(e) => onChange({ characterZoom: parseInt(e.target.value) })}
                              className="w-24 accent-purple-500 cursor-pointer"
                            />
                            <button
                              type="button"
                              onClick={() => onChange({ characterZoom: Math.min(160, (settings.characterZoom ?? 100) + 10) })}
                              className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                            >
                              <ZoomIn size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Prompts */}
                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-white">MYRAA System Prompt Constitution</label>
                        <textarea
                          rows={4}
                          value={settings.myraaSystemPrompt || ""}
                          onChange={(e) => onChange({ myraaSystemPrompt: e.target.value })}
                          placeholder="Define MYRAA's supreme constitutional instructions..."
                          className="w-full p-3 rounded-xl border border-white/10 bg-[#121324] text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {/* ---------------- VOICE TAB ---------------- */}
                  {activeTab === "voice" && (
                    <div className="space-y-6 max-w-3xl">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Wake Word &amp; Audio Input</h3>
                        <p className="text-xs text-slate-400">Configure voice listening preferences</p>
                      </div>

                      <SettingsToggleCard
                        icon={Mic}
                        title="Wake Word Detection"
                        description="Always listen for your wake phrase to activate MYRAA"
                        checked={settings.wakeWordEnabled}
                        onChange={(v) => onChange({ wakeWordEnabled: v })}
                      />

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-white">Wake Phrase</label>
                        <input
                          type="text"
                          value={settings.wakePhrase}
                          onChange={(e) => onChange({ wakePhrase: e.target.value })}
                          placeholder="hey myraa"
                          className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-[#121324] text-sm text-white focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-white">Microphone Input</label>
                        <select
                          value={settings.micDeviceId}
                          onChange={(e) => onChange({ micDeviceId: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-[#121324] text-sm text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                        >
                          <option value="">System Default</option>
                          {mics.map((m, i) => (
                            <option key={m.deviceId || i} value={m.deviceId}>
                              {m.label || `Microphone ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* ---------------- SYSTEM TAB ---------------- */}
                  {activeTab === "system" && (
                    <div className="space-y-6 max-w-3xl">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Desktop Control Agent</h3>
                        <p className="text-xs text-slate-400">System agent health and background process status</p>
                      </div>

                      <div
                        className={`p-5 rounded-xl border flex items-center justify-between ${
                          agentHealth.online
                            ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                            : "border-rose-500/30 bg-rose-950/20 text-rose-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              agentHealth.online ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                            }`}
                          />
                          <div>
                            <div className="text-sm font-semibold text-white">
                              {agentHealth.online ? "Desktop Agent Online" : "Desktop Agent Offline"}
                            </div>
                            <div className="text-xs opacity-80 mt-0.5">
                              {agentHealth.online
                                ? `${agentHealth.toolCount ?? 0} tools registered on port 8765`
                                : "Start the Python desktop agent process"}
                            </div>
                          </div>
                        </div>
                        <Cpu size={20} className="opacity-60" />
                      </div>
                    </div>
                  )}

                  {/* ---------------- API KEYS TAB ---------------- */}
                  {activeTab === "key" && (
                    <div className="space-y-6 max-w-3xl">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Google Gemini API Credentials</h3>
                        <p className="text-xs text-slate-400">Manage your connection to Google AI Studio</p>
                      </div>

                      <div className="p-5 rounded-xl border border-white/10 bg-[#121324] space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-medium text-white text-sm">
                            <KeyRound size={16} className="text-purple-400" />
                            <span>Gemini API Key</span>
                          </div>
                          {apiKeyStatus.hasKey ? (
                            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                              NOT CONFIGURED
                            </span>
                          )}
                        </div>

                        <form onSubmit={handleUpdateApiKey} className="space-y-3">
                          <div className="relative">
                            <input
                              type={showApiKey ? "text" : "password"}
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              placeholder={apiKeyStatus.hasKey ? "••••••••••••••••••••••••••••" : "Paste your Gemini API Key..."}
                              className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-white/10 bg-black/40 text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowApiKey(!showApiKey)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                            >
                              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={apiKeyStatus.saving || !apiKeyInput.trim()}
                            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                          >
                            {apiKeyStatus.saving ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                            <span>Update API Key</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ---------------- SECURITY TAB ---------------- */}
                  {activeTab === "security" && (
                    <div className="space-y-6 max-w-3xl">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Security &amp; Privacy</h3>
                        <p className="text-xs text-slate-400">Data encryption and local storage security</p>
                      </div>

                      <div className="p-4 rounded-xl border border-white/10 bg-[#121324] space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                          <Shield size={16} />
                          <span>Local Vault Encryption</span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Your conversations, memory graphs, and notes are stored locally on your machine.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ---------------- ADVANCED TAB ---------------- */}
                  {activeTab === "advanced" && (
                    <div className="space-y-6 max-w-3xl">
                      <div>
                        <h3 className="text-sm font-semibold text-white">Advanced &amp; Developer Tools</h3>
                        <p className="text-xs text-slate-400">Developer mode options and configuration resets</p>
                      </div>

                      <div className="p-4 rounded-xl border border-white/10 bg-[#121324] flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-white">Reset Default Settings</div>
                          <div className="text-xs text-slate-400">Restore all preferences to system defaults</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onChange(DEFAULT_SETTINGS)}
                          className="px-3.5 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-medium cursor-pointer"
                        >
                          Reset Defaults
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---------------- ABOUT TAB ---------------- */}
                  {activeTab === "about" && (
                    <div className="space-y-6 max-w-3xl">
                      <div>
                        <h3 className="text-sm font-semibold text-white">About MYRAA</h3>
                        <p className="text-xs text-slate-400">Version and system information</p>
                      </div>

                      <div className="p-5 rounded-xl border border-white/10 bg-[#121324] space-y-3">
                        <div className="flex justify-between text-xs py-1 border-b border-white/5">
                          <span className="text-slate-400">App Version</span>
                          <span className="font-semibold text-white">MYRAA v2.1.0</span>
                        </div>
                        <div className="flex justify-between text-xs py-1 border-b border-white/5">
                          <span className="text-slate-400">Engine</span>
                          <span className="font-semibold text-white">Gemini Live Realtime WebSocket</span>
                        </div>
                        <div className="flex justify-between text-xs py-1">
                          <span className="text-slate-400">Desktop Control</span>
                          <span className="font-semibold text-white">FastAPI Local Agent (port 8765)</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Status Bar */}
                <div className="h-10 border-t border-white/5 bg-[#0e0f1d] px-6 flex items-center justify-between shrink-0 text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check size={14} />
                    <span>Preferences auto-saved</span>
                  </div>
                  <div>MYRAA v2.1.0</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
