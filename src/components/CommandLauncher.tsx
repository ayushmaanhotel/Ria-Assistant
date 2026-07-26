import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Search, 
  Sparkles, 
  Palette, 
  Activity, 
  FileCode, 
  Brain, 
  Monitor, 
  Settings as SettingsIcon, 
  Command, 
  ArrowUp, 
  ArrowDown, 
  CornerDownLeft, 
  X,
  FileText,
  Globe,
  Code,
  Calculator,
  Folder,
  Terminal,
  Lock,
  Play,
  Music
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface CommandLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionId: string) => void;
  themeColor: string;
}

export interface ActionItem {
  id: string;
  title: string;
  category: "Applications" | "Personas" | "Atmosphere" | "Tools";
  icon: any;
  description: string;
  badge?: string;
}

const ACTION_ITEMS: ActionItem[] = [
  // Windows Application Launchers
  {
    id: "launch:app:notepad",
    title: "Launch Notepad",
    category: "Applications",
    icon: FileText,
    description: "Open Windows Notepad text editor directly on your PC",
    badge: "Windows App"
  },
  {
    id: "launch:app:chrome",
    title: "Launch Google Chrome",
    category: "Applications",
    icon: Globe,
    description: "Open Google Chrome web browser",
    badge: "Windows App"
  },
  {
    id: "launch:app:vscode",
    title: "Launch Visual Studio Code",
    category: "Applications",
    icon: Code,
    description: "Open VS Code development environment",
    badge: "Windows App"
  },
  {
    id: "launch:app:calc",
    title: "Launch Calculator",
    category: "Applications",
    icon: Calculator,
    description: "Open Windows Calculator utility",
    badge: "Windows App"
  },
  {
    id: "launch:app:explorer",
    title: "Launch File Explorer",
    category: "Applications",
    icon: Folder,
    description: "Open Windows File Explorer to browse files",
    badge: "Windows App"
  },
  {
    id: "launch:app:cmd",
    title: "Launch Command Prompt",
    category: "Applications",
    icon: Terminal,
    description: "Open Windows Command Prompt (cmd.exe)",
    badge: "Windows App"
  },
  {
    id: "launch:app:powershell",
    title: "Launch PowerShell",
    category: "Applications",
    icon: Terminal,
    description: "Open Windows PowerShell terminal",
    badge: "Windows App"
  },
  {
    id: "launch:app:paint",
    title: "Launch Paint",
    category: "Applications",
    icon: Palette,
    description: "Open Windows Paint drawing application",
    badge: "Windows App"
  },
  {
    id: "launch:app:taskmgr",
    title: "Launch Task Manager",
    category: "Applications",
    icon: Activity,
    description: "Open Windows Task Manager system monitor",
    badge: "Windows App"
  },
  {
    id: "launch:app:settings",
    title: "Launch Windows System Settings",
    category: "Applications",
    icon: SettingsIcon,
    description: "Open Windows Control Settings panel",
    badge: "Windows App"
  },
  // Private Room & Vault
  {
    id: "open:privateroom",
    title: "Open Private Conversation Room & Vault",
    category: "Tools",
    icon: Lock,
    description: "Open 100% private chat and encrypted document vault",
    badge: "Private Room"
  },
  {
    id: "open:music",
    title: "Music & Audio Hub",
    category: "Tools",
    icon: Music,
    description: "Stream Lofi beats, study music, search YouTube, & control audio",
    badge: "Music Hub"
  },
  // Personas
  {
    id: "persona:myraa",
    title: "Switch to MYRAA Persona",
    category: "Personas",
    icon: Sparkles,
    description: "Standard primary AI assistant persona with charcoal blue aura",
    badge: "MYRAA Core"
  },
  {
    id: "persona:ria",
    title: "Switch to Ria Persona",
    category: "Personas",
    icon: Sparkles,
    description: "Custom companion persona with violet visual glow and customized prompt",
    badge: "Ria Custom"
  },
  // Atmosphere Themes
  {
    id: "theme:violet",
    title: "Set Theme: Violet Dream",
    category: "Atmosphere",
    icon: Palette,
    description: "Deep purple & violet ambient lighting shift",
    badge: "Atmosphere"
  },
  {
    id: "theme:crimson",
    title: "Set Theme: Crimson Surge",
    category: "Atmosphere",
    icon: Palette,
    description: "Fiery red & orange cyber glow atmosphere",
    badge: "Atmosphere"
  },
  {
    id: "theme:emerald",
    title: "Set Theme: Emerald Cyber",
    category: "Atmosphere",
    icon: Palette,
    description: "Matrix green & teal glowing visual background",
    badge: "Atmosphere"
  },
  {
    id: "theme:celestial",
    title: "Set Theme: Celestial Sky",
    category: "Atmosphere",
    icon: Palette,
    description: "Sky blue & indigo cosmic radiance",
    badge: "Atmosphere"
  },
  {
    id: "theme:gold",
    title: "Set Theme: Solar Gold",
    category: "Atmosphere",
    icon: Palette,
    description: "Warm amber & golden glow aesthetic",
    badge: "Atmosphere"
  },
  {
    id: "theme:rose",
    title: "Set Theme: Rose Quartz",
    category: "Atmosphere",
    icon: Palette,
    description: "Pink & magenta neon luminescence",
    badge: "Atmosphere"
  },
  {
    id: "theme:charcoal",
    title: "Set Theme: Charcoal Slate",
    category: "Atmosphere",
    icon: Palette,
    description: "Minimalist dark slate & indigo default theme",
    badge: "Atmosphere"
  },
  // Tools & Panels
  {
    id: "open:telemetry",
    title: "Open Live System Telemetry",
    category: "Tools",
    icon: Activity,
    description: "Inspect CPU, RAM, GPU/VRAM metrics and Python agent status",
    badge: "Modal"
  },
  {
    id: "open:codediff",
    title: "Open Code Diff Reviewer",
    category: "Tools",
    icon: FileCode,
    description: "Review side-by-side / inline code changes with line highlighting",
    badge: "Modal"
  },
  {
    id: "open:memories",
    title: "Open Memory Core Dashboard",
    category: "Tools",
    icon: Brain,
    description: "Browse, filter, search and seed long-term recollections",
    badge: "Modal"
  },
  {
    id: "toggle:vision",
    title: "Toggle Screen Vision Reading",
    category: "Tools",
    icon: Monitor,
    description: "Enable or disable screen frame capture for visual AI assistance",
    badge: "Toggle"
  },
  {
    id: "open:audio_settings",
    title: "Open Settings & Audio Config",
    category: "Tools",
    icon: SettingsIcon,
    description: "Configure Gemini API keys, wake words, and sound settings",
    badge: "Settings"
  },
];

