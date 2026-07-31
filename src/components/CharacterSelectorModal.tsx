import React, { useState } from "react";
import { MyraaSettings } from "../lib/settingsStore";
import { 
  X, 
  Sparkles, 
  Mic, 
  Brain, 
  ChevronLeft, 
  ChevronRight, 
  Edit3, 
  Check, 
  ShieldCheck, 
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CharacterSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: MyraaSettings;
  onUpdateSettings: (patch: Partial<MyraaSettings>) => void;
  onSelectCharacter: (assistant: "MYRAA" | "Ria" | "Mike") => void;
}

interface CharacterDef {
  id: "MYRAA" | "Ria" | "Mike";
  name: string;
  role: string;
  description: string;
  defaultVoice: string;
  memoryFile: string;
  accentColor: string;
  badgeBg: string;
  glowColor: string;
  videoPreview?: string;
  avatarType: string;
}

const CHARACTERS: CharacterDef[] = [
  {
    id: "Ria",
    name: "Ria",
    role: "Empathetic & Precise AI Co-Assistant",
    description: "Warm, witty, highly intuitive companion specializing in desktop control, creative execution, and deep problem solving.",
    defaultVoice: "Kore",
    memoryFile: "memories_ria.json",
    accentColor: "from-purple-500 to-pink-500",
    badgeBg: "bg-purple-500/20 border-purple-400/30 text-purple-300",
    glowColor: "rgba(168, 85, 247, 0.3)",
    avatarType: "Quantum Neural Core"
  },
  {
    id: "MYRAA",
    name: "MYRAA",
    role: "Cute Anime Heroine & Companion",
    description: "Soft-spoken, sweet, and cute anime heroine companion. Energetic, affectionate, and deeply loyal with live singing capabilities.",
    defaultVoice: "Aoede",
    memoryFile: "memories.json",
    accentColor: "from-cyan-500 to-blue-500",
    badgeBg: "bg-cyan-500/20 border-cyan-400/30 text-cyan-300",
    glowColor: "rgba(6, 182, 212, 0.3)",
    avatarType: "Holographic Anime Matrix"
  },
  {
    id: "Mike",
    name: "Mike",
    role: "Animated Cartoon Mouse Assistant",
    description: "Fun, clever, and animated cartoon mouse assistant. Speaks with energetic, witty charm and sharp desktop intelligence.",
    defaultVoice: "Fenrir",
    memoryFile: "memories_mike.json",
    accentColor: "from-amber-500 to-orange-500",
    badgeBg: "bg-amber-500/20 border-amber-400/30 text-amber-300",
    glowColor: "rgba(245, 158, 11, 0.3)",
    videoPreview: "/api/media/mike-avatar",
    avatarType: "Cartoon Mouse Avatar"
  }
];

