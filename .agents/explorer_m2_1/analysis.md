# Milestone 2 (R2) Technical Analysis & Implementation Blueprint: Dual Assistant Persona Engine (MYRAA & Ria)

## Executive Summary
This document defines the exact architecture, data flows, API specifications, and code modification blueprints for **Milestone 2 (R2: Dual Assistant Persona Engine MYRAA & Ria)** in the `MYRAA 3.1` codebase. 

Currently, the system defaults to a hardcoded MYRAA anime-heroine voice persona ("Aoede" voice, fixed system prompt in `server.ts`). Milestone 2 enables seamless runtime switching between **MYRAA** (Primary System & Desktop Agent, default voice "Aoede") and **Ria** (Warm & Empathetic Co-Assistant, default voice "Kore"), complete with user-configurable system instructions, voice model selection ("Aoede", "Kore", "Fenrir", "Puck"), and an Express backend API `/api/ria-config` for validating and loading custom JSON configuration files.

---

## 1. Baseline Inspection & Current State Analysis

### 1.1 `server.ts`
- **WebSocket `/live` Endpoint** (Lines 744–1516):
  - Listens for WebSocket upgrade requests on `/live`.
  - In `wss.on("connection", async (clientWs) => ...)` (Line 756), the Gemini Live connection is initialized via `ai.live.connect()` (Line 855).
  - Voice configuration is currently hardcoded:
    ```typescript
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
    }
    ```
  - System instructions are built from a hardcoded 64-line string (`baseInstructions`, Lines 784–847) merged with user memories (`formatSystemInstructionsWithMemories`).
  - No handling currently exists to parse query parameters or initial connection metadata specifying `activeAssistant` ("MYRAA" | "Ria"), `voice`, or `customConfigPath`.
- **Settings REST API** (Lines 313–344):
  - `GET /api/settings` and `POST /api/settings` read and persist settings to `settings.json` via `dataFile("settings.json")`.
  - Missing `/api/ria-config` endpoint.

### 1.2 `src/lib/audio.ts`
- **WebSocket Link Initialization** (Lines 133–136):
  - `MyraaAudioSession.connect()` establishes the WebSocket connection:
    ```typescript
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.ws = new WebSocket(`${protocol}//${window.location.host}/live`);
    ```
  - Currently does not pass assistant persona selection, custom voice model, or configuration path during the connection handshake.
  - `MyraaAudioSession` constructor (Lines 93–105) does not accept assistant profile settings options.

### 1.3 `src/lib/settingsStore.ts`
- **Data Model** (Lines 13–47):
  - `MyraaSettings` interface already contains initial fields for Ria:
    - `activeAssistant: "MYRAA" | "Ria"`
    - `riaCustomConfigPath: string`
    - `riaVoice: string`
    - `riaSystemPrompt: string`
  - `DEFAULT_SETTINGS` initializes `activeAssistant: "MYRAA"`, `riaVoice: "Kore"`, and a default system prompt for Ria.
  - **Gap**: Missing fields for MYRAA-specific voice selection (`myraaVoice`, default `"Aoede"`) and custom MYRAA system instructions (`myraaSystemPrompt`).

### 1.4 `src/components/SettingsPanel.tsx`
- **Assistant Profile UI** (Lines 262–355):
  - Contains tab `"assistant"` with persona selector buttons for MYRAA vs Ria.
  - Controls for `riaVoice`, `riaSystemPrompt`, and `riaCustomConfigPath`.
  - **Gap**: Lacks UI controls for MYRAA voice selection and MYRAA system prompt editing. Lacks active validation and live preview feedback for `riaCustomConfigPath` via backend API.

### 1.5 `settings.json`
- Stores user settings on disk in `DATA_DIR` (`settings.json`). Current payload includes `autoStart`, `wakeWordEnabled`, `wakePhrase`, `micDeviceId`, `sensitivity`, `animations`. Needs to mirror `activeAssistant`, `myraaVoice`, `myraaSystemPrompt`, `riaVoice`, `riaSystemPrompt`, `riaCustomConfigPath`.

### 1.6 `server_paths.ts`
- Provides `DATA_DIR` and `dataFile(name)` helpers for resolving read/write file paths safely across development and packaged Electron environments.

---

## 2. R2 Implementation Requirements & Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 SettingsPanel.tsx / App.tsx                 │
│  - Select active persona ("MYRAA" | "Ria")                   │
│  - Select voice ("Aoede", "Kore", "Fenrir", "Puck")          │
│  - Edit system prompt & custom config path                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ (Connects WS with Query Params)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     src/lib/audio.ts                        │
│  WebSocket URL: /live?assistant=Ria&voice=Kore&config=...   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               │ (Upgrade / Connection)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       server.ts                             │
│  1. GET /api/ria-config -> Validates & parses JSON file      │
│  2. wss /live -> Reads query params + settings.json         │
│  3. Resolves final system instructions & voice choice       │
│  4. ai.live.connect({ voiceName, systemInstruction })       │
└─────────────────────────────────────────────────────────────┘
```

