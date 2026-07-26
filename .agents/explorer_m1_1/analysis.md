# R1 Architectural Analysis & Design Specification: Modernized Cyber-Glass UI & Assistant Selector

**Target Module**: `src/App.tsx`  
**Related Modules**: `src/lib/settingsStore.ts`, `src/lib/audio.ts`, `server.ts`  
**Milestone**: Milestone 1 — R1: Modernized Cyber-Glass UI & Assistant Selector  
**Author**: Explorer 1  

---

## 1. Executive Summary

This specification outlines the comprehensive layout, visual, state management, and session parameter changes required in `src/App.tsx` for Milestone 1 (R1). The objective is to upgrade the existing minimalist header and pill selector into a sleek **Cyber-Glass Navigation Bar** with dual-assistant selection (MYRAA vs Ria), dynamic glowing status indicators (`idle`, `listening`, `speaking`, `processing`), seamless theme background shifts, persistent settings updates, and audio session parameter synchronization.

---

## 2. Component Layout & Visual Refactoring (`src/App.tsx` Header)

### 2.1 Existing Layout vs Cyber-Glass Design

Currently, `App.tsx` lines 535–625 render a simple header with a dual assistant selector pill. 

**Deficiencies in Existing Implementation**:
1. Lacks proper Cyber-Glass aesthetic depth (no subtle specular border highlight, glass noise/blur contrast, or floating bar capsule structure).
2. The active status indicator is a static `w-2 h-2` dot without state-specific text badges or distinct glow modes for `idle`, `listening`, `speaking`, and `processing`.
3. Switching assistants in the UI updates `activeAssistant` in `settingsStore` and changes `themeColor`, but does not provide visual persona badges or handle active audio session reconnects/parameter switches.

### 2.2 Cyber-Glass Navigation Bar Architecture

The top navigation header will be refactored into a floating Cyber-Glass Bar container:

```tsx
{/* CYBER-GLASS NAVIGATION BAR CONTAINER */}
<header className="relative z-30 w-full max-w-6xl mx-auto select-none pt-2">
  <div className="relative flex items-center justify-between px-6 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 bg-slate-950/65 backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] transition-all duration-300 group">
    
    {/* Specular Top Border Highlight */}
    <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-t-2xl pointer-events-none" />

    {/* Brand & Assistant Identity Badge (Left) */}
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 uppercase">
          MYRAA OS
        </span>
        <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-400 border border-white/10">
          v2.0
        </span>
      </div>

      <div className="h-4 w-[1px] bg-white/10" />

      {/* Dynamic Glowing Live Status Indicator */}
      {renderGlowingStatusIndicator()}
    </div>

    {/* Dual Assistant Selector Glass Pill (Center) */}
    <div className="flex items-center p-1 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md shadow-inner">
      <button
        onClick={() => handleAssistantSwitch("MYRAA")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all duration-300 cursor-pointer ${
          (settings.activeAssistant || "MYRAA") === "MYRAA"
            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_18px_rgba(6,182,212,0.4)]"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <Sparkles size={13} className={(settings.activeAssistant || "MYRAA") === "MYRAA" ? "text-cyan-400 animate-pulse" : "text-slate-400"} />
        <span>MYRAA</span>
        {(settings.activeAssistant || "MYRAA") === "MYRAA" && (
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
        )}
      </button>

      <button
        onClick={() => handleAssistantSwitch("Ria")}
        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all duration-300 cursor-pointer ${
          settings.activeAssistant === "Ria"
            ? "bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-[0_0_18px_rgba(168,85,247,0.4)]"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${settings.activeAssistant === "Ria" ? "bg-purple-400 shadow-[0_0_10px_#c084fc] animate-pulse" : "bg-slate-500"}`} />
        <span>RIA</span>
        {settings.activeAssistant === "Ria" && (
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc] animate-pulse" />
        )}
      </button>
    </div>

    {/* Header Action Utilities (Right) */}
    <div className="flex items-center gap-4">
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="flex items-center gap-1.5 text-xs font-mono tracking-widest text-slate-400 hover:text-white transition cursor-pointer"
        title="Sway Themes and Info"
      >
        <Compass size={14} />
        <span className="hidden sm:inline">TOPICS</span>
      </button>

      <button 
        onClick={() => setShowMemoryDashboard(!showMemoryDashboard)}
        className="flex items-center gap-1.5 text-xs font-mono tracking-widest text-slate-400 hover:text-white transition cursor-pointer"
        title="Recollections Database"
      >
        <Brain size={14} />
        <span className="hidden sm:inline">RECALLS</span>
      </button>

      <button 
        onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
        className={`flex items-center gap-1.5 transition text-xs font-mono tracking-widest cursor-pointer ${
          isScreenSharing 
            ? "text-cyan-400 font-semibold" 
            : "text-slate-400 hover:text-white"
        }`}
        title="Share Screen with Assistant"
      >
        <Monitor size={14} className={isScreenSharing && !isScreenSharingPaused ? "animate-pulse text-cyan-400" : ""} />
        <span className="hidden sm:inline">{isScreenSharing ? "SHARING" : "SCREEN"}</span>
      </button>

      <button
        onClick={() => setShowSettings(!showSettings)}
        className={`flex items-center gap-1.5 transition text-xs font-mono tracking-widest cursor-pointer ${
          showSettings
            ? "text-cyan-400 font-semibold"
            : "text-slate-400 hover:text-white"
        }`}
        title="Settings"
      >
        <SettingsIcon size={14} className={showSettings ? "animate-spin [animation-duration:6s]" : ""} />
        <span className="hidden sm:inline">SETTINGS</span>
      </button>
    </div>
  </div>
