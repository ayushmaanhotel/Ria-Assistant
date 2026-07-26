# MYRAA 3.1 — Architectural & Technical Specification

> **Document Purpose**: Comprehensive structural analysis of the core technologies, system architecture, feature sets, audio processing pipelines, desktop automation capabilities, and data flows built into **MYRAA 3.1**.

---

## 1. Executive Summary & Vision

**MYRAA 3.1** is a native, desktop-first, autonomous AI assistant designed to run locally on Windows (optimized for ARM64 / Snapdragon X and x64 architectures). Unlike standard browser-based AI wrappers, MYRAA operates directly against the local operating system, combining real-time bi-directional voice conversation (via Google Gemini Live API) with deep local system automation, screen perception, and desktop control capabilities.

---

## 2. Architecture & Process Topography

The system employs a multi-tiered **Triple Process Model** combining an Electron desktop shell, a Node.js Express orchestration engine, and a frozen Python automation agent.

```
┌────────────────────────────────────────────────────────┐
│        Electron Desktop Shell (v43 - Win32/ARM64/x64)  │
│        (electron/main.cjs - Native Chromium Window)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ (HTTP / WebSocket :3010)
                            ▼
┌────────────────────────────────────────────────────────┐
│              Node.js Express Backend Server            │
│                 (dist/server.cjs - Port 3010)          │
│                                                        │
│  ├── WebSocket Bridge (/live) ──► Gemini Live API      │
│  ├── GenUI Component Event Bus                         │
│  ├── Proposal & Memory Storage Engines                 │
│  └── Dynamic Tool Call Dispatch Router                 │
└───────────┬────────────────────────────────────────────┘
            │
            │ (HTTP REST / JSON :8765)
            ▼
┌────────────────────────────────────────────────────────┐
│           Python Desktop Automation Agent              │
│       (myraa-agent.exe / FastAPI - Port 8765)          │
│                                                        │
│  ├── PyAutoGUI (Mouse / Keyboard Input)                │
│  ├── Tesseract OCR (Screen Perception)                 │
│  ├── Playwright / Native Browser Automation            │
│  └── 70+ OS System & File Management Tools            │
└────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Specification

### A. Desktop Shell & UI Layer
* **Runtime Framework**: Electron (v43.1.0, targeted for native `win32-arm64` and `win32-x64`).
* **Frontend Framework**: React 19 (`react` ^19.0.1) with TypeScript (~5.8.2).
* **Build System**: Vite 6.2.3 (Frontend) & esbuild 0.25.0 (Node Backend bundling to `dist/server.cjs`).
* **Styling & Aesthetics**: Modern HSL-tailored CSS design system (`src/index.css`) & TailwindCSS v4 (`@tailwindcss/vite` ^4.1.14), featuring:
  * Specular cyber-glass panels (`.glass-panel`, `.glass-panel-glow`).
  * Micro-animations powered by `motion` (Framer Motion v12).
  * Particle field visualizers (`MyraaCoreVisualizer.tsx`, `HolographicProjector.tsx`).
  * Lucide Icons (`lucide-react` ^0.546.0).
  * Custom WebKit HSL scrollbars and titlebar drag regions (`.titlebar-drag`, `.titlebar-nodrag`).

### B. Orchestration & Network Server
* **Server Framework**: Node.js Express (`server.ts`, bundled via `esbuild` to `dist/server.cjs`).
* **WebSocket Engine**: `ws` (^8.21.0) package for client-to-server and server-to-cloud bi-directional streaming.
* **AI SDK**: Google Gen AI SDK (`@google/genai` ^2.4.0), implementing the `ai.live.connect` WebSocket protocol.
* **Model Endpoint**: `gemini-2.0-flash-exp` & `gemini-2.0-flash-realtime-exp` (Supporting 16kHz audio input and 24kHz raw PCM output).

### C. Desktop Automation Subsystem
* **Agent Engine**: Python 3.11 FastAPI server (`desktop_agent/main.py`), bundled into a standalone executable (`myraa-agent.exe`) using PyInstaller.
* **Automation Libraries**:
  * `pyautogui` / `pynput`: Physical mouse click, drag, and keystroke simulation.
  * `pytesseract` / OpenCV: Screen OCR and coordinate text matching.
  * `psutil` / `pynvml`: Real-time CPU, RAM, GPU (NVIDIA Management Library - NVML), and process telemetry.
  * `playwright`: Headless/headful browser session automation.
  * `send2trash`: Safe Recycle Bin routing for file deletions.

---

## 4. Comprehensive Feature Catalog

### I. Real-Time Bi-Directional Voice Engine
* **Microphone Processing (`public/audio-worklet-processor.js` / `src/lib/audio.ts`)**:
  * Custom `AudioWorkletProcessor` running on a dedicated audio rendering thread at 16kHz sampling rate.
  * **Non-Detaching Memory Buffer**: Fresh ArrayBuffer allocation (`copy.set(this.buffer)`) preventing ArrayBuffer detachment during high-frequency V8 `postMessage` transfers.
  * Captures 2048-sample PCM fragments (~128ms slices) to eliminate event-loop packet flooding.
* **Voice Output & Playback (`src/lib/audio.ts`)**:
  * **Signed 16-bit PCM Decoding**: Exact Little-Endian sign extension `(val << 16) >> 16` normalized to 32-bit Float32 (`/ 32768.0`) to eliminate waveform clipping and audio crackle.
  * **Jitter Buffer & Drift Management**: WebAudio API queue with a target 80ms jitter cushion and 350ms max drift clamp.
  * **Non-Suspending Node Graph**: Connects worklet nodes to a 0-gain WebAudio destination node to prevent Chromium background thread suspension.

### II. Desktop Automation & Perception Suite (70 Tools)
1. **Application & Process Control**:
   * `openApplication` / `openAnyApplication`: Launches installed desktop applications via shortcut scanning.
   * `closeApplication`: Soft or forced process termination by executable name.
   * `runTerminalCommand`: Unrestricted PowerShell command execution (requires Full Access Mode).
2. **Screen Perception & Input Simulation**:
   * `clickCoordinates`: Simulates physical mouse clicks at precise `(x, y)` display pixels.
   * `sendKeyPresses`: Sends key combinations (`ctrl+c`, `win+r`) or writes text blocks.
   * `ocrClickText`: Reads text visible on the monitor via OCR and clicks its screen location automatically.
3. **File System Operations**:
   * `createFile` / `writeCodeFile` / `createPythonFile`: Creates structured code/text files with safe folder isolation.
   * `readFile` / `listFiles` / `searchFiles` / `moveFile` / `renameFile`.
   * `deleteFile`: Safe deletion routing to the Windows Recycle Bin by default, with hard-delete flags available.
4. **Web Browser Automation**:
   * `openWebsite` / `searchWeb` / `searchYouTube` / `searchGoogle` / `searchGitHub`.
   * Native Chrome Sync Extension Integration (`chromeNavigate`, `chromeReadTab`, `chromeClick`).
   * Playwright-backed Browser Automation (`desktopBrowserClick`, `desktopBrowserType`, `desktopBrowserFillForm`).
5. **System Telemetry & Hardware Control**:
   * `systemInfo`: Real-time monitor for CPU %, RAM %, disk storage, uptime, and OS version.
   * `gpuInfo`: NVIDIA GPU utilization, VRAM allocation, and temperature metrics.
   * `brightnessUp` / `brightnessDown` / `setBrightness`: Windows display brightness controls via WMI.
   * `enableAutoStart` / `disableAutoStart` / `getAutoStartStatus`: Windows registry startup persistence.

### III. Interactive Generative UI 2.0 (GenUI)
Allows the AI assistant to push rich visual React components dynamically onto the user's screen:
* **CodeDiffEditor (`CodeDiffEditor.tsx`)**: Code review widget displaying side-by-side or inline code diffs.
* **SystemDashboard (`SystemDashboard.tsx`)**: Live visual charts for CPU, RAM, network, and storage.
* **DatabaseExplorer (`DatabaseExplorer.tsx`)**: Visual database table inspector and query runner.
* **TaskPipeline (`TaskPipeline.tsx`)**: Visual DAG / pipeline step execution viewer.
* **WarRoomCanvas (`WarRoomCanvas.tsx`)**: Multi-agent war room whiteboard for task coordination.
* **BrowserAgent (`BrowserAgent.tsx`)**: Autonomous browser visualization canvas.
* **HolographicProjector & MyraaCoreVisualizer**: 3D & particle-based core audio state visualizer.

### IV. Autonomous Advisor & Safety Guard
* **Tool Access Modes**:
  * **Sandboxed Mode**: Read-only operations allowed (system telemetry, file searches).
  * **Full Access Mode**: System-modifying tools enabled (application launches, file edits).
  * **God Mode**: Unrestricted system bypass.
* **Proposal Engine**:
  * Intercepts modifying actions (e.g., file reorganization, disk cleanup).
  * Formats a structured Markdown proposal document in `Desktop/MYRAA_Shared/Proposals`.
  * Renders a UI proposal card for user review and explicit written/verbal approval before execution.
* **Two-Step Confirmation Safeguard**:
  * Power actions (shutdown, restart, sleep, lock) require a single-use token issued by `requestPowerAction` (valid for 60s) before `executePowerAction` can be executed.

### V. Memory & Directive System (`server_memory.ts`)
* **Categorized Memory Core**: Stores identity, preferences, goals, projects, relationships, and emotional context in `memories.json`.
* **Automatic Conversation Consolidation**: Background LLM pass every 5 turns to extract key facts into persistent storage (`data/memories.json`).
* **Evolved Directives Engine**: Allows the assistant to program permanent behavioral rules into its own system prompt when commanded by the user.

### VI. External Integrations & Gateways
* **Docker Dashboard**: Inspects active Docker containers, image tags, status, and port bindings.
* **Hermes CLI & Antigravity Agent Integration**: Connects to the local `agy` developer CLI tool for running automated builds, documentation lookups, and developer workflows.

---

## 5. End-to-End Data & Execution Flows

### A. Speech Input & Live Response Stream Flow

```
[ User Microphone ]
       │ (16kHz PCM Audio Streams)
       ▼
