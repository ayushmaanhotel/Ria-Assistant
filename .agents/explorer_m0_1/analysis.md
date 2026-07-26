# Milestone 0: Comprehensive Codebase Analysis Report

**Project**: MYRAA Desktop AI Assistant UI Overhaul and Ria Persona Integration  
**Agent**: Explorer (`explorer_m0_1`)  
**Date**: July 24, 2026  
**Status**: Milestone 0 Completed  

---

## 1. Executive Summary

This report presents a thorough, read-only exploratory analysis of the **MYRAA 3.1** codebase. The objective of Milestone 0 is to map out the current frontend and backend architecture, evaluate state management and styling systems, audit TypeScript build health, and establish clear integration pathways for upcoming releases:
- **R1**: Cyber-Glass UI Overhaul, Top Navigation Pill, Particle Backdrop & Audio Visualizer.
- **R2**: Ria Persona Integration, System Prompt Switching, Voice Settings, Visual Styling, Custom Config Path Loading.
- **R3**: Live System Telemetry, Code Diff Review, Quick Action Launcher, Memory Dashboard.

---

## 2. Directory & Component Structure

### Project Layout
```
myraa-ai-assistant/
├── .agents/                    # Agent metadata & handoff reports
├── assets/                     # Video assets (idle.mp4, thinking.mp4, talking.mp4)
├── desktop_agent/              # Python FastAPI automation server (70+ OS tools)
├── electron/                   # Electron v43 desktop shell
│   ├── main.cjs                # Main process entry, window creation, single-instance lock
│   ├── preload.cjs             # ContextBridge preload script
│   └── splash.html             # Startup splash screen
├── src/                        # React 19 Frontend application
│   ├── components/             # React UI Components
│   │   ├── ApiKeyGate.tsx      # First-run onboarding key verification gate
│   │   ├── BrowserAgent.tsx    # Interactive holographic web browser workspace
│   │   ├── HolographicProjector.tsx # Modal iframe preview for external websites
│   │   ├── MemoryDashboard.tsx # Sliding drawer for persistent memory core management
│   │   ├── MyraaCoreVisualizer.tsx # 2D Canvas particle engine & video avatar crossfader
│   │   └── SettingsPanel.tsx   # 5-tab configuration sliding drawer
│   ├── lib/                    # Core utilities & state stores
│   │   ├── audio.ts            # MyraaAudioSession PCM conversion & WebAudio/WS bridge
│   │   ├── memoryTypes.ts      # TypeScript interfaces for Memory & MemoryTransaction
│   │   ├── settingsStore.ts    # MyraaSettings store (localStorage + backend sync)
│   │   └── wakeWord.ts         # MyraaWakeWordDetector using Web Speech API
│   ├── App.tsx                 # Main application container & UI layout
│   ├── index.css               # Tailwind CSS v4 & custom typography setup
│   └── main.tsx                # Entry point rendering ApiKeyGate + App
├── ARCHITECTURAL_SPECIFICATION.md # Architecture specification document
├── index.html                  # Main HTML template
├── package.json                # Dependencies and script definitions
├── server.ts                   # Express server + WebSocket live bridge + tool router
├── server_memory.ts            # Persistent memory loading, formatting & LLM consolidation
├── server_paths.ts             # Writable DATA_DIR resolution & secrets handling
├── settings.json               # Local backend settings file
├── tsconfig.json               # TypeScript configuration (strict, noEmit)
└── vite.config.ts              # Vite 6 build configuration with Tailwind v4 plugin
```

### Key Frontend Components

