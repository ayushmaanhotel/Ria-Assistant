## 2026-07-24T07:05:19Z
You are Explorer subagent for Milestone 2 (R2: Dual Assistant Persona Engine MYRAA & Ria).

Working directory: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/explorer_m2_1
Project root: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant

Your task:
1. Inspect `server.ts`, `src/lib/audio.ts`, `src/lib/settingsStore.ts`, `src/components/SettingsPanel.tsx`, `settings.json`, and `server_paths.ts`.
2. Map out exact implementation requirements for R2:
   - Dynamic System Prompt & Voice Switching: How `src/lib/audio.ts` passes `activeAssistant` ("MYRAA" | "Ria"), system instructions, and voice choice ("Aoede", "Kore", "Fenrir", "Puck") during WebSocket handshake with `server.ts` (`/live` endpoint), and how `server.ts` uses them in `ai.live.connect()`.
   - Configurable Assistant Profiles in `SettingsPanel.tsx`: UI fields to edit MYRAA and Ria voice selection, custom system instructions, and custom config file path.
   - Custom Config Path Loader API: Backend express route `/api/ria-config` (or settings loader) in `server.ts` that reads and validates custom JSON configuration files specified by `riaCustomConfigPath`.
3. Write your analysis report to `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/explorer_m2_1/analysis.md` and `handoff.md`, and report back via `send_message`.