export const CharacterSelectorModal: React.FC<CharacterSelectorModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSelectCharacter,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    const idx = CHARACTERS.findIndex(c => c.id === settings.activeAssistant);
    return idx >= 0 ? idx : 0;
  });

  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [tempPrompt, setTempPrompt] = useState<string>("");

  if (!isOpen) return null;

  const currentCharacter = CHARACTERS[currentIndex];
  const isSelected = settings.activeAssistant === currentCharacter.id;

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % CHARACTERS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + CHARACTERS.length) % CHARACTERS.length);
  };

  const handleSwitchCharacter = (charId: "MYRAA" | "Ria" | "Mike") => {
    onUpdateSettings({ activeAssistant: charId });
    onSelectCharacter(charId);
  };

  const getSystemPromptForChar = (id: string): string => {
    if (id === "Ria") return settings.riaSystemPrompt || "Default Ria Co-Assistant Prompt";
    if (id === "Mike") return settings.mikeSystemPrompt || "Default Mike Cartoon Mouse Prompt";
    return settings.myraaSystemPrompt || "Default MYRAA Anime Heroine Prompt";
  };

  const startEditPrompt = (charId: string) => {
    setEditingPromptId(charId);
    setTempPrompt(getSystemPromptForChar(charId));
  };

  const saveEditPrompt = (charId: string) => {
    if (charId === "Ria") {
      onUpdateSettings({ riaSystemPrompt: tempPrompt });
    } else if (charId === "Mike") {
      onUpdateSettings({ mikeSystemPrompt: tempPrompt });
    } else {
      onUpdateSettings({ myraaSystemPrompt: tempPrompt });
    }
    setEditingPromptId(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in select-none">
        <motion.div 
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-4xl bg-[#090b16]/95 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Ambient Glow Header */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-cyan-400 to-amber-500" />

          {/* Modal Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg">
                <Sparkles size={20} className="text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide font-sans flex items-center gap-2">
                  CHARACTER MATRIX & MEMORY CORES
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    3 Assist In-App
                  </span>
                </h2>
                <p className="text-xs text-slate-400 font-sans">
                  Select your active companion. Each character features isolated system prompts and separate memory stores.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
            >
              <X size={20} />
            </button>
          </div>

          {/* Slider Container */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6">

            {/* Quick Character Tabs Slider */}
            <div className="flex items-center justify-center space-x-3 bg-white/[0.03] p-1.5 rounded-2xl border border-white/5">
              {CHARACTERS.map((char, idx) => {
                const active = settings.activeAssistant === char.id;
                const isCurrentCard = idx === currentIndex;
                return (
                  <button
                    key={char.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold font-mono transition-all flex items-center justify-center gap-2 ${
                      isCurrentCard
                        ? "bg-white/10 text-white shadow-lg border border-white/15"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${active ? "bg-emerald-400 animate-ping" : "bg-slate-600"}`} />
                    {char.name}
                    {active && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Main Carousel Card View */}
            <div className="relative flex items-center justify-between">
              {/* Left Arrow Button */}
              <button
                onClick={handlePrev}
                className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl border border-white/10 transition-all z-10"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Character Main Details Display */}
              <div className="flex-1 mx-4 bg-gradient-to-b from-white/[0.05] to-transparent p-6 rounded-3xl border border-white/10 relative overflow-hidden shadow-xl">
                {/* Background Ambient Glow */}
                <div 
                  className="absolute -right-16 -top-16 w-64 h-64 rounded-full blur-[90px] pointer-events-none opacity-40 transition-all"
                  style={{ backgroundColor: currentCharacter.glowColor }}
                />

                <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
                  {/* Avatar / Video Preview Cell */}
                  <div className="w-36 h-36 rounded-2xl bg-black/60 border border-white/15 overflow-hidden flex items-center justify-center relative group shadow-2xl flex-shrink-0">
                    {currentCharacter.videoPreview ? (
                      <video 
                        src={currentCharacter.videoPreview} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-tr ${currentCharacter.accentColor} opacity-30 flex items-center justify-center`}>
                        <Sparkles size={48} className="text-white animate-pulse" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
                      <span className="text-[10px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded-lg border border-white/10 truncate w-full text-center">
                        {currentCharacter.avatarType}
                      </span>
                    </div>
                  </div>

                  {/* Character Meta Info */}
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <h3 className="text-2xl font-bold text-white font-sans tracking-wide">
                        {currentCharacter.name}
                      </h3>
                      <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${currentCharacter.badgeBg}`}>
                        {currentCharacter.role}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {currentCharacter.description}
                    </p>

                    {/* Isolated Memory & Voice Tags */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center space-x-2">
                        <Mic size={16} className="text-cyan-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono">VOICE MODEL</div>
                          <div className="text-xs font-semibold text-white font-mono">{currentCharacter.defaultVoice}</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 flex items-center space-x-2">
                        <Brain size={16} className="text-purple-400" />
                        <div>
                          <div className="text-[10px] text-slate-400 font-mono">ISOLATED MEMORY</div>
                          <div className="text-xs font-semibold text-emerald-300 font-mono">{currentCharacter.memoryFile}</div>
                        </div>
                      </div>
                    </div>

                    {/* Select Character CTA Button */}
                    <div className="pt-3">
                      {isSelected ? (
                        <div className="w-full py-3 px-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold flex items-center justify-center gap-2">
                          <Check size={16} />
                          CURRENTLY ACTIVE ASSISTANT & MEMORY CORE
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSwitchCharacter(currentCharacter.id)}
                          className={`w-full py-3 px-4 rounded-xl bg-gradient-to-r ${currentCharacter.accentColor} text-white font-mono text-xs font-bold hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2`}
                        >
                          <Zap size={16} />
                          SWITCH TO {currentCharacter.name.toUpperCase()} (ACTIVATES MEMORY BANK)
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom System Prompt Section */}
                <div className="mt-6 pt-5 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck size={16} className="text-amber-400" />
                      <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                        {currentCharacter.name} Custom System Prompt
                      </span>
                    </div>
                    {editingPromptId !== currentCharacter.id ? (
                      <button
                        onClick={() => startEditPrompt(currentCharacter.id)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono hover:underline"
                      >
                        <Edit3 size={12} />
                        Edit Prompt
                      </button>
                    ) : (
                      <button
                        onClick={() => saveEditPrompt(currentCharacter.id)}
                        className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-mono hover:bg-emerald-500/30 flex items-center gap-1"
                      >
                        <Check size={12} />
                        Save Changes
                      </button>
                    )}
                  </div>

                  {editingPromptId === currentCharacter.id ? (
                    <textarea
                      value={tempPrompt}
                      onChange={(e) => setTempPrompt(e.target.value)}
                      rows={3}
                      className="w-full bg-black/60 border border-cyan-500/40 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      placeholder={`Enter custom system prompt rules for ${currentCharacter.name}...`}
                    />
                  ) : (
                    <div className="p-3 bg-black/40 border border-white/5 rounded-xl text-xs font-mono text-slate-300 line-clamp-3 leading-relaxed">
                      {getSystemPromptForChar(currentCharacter.id)}
                    </div>
                  )}
                </div>

              </div>

              {/* Right Arrow Button */}
              <button
                onClick={handleNext}
                className="p-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-2xl border border-white/10 transition-all z-10"
              >
                <ChevronRight size={24} />
              </button>
            </div>

          </div>

          {/* Footer Notification */}
          <div className="p-4 border-t border-white/10 bg-white/[0.01] flex items-center justify-between text-xs font-mono text-slate-400 px-6">
            <span className="flex items-center gap-2 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Active Memory File: {CHARACTERS.find(c => c.id === settings.activeAssistant)?.memoryFile}
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs transition-all"
            >
              Close Selector
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
