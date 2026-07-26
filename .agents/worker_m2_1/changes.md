# Changes Document — Milestone 2 (R2: Dual Assistant Persona Engine MYRAA & Ria)

## Overview
Implemented complete R2 Dual Assistant Persona Engine support allowing dynamic persona switching between MYRAA (Primary System & Desktop Agent) and Ria (Warm & Empathetic Co-Assistant), dynamic voice selection, custom configuration loader API `/api/ria-config`, and full UI controls in `SettingsPanel.tsx`.

---

## Modified Files

### 1. `src/lib/settingsStore.ts`
- **Updated `MyraaSettings` interface**: Added `myraaVoice: string` and `myraaSystemPrompt: string`.
- **Updated `DEFAULT_SETTINGS`**: Initialized `myraaVoice: "Aoede"` and `myraaSystemPrompt: ""`.

### 2. `src/lib/audio.ts`
- **Imported `loadSettings`**: From `./settingsStore`.
- **Updated `MyraaAudioSession.connect()`**:
  - Reads active assistant persona, voice, and custom config path via `loadSettings()`.
  - Appends URL query parameters: `/live?assistant=${activeAssistant}&voice=${voice}&configPath=${configPath}`.

### 3. `server.ts`
- **Added GET `/api/ria-config` Express Endpoint**:
  - Accepts `?path=...` query parameter (or falls back to `settings.json`'s `riaCustomConfigPath`).
  - Resolves file path relative to working directory if not absolute.
  - Validates file existence (returns 404 if missing) and JSON format (returns 400 if invalid).
  - Validates schema (`voice` in `["Aoede", "Kore", "Fenrir", "Puck"]`, `systemPrompt`/`instructions`/`prompt`, `directives` array, `memories` array).
  - Returns JSON payload: `{ ok: true, valid: true, path, config: { assistantName, voice, systemPrompt, directives, memories } }`.
- **Updated `/live` WebSocket Connection Handler**:
  - Extracts query parameters `assistant`, `voice`, and `configPath` from incoming WebSocket request URL (`req.url`).
  - Dynamic System Prompt & Voice Resolution:
    - **Ria**: Voice defaults to `voiceParam || riaVoice || "Kore"`. Base system instruction loaded from `riaSystemPrompt`. If custom config path is provided and valid file exists, parses JSON to override voice, system prompt, format directives, and inject custom memories.
    - **MYRAA**: Voice defaults to `voiceParam || myraaVoice || "Aoede"`. Base system instruction uses `myraaSystemPrompt` (or default anime-companion instructions if blank).
  - Merges persistent memory context from `loadMemories()` with any extra config memories via `formatSystemInstructionsWithMemories()`.
  - Configures Gemini Live session with resolved `voiceName` and system instruction `{ parts: [{ text: finalInstructions }] }`.

### 4. `src/components/SettingsPanel.tsx`
- **Added `configTestResult` State & `handleTestRiaConfig` Handler**:
  - Sends GET request to `/api/ria-config?path=...` and updates status badge.
- **Enhanced ASSISTANT Tab UI**:
  - **Persona Selector**: Toggle buttons for MYRAA vs Ria.
  - **MYRAA Configuration**:
    - MYRAA Voice Model dropdown (`Aoede`, `Kore`, `Fenrir`, `Puck`).
    - MYRAA System Instructions textarea.
  - **Ria Configuration & Custom Config**:
    - Ria Voice Model dropdown (`Kore`, `Aoede`, `Fenrir`, `Puck`).
    - Ria System Instructions textarea.
    - Custom Config Path input field + **"TEST CONFIG"** button.
    - Live feedback status badge showing validation result or error message.

---

## Verification Method & Results
- **Command**: `node node_modules/typescript/bin/tsc --noEmit`
- **Working Directory**: `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant`
- **Result**: 0 errors. TypeScript compilation passed cleanly.