| Component | Path | Description & Role |
|---|---|---|
| `App.tsx` | `src/App.tsx` | Root layout, manages audio session, screen sharing capture, top dual-assistant pill, active emotion subtitle overlay, theme background switching, and drawer toggles. |
| `ApiKeyGate.tsx` | `src/components/ApiKeyGate.tsx` | Onboarding modal blocking application until a valid Gemini API key is configured. |
| `MyraaCoreVisualizer.tsx` | `src/components/MyraaCoreVisualizer.tsx` | 2D Canvas rendering volumetric light beam, background stardust particles, FFT audio level reactivity (`speechVolumeRef`), cursor tracking, and crossfading MP4 character video states. |
| `SettingsPanel.tsx` | `src/components/SettingsPanel.tsx` | 5-tab sliding drawer (GENERAL, ASSISTANT, VOICE, SYSTEM, ABOUT) for configuring autoStart, persona, voice models, prompts, custom config paths, and wake word. |
| `MemoryDashboard.tsx` | `src/components/MemoryDashboard.tsx` | 7-category sliding drawer for persistent memory items, manual seed entry, memory deletion, and sync status. |
| `BrowserAgent.tsx` | `src/components/BrowserAgent.tsx` | Embedded interactive web browser canvas with proxy scraper `/api/web-proxy`, YouTube live search `/api/youtube-search`, and automation triggers. |
| `HolographicProjector.tsx` | `src/components/HolographicProjector.tsx` | Standalone iframe viewer for external URL previews with sandbox fallback triggers. |

---

## 3. Current State Management Audit

| State Domain | Location | Implementation Pattern | Persistence |
|---|---|---|---|
| **User Settings** | `src/lib/settingsStore.ts` | Plain TS store (`loadSettings`/`saveSettings`) | Dual: `localStorage` (`myraa.settings.v2`) + POST `/api/settings` to `settings.json` |
| **Active Persona** | `settingsStore.ts` & `App.tsx` | `activeAssistant: "MYRAA" \| "Ria"` | Stored in settings; UI toggles between cyan (MYRAA) and purple (Ria) themes |
| **Ria Configurations** | `settingsStore.ts` | `riaVoice`, `riaSystemPrompt`, `riaCustomConfigPath` | Stored in settings store; defaults to Kore voice and Ria empathetic prompt |
| **Live Audio Session** | `src/lib/audio.ts` | `MyraaAudioSession` class managing AudioContext & WebSocket | Transients in-memory; manages 16kHz mic input & 24kHz speaker PCM output |
| **Visualizer & Emotion** | `App.tsx` & `MyraaCoreVisualizer.tsx` | `LiveState`, `characterState`, `activeEmotion` | Real-time state derived from text captions & AnalyserNode FFT audio data |
| **Persistent Memories** | `server_memory.ts` & `MemoryDashboard.tsx` | Array of `Memory` objects categorized into 7 archetypes | `memories.json` in writable `DATA_DIR`; auto-consolidated via `gemini-3.5-flash` |
| **System Telemetry** | `server.ts` & `desktop_agent/` | HTTP REST endpoints on Python agent (`:8765`) | Queried live via `systemInfo`, `gpuInfo`, and `/api/agent-health` |

---

## 4. Styling & Aesthetics Setup

1. **Tailwind CSS v4**: Loaded in `vite.config.ts` via `@tailwindcss/vite` and imported in `src/index.css` via `@import "tailwindcss";`.
2. **Typography**: Configured theme fonts:
   - Display: `Space Grotesk`
   - Sans: `Inter`
   - Mono: `JetBrains Mono`
3. **Animations**: `motion` (Framer Motion v12) handles sliding drawers, modal overlays (`AnimatePresence`), floating elements (`animate-float`), and smooth backdrop color crossfades (`.theme-transition`).
4. **Cyber-Glass Aesthetic**: Specular frosted glass panels constructed with Tailwind utilities: `backdrop-blur-2xl`, `bg-[#020206]/95`, `border-white/10`, `shadow-[0_0_50px_rgba(0,0,0,0.8)]`.
5. **Canvas Visualizer**: HTML5 2D Canvas in `MyraaCoreVisualizer.tsx` handles volumetric stage light beams, rising stardust particles, cursor lag tracking, and FFT audio excitation.

---

## 5. Integration Points for Target Releases