### Requirement 1: Dynamic System Prompt & Voice Switching

1. **Client Handshake Protocol (`src/lib/audio.ts`)**:
   - `MyraaAudioSession` accepts an options object or `settings` in constructor / `connect()`:
     ```typescript
     export interface AudioSessionOptions {
       activeAssistant?: "MYRAA" | "Ria";
       voice?: string;
       systemPrompt?: string;
       riaCustomConfigPath?: string;
     }
     ```
   - When connecting, construct query parameters:
     ```typescript
     const params = new URLSearchParams({
       assistant: options.activeAssistant || "MYRAA",
       voice: options.voice || "Aoede",
       ...(options.riaCustomConfigPath ? { configPath: options.riaCustomConfigPath } : {}),
     });
     this.ws = new WebSocket(`${protocol}//${window.location.host}/live?${params.toString()}`);
     ```

2. **Server Persona & Voice Resolver (`server.ts`)**:
   - Parse connection parameters from `req.url` in `wss.on("connection", async (clientWs, req) => ...)`:
     ```typescript
     const reqUrl = new URL(req.url || "", `http://${req.headers.host}`);
     const activeAssistant = (reqUrl.searchParams.get("assistant") as "MYRAA" | "Ria") || "MYRAA";
     const requestedVoice = reqUrl.searchParams.get("voice");
     const customConfigPath = reqUrl.searchParams.get("configPath");
     ```
   - Persona Resolution Logic:
     - **MYRAA**:
       - Default Voice: `requestedVoice || settings.myraaVoice || "Aoede"`.
       - System Instructions: Base MYRAA instructions (or `settings.myraaSystemPrompt` if set) + persistent memories.
     - **Ria**:
       - Default Voice: `requestedVoice || settings.riaVoice || "Kore"`.
       - Base System Instructions: `settings.riaSystemPrompt` or default Ria co-assistant instructions.
       - Custom Config File Loader: If `customConfigPath` or `settings.riaCustomConfigPath` is provided and exists, load and parse JSON. If JSON contains `systemPrompt` or `instructions` or `voice`, override/append them.
       - Merge resolved instructions with persistent memories (`formatSystemInstructionsWithMemories`).
   - Valid Voices: Restrict `voiceName` to valid Gemini prebuilt voices (`"Aoede"`, `"Kore"`, `"Fenrir"`, `"Puck"`).

3. **Gemini Live Connection**:
   - Pass resolved `voiceName` and `finalInstructions` to `ai.live.connect`:
     ```typescript
     const session = await ai.live.connect({
       model: "gemini-3.1-flash-live-preview",
       config: {
         responseModalities: [Modality.AUDIO],
         speechConfig: {
           voiceConfig: { prebuiltVoiceConfig: { voiceName: resolvedVoice } },
         },
         systemInstruction: finalInstructions,
         tools: [ ... ]
       },
       callbacks: { ... }
     });
     ```

---

### Requirement 2: Configurable Assistant Profiles in `SettingsPanel.tsx`

1. **Store Extensions (`src/lib/settingsStore.ts`)**:
   - Update `MyraaSettings` interface to include:
     ```typescript
     export interface MyraaSettings {
       // ... existing settings ...
       activeAssistant: "MYRAA" | "Ria";
       myraaVoice: string;         // Default: "Aoede"
       myraaSystemPrompt: string;  // Default: "" (uses default MYRAA instructions)
       riaVoice: string;           // Default: "Kore"
       riaSystemPrompt: string;    // Default: "You are Ria..."
       riaCustomConfigPath: string; // Default: ""
     }
     ```
   - Update `DEFAULT_SETTINGS` with sane defaults for both personas.

2. **UI Enhancements (`src/components/SettingsPanel.tsx`)**:
   - Under the **"ASSISTANT"** tab:
     - **Persona Selector Buttons**: Toggle between MYRAA (Cyan theme) and Ria (Purple theme).
     - **MYRAA Profile Section**:
       - MYRAA Voice Model dropdown (`myraaVoice`): `"Aoede" (Expressive)`, `"Kore" (Warm)`, `"Fenrir" (Clear)`, `"Puck" (Playful)`.
       - MYRAA System Prompt textarea (`myraaSystemPrompt`).
     - **Ria Profile Section**:
       - Ria Voice Model dropdown (`riaVoice`): `"Kore"`, `"Aoede"`, `"Fenrir"`, `"Puck"`.
       - Ria System Prompt textarea (`riaSystemPrompt`).
       - Custom Config Path input field (`riaCustomConfigPath`).
       - **Config Validation Component**: A button `"TEST / LOAD CONFIG"` that queries `/api/ria-config?path=...` and displays a status badge (`✓ Config Valid: loaded custom persona` or `✗ File Error: Invalid JSON or path missing`).

---

### Requirement 3: Custom Config Path Loader API (`/api/ria-config`)

1. **Backend Express Route (`server.ts`)**:
   - Add GET and POST `/api/ria-config` routes:
     ```typescript
     app.get("/api/ria-config", async (req, res) => {
       try {
         const targetPath = (req.query.path as string) || (loadSettingsFile().riaCustomConfigPath as string);
         if (!targetPath) {
           return res.status(400).json({ ok: false, error: "No config path specified." });
         }
         const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
         if (!fs.existsSync(resolved)) {
           return res.status(404).json({ ok: false, error: `Config file not found at: ${targetPath}` });
         }
         const content = fs.readFileSync(resolved, "utf-8");
         let parsed: any;
         try {
           parsed = JSON.parse(content);
         } catch (e: any) {
           return res.status(400).json({ ok: false, error: `Invalid JSON format: ${e.message}` });
         }
         
         // Validate expected schema fields
         const validVoice = ["Aoede", "Kore", "Fenrir", "Puck"].includes(parsed.voice) ? parsed.voice : undefined;
         const systemPrompt = parsed.systemPrompt || parsed.instructions || parsed.prompt || "";
         
         res.json({
           ok: true,
           valid: true,
           path: resolved,
           config: {
             assistantName: parsed.assistantName || parsed.name || "Ria",
             voice: validVoice,
             systemPrompt,
             directives: parsed.directives || [],
             memories: parsed.memories || []
           }
         });
       } catch (err: any) {
         res.status(500).json({ ok: false, error: err.message });
       }
     });
     ```

2. **Backend Config Loader Integration in Live Session**:
   - When establishing a live session for Ria, if a valid custom config file exists at `riaCustomConfigPath`, `server.ts` loads it and merges its `systemPrompt`, `voice`, `directives`, and `memories` into the live session configuration.

---

## 3. Concrete Verification Method

1. **API Verification**:
   - Query `/api/ria-config?path=sample_ria_config.json` via HTTP request and verify response payload structure (`ok: true`, `valid: true`, `config`).
2. **WebSocket & Persona Switching Verification**:
   - Initiate WebSocket connection to `/live?assistant=Ria&voice=Kore` and verify `server.ts` logs indicate `"Connecting Gemini session with persona Ria and voice Kore"`.
   - Initiate WebSocket connection to `/live?assistant=MYRAA&voice=Aoede` and verify persona resolution selects MYRAA's instructions and Aoede voice.
3. **Settings Persistence Verification**:
   - Save settings via `/api/settings` and verify `settings.json` persists `activeAssistant`, `myraaVoice`, `myraaSystemPrompt`, `riaVoice`, `riaSystemPrompt`, `riaCustomConfigPath`.