export function CommandLauncher({
  isOpen,
  onClose,
  onSelectAction,
  themeColor,
}: CommandLauncherProps) {
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter actions based on search term + dynamic app launch fallback
  const filteredActions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return ACTION_ITEMS;
    const matches = ACTION_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
    );

    // If query exists and doesn't match an exact title, add dynamic app launch item
    const exactMatch = matches.some(m => m.title.toLowerCase() === query);
    if (!exactMatch) {
      matches.unshift({
        id: `launch:custom:${search.trim()}`,
        title: `Launch "${search.trim()}" on Windows PC`,
        category: "Applications",
        icon: Play,
        description: `Execute openApplication for "${search.trim()}" directly via Python Desktop Agent`,
        badge: "Windows App"
      });
    }

    return matches;
  }, [search]);

  // Reset index when search query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard events (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredActions.length === 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredActions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % filteredActions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = filteredActions[selectedIndex];
      if (chosen) {
        onSelectAction(chosen.id);
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

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
        return "border-cyan-500/30 text-cyan-400 bg-cyan-500/10";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />

          {/* Modal Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed inset-x-4 top-[15%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-[#030712]/95 border border-white/15 backdrop-blur-2xl rounded-2xl z-50 flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Top Border Highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />

            {/* Input Search Header Bar */}
            <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-black/40">
              <Search size={18} className="text-cyan-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search action... (e.g. Ria, Telemetry, Violet)"
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none font-sans"
              />
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline px-2 py-0.5 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-slate-400">
                  Ctrl+K
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Action Items List */}
            <div
              ref={listRef}
              className="max-h-[380px] overflow-y-auto p-3 space-y-1 bg-[#010409]"
            >
              {filteredActions.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  No matching quick actions found for &ldquo;{search}&rdquo;.
                </div>
              ) : (
                filteredActions.map((action, idx) => {
                  const Icon = action.icon;
                  const isSelected = idx === selectedIndex;

                  return (
                    <div
                      key={action.id}
                      onClick={() => {
                        onSelectAction(action.id);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? "bg-cyan-500/15 border border-cyan-500/30 text-white shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                          : "border border-transparent text-slate-300 hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-lg border shrink-0 ${
                          isSelected ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/40" : "bg-white/5 text-slate-400 border-white/5"
                        }`}>
                          <Icon size={16} />
                        </div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-medium text-xs text-white truncate">
                              {action.title}
                            </span>
                            {action.badge && (
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-slate-400 border border-white/10 shrink-0">
                                {action.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {action.description}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 shrink-0 pl-2">
                          <span>SELECT</span>
                          <CornerDownLeft size={12} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Shortcut Bar */}
            <div className="p-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <ArrowUp size={10} /><ArrowDown size={10} />
                  <span>Navigate</span>
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft size={10} />
                  <span>Execute</span>
                </span>
                <span className="flex items-center gap-1">
                  <span>Esc</span>
                  <span>Close</span>
                </span>
              </div>
              <span className="text-cyan-400/80 font-bold">MYRAA LAUNCHER</span>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
