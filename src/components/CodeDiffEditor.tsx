import React, { useState, useMemo } from "react";
import { 
  FileCode, 
  X, 
  Copy, 
  Check, 
  Columns, 
  AlignJustify, 
  Plus, 
  Minus, 
  CheckCircle2,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export interface CodeDiffEditorProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode?: string;
  modifiedCode?: string;
  filename?: string;
  themeColor: string;
  onApply?: (newCode: string) => void;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  oldLineNumber?: number;
  newLineNumber?: number;
  text: string;
}

const DEFAULT_ORIGINAL = `function calculateTelemetry(cpu: number, ram: number) {
  const isHigh = cpu > 80 || ram > 80;
  return {
    status: isHigh ? "WARNING" : "NORMAL",
    cpuUsage: cpu,
    ramUsage: ram
  };
}`;

const DEFAULT_MODIFIED = `function calculateTelemetry(cpu: number, ram: number, gpu?: number) {
  const isHigh = cpu > 85 || ram > 85 || (gpu && gpu > 90);
  const healthScore = Math.round(100 - (cpu * 0.4 + ram * 0.4 + (gpu || 0) * 0.2));
  return {
    status: isHigh ? "WARNING" : "OPTIMAL",
    healthScore,
    cpuUsage: cpu,
    ramUsage: ram,
    gpuUsage: gpu || 0
  };
}`;

