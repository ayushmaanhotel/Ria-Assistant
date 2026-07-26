# Handoff Report: Explorer Subagent for Milestone 2 (R2: Dual Assistant Persona Engine MYRAA & Ria)

## 1. Observation
- **`server.ts`**:
  - WebSocket `/live` endpoint (Lines 744–1516): `ai.live.connect()` at Line 855 uses hardcoded voice `"Aoede"` (`voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } }`) and hardcoded MYRAA system instructions (`baseInstructions`, Lines 784–847). Does not parse URL query parameters or handshake config for persona/voice switching.
  - REST Endpoints (Lines 249–428): Handles `/api/memories`, `/api/settings`, `/api/config`, `/api/agent-health`, `/api/logs/:file`. Missing `/api/ria-config` route.
- **`src/lib/audio.ts`**:
  - `MyraaAudioSession.connect()` (Lines 126–136): Instantiates WebSocket connection using hardcoded path `${protocol}//${window.location.host}/live`.
- **`src/lib/settingsStore.ts`**:
  - `MyraaSettings` interface (Lines 13–34): Contains `activeAssistant: "MYRAA" | "Ria"`, `riaCustomConfigPath`, `riaVoice`, `riaSystemPrompt`. Lacks fields for `myraaVoice` (default `"Aoede"`) and `myraaSystemPrompt` (default `""`).
- **`src/components/SettingsPanel.tsx`**:
  - Assistant configuration tab (Lines 262–355): Provides persona selection and Ria fields (`riaVoice`, `riaSystemPrompt`, `riaCustomConfigPath`), but lacks UI inputs for `myraaVoice` and `myraaSystemPrompt`, as well as interactive validation/testing of custom config paths.
- **`settings.json`**:
  - Root data file holding user settings on disk (`autoStart`, `wakeWordEnabled`, `wakePhrase`, `micDeviceId`, `sensitivity`, `animations`). Needs to support `activeAssistant`, `myraaVoice`, `myraaSystemPrompt`, `riaVoice`, `riaSystemPrompt`, `riaCustomConfigPath`.
- **`server_paths.ts`**:
  - Provides data directory resolution via `DATA_DIR` and `dataFile()`.

## 2. Logic Chain
1. **Goal**: Enable full R2 Dual Assistant Persona Engine supporting dynamic prompt/voice switching between MYRAA and Ria, configurable profiles in SettingsPanel, and a custom config JSON loader backend API.
2. **Dynamic Prompt & Voice Switching**:
   - `src/lib/audio.ts` must append query parameters (`assistant`, `voice`, `configPath`) to the WebSocket connection URL `/live?assistant=...&voice=...&configPath=...`.
   - `server.ts` parses these connection query parameters in `wss.on("connection", async (clientWs, req) => ...)`.
   - `server.ts` resolves the active system prompt (`MYRAA` prompt vs `Ria` prompt + memories + custom config file if specified) and active voice model (`Aoede`, `Kore`, `Fenrir`, or `Puck`), passing them directly to `ai.live.connect()`.
3. **Configurable Assistant Profiles in UI**:
   - `src/lib/settingsStore.ts` must add `myraaVoice` and `myraaSystemPrompt` to `MyraaSettings` and `DEFAULT_SETTINGS`.
   - `SettingsPanel.tsx` must add form fields for MYRAA voice selection and MYRAA system instructions, and add an interactive "Test / Load Config" button for `riaCustomConfigPath` that calls `/api/ria-config`.
4. **Custom Config Loader API (`/api/ria-config`)**:
   - Express route `GET /api/ria-config` in `server.ts` validates specified JSON file existence (`fs.existsSync`), parses JSON (`JSON.parse`), validates schema (`voice`, `systemPrompt`, `directives`), and returns JSON status.
   - When Ria persona connects, `server.ts` uses this loader to override or supplement default Ria settings.

## 3. Caveats
- Read-only investigation: No code changes were made to source files (`server.ts`, `src/lib/audio.ts`, `src/lib/settingsStore.ts`, `src/components/SettingsPanel.tsx`). Implementation will be performed by the implementer agent.
- Voice models must be restricted to valid Google Gemini Live API prebuilt voices (`"Aoede"`, `"Kore"`, `"Fenrir"`, `"Puck"`).

## 4. Conclusion
The implementation plan for Milestone 2 (R2) is fully specified and mapped out. Detailed code structures, data schemas, API routes, and parameter handling logic have been documented in `analysis.md`.

## 5. Verification Method
1. Inspect `analysis.md` in `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/explorer_m2_1/analysis.md`.
2. Verify `/api/ria-config` route functionality by passing a custom config file path via HTTP request once implemented.
3. Test WebSocket connection URL parameters `/live?assistant=Ria&voice=Kore` to verify persona and voice switching in `server.ts`.