### R1 Integration Points (Cyber-Glass UI, Top Nav Pill, Particle Backdrop, Audio Visualizer)
- **Top Navigation Pill**: `App.tsx` line 537 currently contains a prototype selector pill for switching assistants. Can be refactored into a standalone Cyber-Glass top navigation bar component.
- **Cyber-Glass Design Tokens**: Extract repetitive inline glass classes from `SettingsPanel.tsx`, `MemoryDashboard.tsx`, and `BrowserAgent.tsx` into reusable CSS classes (`.glass-panel`, `.glass-panel-glow`) in `src/index.css`.
- **Particle Backdrop & Visualizer**: `MyraaCoreVisualizer.tsx` already exposes canvas particle rendering and WebAudio AnalyserNode hooks. Can be augmented with enhanced shader or particle effects.

### R2 Integration Points (Ria Persona, System Prompt Switching, Voice Settings, Avatar Styling, Custom Config Path)
- **Settings Store Readiness**: `settingsStore.ts` already defines `activeAssistant`, `riaVoice`, `riaSystemPrompt`, and `riaCustomConfigPath`.
- **Backend WebSocket Connection (`server.ts`)**: Currently, line 855 in `server.ts` hardcodes voice `"Aoede"` and the MYRAA anime system prompt when calling `ai.live.connect()`.
  - **Required Action**: Modify `server.ts` during connection initiation to read `activeAssistant` from settings (or connection message params), selecting between MYRAA instructions and `riaSystemPrompt`, and mapping `riaVoice` (e.g. `"Kore"`, `"Fenrir"`, `"Aoede"`, `"Puck"`).
- **Avatar & Visual Styling**: Update `MyraaCoreVisualizer.tsx` to handle visual skinning / video asset switching when `activeAssistant === "Ria"`, automatically setting theme color to purple/violet.
- **Custom Config Loading**: Implement backend loader endpoint `/api/ria-config` to parse custom JSON config files specified by `riaCustomConfigPath`.

### R3 Integration Points (Live System Telemetry, Code Diff Review, Quick Action Launcher, Memory Dashboard)
- **Live System Telemetry Dashboard**: Build a dedicated telemetry widget component in `src/components/` that periodically fetches CPU, RAM, GPU, and process metrics via `systemInfo` / `/api/agent-health`.
- **Code Diff Review**: Create a `CodeDiffEditor.tsx` widget in `src/components/` (referencing `ARCHITECTURAL_SPECIFICATION.md`) for visualizing code diffs before applying modifications.
- **Quick Action Launcher**: Implement a command palette / launcher component (e.g., Ctrl+K or top nav trigger) for executing frequent desktop tools and system shortcuts.
- **Memory Dashboard**: `MemoryDashboard.tsx` is already fully implemented with category filters, manual seed insertion, deletion, and live WebSocket synchronization (`memory_sync`).

---

## 6. TypeScript Compilation & Verification

- **Compiler Configuration**: `tsconfig.json` specifies `"noEmit": true`, `"moduleResolution": "bundler"`, `"target": "ES2022"`, and `"jsx": "react-jsx"`.
- **Verification Execution**:
  - Command executed: `node node_modules/typescript/bin/tsc --noEmit`
  - Result: **Exit Code 0** (Clean compilation, 0 type errors or missing declarations).

---

## 7. Conclusion & Next Steps

The MYRAA 3.1 codebase is clean, well-architected, and fully type-safe. The state management pattern (`settingsStore.ts` + `server_memory.ts`) is lightweight and ready for the R1, R2, and R3 features.

**Recommended Implementation Order for Subsequent Milestones**:
1. **Milestone 1 (R1 UI Overhaul)**: Refactor Cyber-Glass navigation pill, consolidate CSS glass tokens, polish particle backdrop visualizer.
2. **Milestone 2 (R2 Ria Persona)**: Wire dynamic persona system prompt switching and voice selection into `server.ts` WebSocket connect handler, implement custom config path loading.
3. **Milestone 3 (R3 Advanced Widgets)**: Add live system telemetry card, code diff review widget, and quick launcher palette.