export function CodeDiffEditor({
  isOpen,
  onClose,
  originalCode = DEFAULT_ORIGINAL,
  modifiedCode = DEFAULT_MODIFIED,
  filename = "src/components/TelemetryEngine.ts",
  themeColor,
  onApply,
}: CodeDiffEditorProps) {
  const [viewMode, setViewMode] = useState<"side-by-side" | "inline">("side-by-side");
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  // Calculate LCS line diff
  const { lines, additions, deletions } = useMemo(() => {
    const oldLines = originalCode.split(/\r?\n/);
    const newLines = modifiedCode.split(/\r?\n/);
    const m = oldLines.length;
    const n = newLines.length;

    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (oldLines[i - 1] === newLines[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    const result: DiffLine[] = [];
    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
        result.push({
          type: "unchanged",
          oldLineNumber: i,
          newLineNumber: j,
          text: oldLines[i - 1],
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        result.push({
          type: "added",
          newLineNumber: j,
          text: newLines[j - 1],
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        result.push({
          type: "removed",
          oldLineNumber: i,
          text: oldLines[i - 1],
        });
        i--;
      }
    }

    result.reverse();

    let addCount = 0;
    let delCount = 0;
    result.forEach((line) => {
      if (line.type === "added") addCount++;
      if (line.type === "removed") delCount++;
    });

    return { lines: result, additions: addCount, deletions: delCount };
  }, [originalCode, modifiedCode]);

  const handleCopy = () => {
    const formattedDiff = lines.map((l) => {
      const prefix = l.type === "added" ? "+ " : l.type === "removed" ? "- " : "  ";
      return `${prefix}${l.text}`;
    }).join("\n");

    navigator.clipboard.writeText(formattedDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApply) {
      onApply(modifiedCode);
    }
    setApplied(true);
    setTimeout(() => {
      setApplied(false);
      onClose();
    }, 1000);
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
        return "border-emerald-500/30 text-emerald-400 bg-emerald-500/10";
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

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-[8%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[840px] max-h-[85vh] bg-[#030712]/95 border border-white/15 backdrop-blur-2xl rounded-2xl z-50 flex flex-col shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Top Border Specular Highlight */}
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent pointer-events-none" />

            {/* Header Bar */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${getThemeBadgeGlow()}`}>
                  <FileCode size={20} />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-sm tracking-tight text-white flex items-center gap-2">
                    {filename}
                    <Sparkles size={13} className="text-emerald-400" />
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] font-mono mt-0.5">
                    <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                      <Plus size={10} /> {additions} additions
                    </span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-rose-400 font-semibold flex items-center gap-0.5">
                      <Minus size={10} /> {deletions} deletions
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Header */}
              <div className="flex items-center gap-2">
                {/* View Switcher Pills */}
                <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10">
                  <button
                    onClick={() => setViewMode("side-by-side")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                      viewMode === "side-by-side"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Side-by-Side View"
                  >
                    <Columns size={13} />
                    <span className="hidden sm:inline">Split</span>
                  </button>
                  <button
                    onClick={() => setViewMode("inline")}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                      viewMode === "inline"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                    title="Inline View"
                  >
                    <AlignJustify size={13} />
                    <span className="hidden sm:inline">Unified</span>
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Code Diff Display Container */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#010409] font-mono text-xs leading-relaxed">
              {viewMode === "inline" ? (
                /* Unified Inline View */
                <div className="space-y-0.5 border border-white/5 rounded-xl overflow-hidden bg-black/40">
                  {lines.map((line, idx) => {
                    const isAdd = line.type === "added";
                    const isDel = line.type === "removed";

                    return (
                      <div
                        key={idx}
                        className={`flex items-start px-3 py-1 font-mono transition-colors ${
                          isAdd 
                            ? "bg-emerald-500/15 text-emerald-200 border-l-2 border-emerald-400" 
                            : isDel 
                              ? "bg-rose-500/15 text-rose-200 border-l-2 border-rose-400" 
                              : "text-slate-300 hover:bg-white/[0.02]"
                        }`}
                      >
                        {/* Old line num */}
                        <span className="w-10 text-slate-600 select-none text-right pr-3 shrink-0">
                          {line.oldLineNumber || ""}
                        </span>
                        {/* New line num */}
                        <span className="w-10 text-slate-600 select-none text-right pr-3 shrink-0">
                          {line.newLineNumber || ""}
                        </span>
                        {/* Prefix indicator */}
                        <span className={`w-6 select-none font-bold shrink-0 ${
                          isAdd ? "text-emerald-400" : isDel ? "text-rose-400" : "text-slate-600"
                        }`}>
                          {isAdd ? "+" : isDel ? "-" : " "}
                        </span>
                        {/* Text */}
                        <pre className="flex-1 whitespace-pre-wrap break-all font-mono">
                          {line.text}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Side-by-Side Split View */
                <div className="grid grid-cols-2 gap-3">
                  {/* Left Column: Original Code */}
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                    <div className="px-3 py-1.5 bg-rose-950/20 border-b border-white/10 text-[10px] font-mono text-rose-300 uppercase font-bold flex items-center justify-between">
                      <span>Original Version</span>
                      <span>BEFORE</span>
                    </div>
                    <div className="p-2 space-y-0.5 overflow-x-auto">
                      {originalCode.split(/\r?\n/).map((lineText, idx) => {
                        const lineNum = idx + 1;
                        const isRemoved = lines.some((l) => l.type === "removed" && l.oldLineNumber === lineNum);

                        return (
                          <div
                            key={idx}
                            className={`flex items-start px-2 py-0.5 rounded font-mono ${
                              isRemoved ? "bg-rose-500/20 text-rose-300" : "text-slate-300"
                            }`}
                          >
                            <span className="w-8 text-slate-600 text-right pr-2 select-none shrink-0">{lineNum}</span>
                            <pre className="flex-1 whitespace-pre-wrap break-all">{lineText}</pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Modified Code */}
                  <div className="border border-white/10 rounded-xl overflow-hidden bg-black/40">
                    <div className="px-3 py-1.5 bg-emerald-950/20 border-b border-white/10 text-[10px] font-mono text-emerald-300 uppercase font-bold flex items-center justify-between">
                      <span>Proposed Patch</span>
                      <span>AFTER</span>
                    </div>
                    <div className="p-2 space-y-0.5 overflow-x-auto">
                      {modifiedCode.split(/\r?\n/).map((lineText, idx) => {
                        const lineNum = idx + 1;
                        const isAdded = lines.some((l) => l.type === "added" && l.newLineNumber === lineNum);

                        return (
                          <div
                            key={idx}
                            className={`flex items-start px-2 py-0.5 rounded font-mono ${
                              isAdded ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300"
                            }`}
                          >
                            <span className="w-8 text-slate-600 text-right pr-2 select-none shrink-0">{lineNum}</span>
                            <pre className="flex-1 whitespace-pre-wrap break-all">{lineText}</pre>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="p-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 hover:text-white transition cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? "Diff Copied!" : "Copy Raw Diff"}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-mono text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Discard
                </button>

                <button
                  onClick={handleApply}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition shadow-[0_0_20px_rgba(16,185,129,0.4)] cursor-pointer"
                >
                  <CheckCircle2 size={15} />
                  <span>{applied ? "Patch Applied!" : "Apply Changes"}</span>
                </button>
              </div>
            </div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
