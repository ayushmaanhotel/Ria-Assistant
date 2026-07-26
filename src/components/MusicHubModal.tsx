import React, { useState } from "react";
import {
  Music,
  X,
  Search,
  Play,
  Volume2,
  VolumeX,
  Volume1,
  Sparkles,
  Radio,
  Headphones,
  Zap,
  Coffee
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MusicHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  themeColor: string;
}

interface MusicPreset {
  id: string;
  title: string;
  artist: string;
  query: string;
  icon: any;
  gradient: string;
  badge: string;
}

const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: "preset-lofi",
    title: "Lofi Beats & Chill Coding",
    artist: "Lofi Girl Radio",
    query: "lofi hip hop radio beats to relax study to",
    icon: Coffee,
    gradient: "from-purple-900/50 to-indigo-900/50 border-purple-500/30",
    badge: "Focus Chill"
  },
  {
    id: "preset-focus",
    title: "Deep Focus & Study Flow",
    artist: "Instrumental Brainwave",
    query: "deep focus study music alpha waves",
    icon: Headphones,
    gradient: "from-cyan-900/50 to-blue-900/50 border-cyan-500/30",
    badge: "Productivity"
  },
  {
    id: "preset-synth",
    title: "Cyberpunk Synthwave Ambient",
    artist: "Retrowave Night",
    query: "synthwave chill chillwave background music",
    icon: Zap,
    gradient: "from-rose-900/50 to-pink-900/50 border-rose-500/30",
    badge: "Ambient"
  },
  {
    id: "preset-piano",
    title: "Peaceful Piano & Acoustic",
    artist: "Relaxing Classical",
    query: "peaceful piano relaxing acoustic music",
    icon: Radio,
    gradient: "from-amber-900/50 to-yellow-900/50 border-amber-500/30",
    badge: "Calm"
  }
];

export function MusicHubModal({ isOpen, onClose, themeColor }: MusicHubModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isPlayingCustom, setIsPlayingCustom] = useState(false);

  if (!isOpen) return null;

  const handlePlayQuery = async (queryToPlay: string) => {
    if (!queryToPlay.trim()) return;
    setIsPlayingCustom(true);
    try {
      await fetch("/api/call-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "searchYouTube",
          args: { query: queryToPlay.trim() }
        })
      });
    } catch (e) {
      console.error("Music launch failed:", e);
    } finally {
      setIsPlayingCustom(false);
    }
  };

  const handleAdjustVolume = async (action: "up" | "down" | "mute") => {
    let toolName = "volumeUp";
    if (action === "down") toolName = "volumeDown";
    if (action === "mute") toolName = "muteToggle";

    try {
      await fetch("/api/call-tool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: toolName, args: {} })
      });
    } catch (e) {}
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl bg-slate-950/90 border border-cyan-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl relative"
        >
          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-cyan-500/20 bg-cyan-950/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                <Music size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide font-sans flex items-center gap-2">
                  Music &amp; Audio Hub
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[9px] font-mono text-cyan-300">
                    LIVE PLAYER
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Play music, stream background beats, and adjust system audio
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[500px]">
            {/* Search Box */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <Search size={13} className="text-cyan-400" /> Search Any Song, Artist, or Album:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePlayQuery(searchQuery);
                  }}
                  placeholder="e.g. Believer Imagine Dragons, Lofi Beats, Taylor Swift..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-cyan-500/60"
                />
                <button
                  onClick={() => handlePlayQuery(searchQuery)}
                  disabled={isPlayingCustom || !searchQuery.trim()}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-mono font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
                >
                  <Play size={13} /> Play
                </button>
              </div>
            </div>

            {/* Presets Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-300 tracking-wider uppercase flex items-center gap-1.5">
                <Sparkles size={13} className="text-purple-400" /> One-Touch Music Stations
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MUSIC_PRESETS.map((preset) => {
                  const Icon = preset.icon;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handlePlayQuery(preset.query)}
                      className={`p-4 rounded-2xl bg-gradient-to-br ${preset.gradient} border hover:border-cyan-400/50 transition cursor-pointer flex items-center justify-between group shadow-lg`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white/10 text-white">
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white font-sans group-hover:text-cyan-300 transition">
                              {preset.title}
                            </h4>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">{preset.artist}</p>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 group-hover:bg-cyan-500 flex items-center justify-center text-cyan-300 group-hover:text-black transition">
                        <Play size={14} className="ml-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Audio Controls */}
            <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={16} className="text-cyan-400" />
                <span className="text-xs font-mono text-slate-300">PC Master Audio Controls</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdjustVolume("down")}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition flex items-center gap-1"
                >
                  <Volume1 size={13} /> Vol -
                </button>
                <button
                  onClick={() => handleAdjustVolume("up")}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition flex items-center gap-1"
                >
                  <Volume2 size={13} /> Vol +
                </button>
                <button
                  onClick={() => handleAdjustVolume("mute")}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition flex items-center gap-1"
                >
                  <VolumeX size={13} /> Mute
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