</header>
```

---

## 3. Glowing Live Status Indicator Matrix

The status indicator component displays dynamic visual glow colors and live text labels depending on the active assistant (MYRAA cyan glow vs Ria purple glow) and the current state (`idle`, `listening`, `speaking`, `processing`).

### 3.1 State Mapping Logic

Let `effectiveState` resolve as follows:
- `connecting`: `"processing"` (or `"connecting"`)
- `characterState === "thinking"`: `"processing"`
- `state === "listening"`: `"listening"`
- `state === "speaking"`: `"speaking"`
- Default / `state === "disconnected"`: `"idle"`

### 3.2 Glow & Style Specification Table

| State | Assistant | Text Label | Badge Border & Background | Glow Effect & Animation | Icon / Pulse Indicator |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`idle`** | MYRAA | `MYRAA IDLE` | `border-cyan-500/20 bg-cyan-500/10 text-cyan-400/80` | `shadow-[0_0_10px_rgba(6,182,212,0.15)]` | Static soft dot |
| **`idle`** | Ria | `RIA IDLE` | `border-purple-500/20 bg-purple-500/10 text-purple-400/80` | `shadow-[0_0_10px_rgba(168,85,247,0.15)]` | Static soft dot |
| **`listening`** | MYRAA | `LISTENING` | `border-cyan-400/80 bg-cyan-500/20 text-cyan-200` | `shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse` | Glowing cyan ring pulse |
| **`listening`** | Ria | `LISTENING` | `border-purple-400/80 bg-purple-500/20 text-purple-200` | `shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse` | Glowing purple ring pulse |
| **`speaking`** | MYRAA | `SPEAKING` | `border-cyan-300 bg-cyan-400/25 text-cyan-100` | `shadow-[0_0_25px_rgba(6,182,212,0.7)] ring-1 ring-cyan-400/40` | Waveform active animation |
| **`speaking`** | Ria | `SPEAKING` | `border-purple-300 bg-purple-400/25 text-purple-100` | `shadow-[0_0_25px_rgba(168,85,247,0.7)] ring-1 ring-purple-400/40` | Waveform active animation |
| **`processing`**| MYRAA/Ria | `PROCESSING` | `border-amber-400/80 bg-amber-500/20 text-amber-200` | `shadow-[0_0_20px_rgba(245,158,11,0.5)]` | `RefreshCw` spinning icon |

### 3.3 Implementation Helper Function in `App.tsx`

```tsx
const renderGlowingStatusIndicator = () => {
  const activeAssistant = settings.activeAssistant || "MYRAA";
  const isRia = activeAssistant === "Ria";

  let statusKey: "idle" | "listening" | "speaking" | "processing" = "idle";
  if (state === "connecting" || characterState === "thinking") {
    statusKey = "processing";
  } else if (state === "speaking") {
    statusKey = "speaking";
  } else if (state === "listening") {
    statusKey = "listening";
  }

  const configs = {
    idle: {
      label: `${activeAssistant} IDLE`,
      badgeClass: isRia
        ? "border-purple-500/30 bg-purple-500/10 text-purple-300/80 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
        : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300/80 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
      dotClass: isRia ? "bg-purple-400/60" : "bg-cyan-400/60",
    },
    listening: {
      label: "LISTENING",
      badgeClass: isRia
        ? "border-purple-400 bg-purple-500/25 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse"
        : "border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse",
      dotClass: isRia ? "bg-purple-400 animate-ping" : "bg-cyan-400 animate-ping",
    },
    speaking: {
      label: "SPEAKING",
      badgeClass: isRia
        ? "border-purple-300 bg-purple-500/30 text-white shadow-[0_0_25px_rgba(168,85,247,0.6)] ring-1 ring-purple-400/50"
        : "border-cyan-300 bg-cyan-500/30 text-white shadow-[0_0_25px_rgba(6,182,212,0.6)] ring-1 ring-cyan-400/50",
      dotClass: isRia ? "bg-purple-300 animate-pulse" : "bg-cyan-300 animate-pulse",
    },
    processing: {
      label: "PROCESSING",
      badgeClass: "border-amber-400/80 bg-amber-500/20 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)]",
      dotClass: "bg-amber-400",
    },
  };

  const current = configs[statusKey];

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono font-bold tracking-widest transition-all duration-300 ${current.badgeClass}`}>
      {statusKey === "processing" ? (
        <RefreshCw size={11} className="animate-spin text-amber-300" />
      ) : (
        <span className={`w-2 h-2 rounded-full ${current.dotClass}`} />
      )}
      <span>{current.label}</span>
    </div>
  );
};
```

---

## 4. Seamless Assistant Switching Logic

When switching between MYRAA and Ria, the system must synchronize five key subsystems:

1. **`settingsStore` Persistence**:
   - Save `activeAssistant` ("MYRAA" | "Ria") locally to `localStorage` key `myraa.settings.v2` and post to `/api/settings`.
2. **Atmospheric Theme Shift (`themeColor`)**:
   - MYRAA active: set `themeColor` to `"charcoal"` or `"celestial"`. Background radial gradient shifts to deep cyan/slate (`from-slate-900/50 via-slate-950/30 to-slate-950`).
   - Ria active: set `themeColor` to `"violet"`. Background radial gradient shifts to lush violet/magenta (`from-purple-950/40 via-violet-950/20 to-slate-950`).
3. **Badge & Typography Updates**:
   - The subtitle prompt when disconnected updates from `"Connect memory core to awaken my voice."` to assistant-specific prompts:
     - MYRAA: `"Connect memory core to awaken MYRAA voice."`
     - Ria: `"Connect memory core to awaken RIA voice."`
4. **Audio Session Synchronization**:
   - If the audio session is currently connected (`state !== "disconnected"`):
     - Executing `handleAssistantSwitch` initiates a seamless session reconnect, or transmits an updated assistant persona handshake payload to `/live` so backend initializes Gemini Live with Ria's voice (`settings.riaVoice`) and system prompt (`settings.riaSystemPrompt`).

### 4.1 Implementation of `handleAssistantSwitch` in `App.tsx`

```tsx
const handleAssistantSwitch = async (newAssistant: "MYRAA" | "Ria") => {
  if (settings.activeAssistant === newAssistant) return;

  // 1. Update settings store
  handleSettingsChange({ activeAssistant: newAssistant });

  // 2. Shift visual background atmosphere
  if (newAssistant === "Ria") {
    setThemeColor("violet");
  } else {
    setThemeColor("charcoal");
  }

  // 3. Audio session parameter update / reconnect sequence
  if (sessionRef.current && state !== "disconnected") {
    console.log(`[App] Switching active assistant session to ${newAssistant}...`);
    // Disconnect current session and reconnect under new assistant configuration
    sessionRef.current.disconnect();
    setTimeout(() => {
      if (sessionRef.current) {
        sessionRef.current.connect();
      }
    }, 250);
  }
};
```

---

## 5. Verification & Test Plan

1. **Visual Verification**:
   - Open browser, verify header is formatted as a floating Cyber-Glass Navigation Bar capsule with specular highlights.
   - Click "MYRAA" pill: verify cyan active glow, cyan badge, and background theme transition.
   - Click "RIA" pill: verify purple active glow, purple badge, and background theme transition to violet.
2. **Status Indicator Verification**:
   - Verify indicator transitions through `MYRAA IDLE` / `RIA IDLE` -> `PROCESSING` -> `LISTENING` -> `SPEAKING`.
3. **Persistence Verification**:
   - Reload browser: verify `localStorage` preserves the selected assistant.

---

## 6. Conclusion & Handoff Instructions

All code changes for `src/App.tsx` have been fully designed and specified. The implementer agent can apply these changes directly to `src/App.tsx`.