[ public/audio-worklet-processor.js ] ── (2048-sample ArrayBuffer) ──► [ audio.ts / App.tsx ]
                                                                               │
                                                                               │ WebSocket ({type: 'audio', audio: base64})
                                                                               ▼
                                                                    [ Node Server (server.ts) ]
                                                                               │
                                                                               │ WebSocket Bridge
                                                                               ▼
                                                                    [ Google Gemini Live API ]
                                                                               │
                                                                               │ LiveServerMessage (modelTurn.parts)
                                                                               ▼
[ Client Audio Destination ] ◄── (Float32 AudioBuffer) ◄── [ Node Server (server.ts) ]
```

### B. Tool Execution & Response Flow

```
[ Gemini Live Session ]
       │
       │ (Emits toolCall functionCall)
       ▼
[ Node Server (server.ts Router) ]
       │
       ├──► [ Safe Tool / GenUI ] ──────────────► Broadcasts React Widget to App.tsx
       │
       ├──► [ Modifying Tool ] ─────────────────► Creates Proposal Card in MYRAA_Shared
       │
       └──► [ Desktop Agent Tool ] ─────────────► HTTP POST (http://127.0.0.1:8765/execute)
                                                            │
                                                            ▼
                                                [ myraa-agent.exe (Python) ]
                                                            │ (PyAutoGUI / Tesseract)
                                                            ▼
                                                [ Physical OS Execution ]
```

---

## 6. Build, Packaging & Distribution Pipeline

* **Installer Framework**: `electron-builder` (v26.15.3) with NSIS target and Portable executable target.
* **Architecture Targets**: `x64` and `arm64` (`win32-arm64` & `win32-x64` native binaries).
* **Artifact Outputs**:
  * Portable Package: `release/MYRAA-Portable-1.0.0.exe` (~143.6 MB)
  * Standalone Installer: `release/MYRAA-Setup-1.0.0.exe` (~146.2 MB)
* **Runtime Guards**: Single-instance lock via `app.requestSingleInstanceLock()`, auto-restoring window focus upon launching existing background instances.
* **Embedded Resources**: PyInstaller-frozen desktop agent (`agent_dist/myraa-agent`) packaged into `resources/agent` so target machines require no Python installation.

---

*Document generated for architectural analysis, system audit, and repository documentation.*
