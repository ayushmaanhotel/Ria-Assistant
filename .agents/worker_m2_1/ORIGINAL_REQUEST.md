## 2026-07-24T07:06:35Z
You are Worker subagent for Milestone 2 (R2: Dual Assistant Persona Engine MYRAA & Ria).

Working directory: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/worker_m2_1
Project root: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
1. Review Explorer analysis: `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/explorer_m2_1/analysis.md`.
2. Implement R2 in the codebase:
   - `src/lib/audio.ts`: Update `MyraaAudioSession.connect()` to append query parameters `/live?assistant=${activeAssistant}&voice=${voice}&configPath=${configPath}` based on `settingsStore.loadSettings()`.
   - `server.ts`:
     - Update `/live` WebSocket handler to extract query parameters `assistant`, `voice`, `configPath`.
     - Implement dynamic system prompt & voice selection:
       - If `assistant === "Ria"`, read `riaSystemPrompt` (or custom JSON config at `riaCustomConfigPath`) and `riaVoice` (e.g. "Kore", "Fenrir", "Puck").
       - If `assistant === "MYRAA"`, read MYRAA system instructions and `myraaVoice` (e.g. "Aoede").
       - Merge persistent memory context from `server_memory.ts`.
       - Pass resolved system instruction text and voice configuration into `ai.live.connect({ model, config: { generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }, systemInstruction: { parts: [{ text: resolvedPrompt }] } } })`.
     - Implement `GET /api/ria-config` Express endpoint: validate file existence, parse JSON, check schema (`voice`, `systemPrompt`, `directives`, `memories`), and return `{ valid: true, config }` or error.
   - `src/lib/settingsStore.ts`: Add `myraaVoice` (default "Aoede") and `myraaSystemPrompt` (default "") to `MyraaSettings` interface and defaults.
   - `src/components/SettingsPanel.tsx`: Add UI controls in ASSISTANT tab for selecting MYRAA & Ria voice models, system prompts, custom config file path loader input, and "Test Config" button triggering `/api/ria-config`.
3. Verification: Run `node node_modules/typescript/bin/tsc --noEmit` using `run_command` in project root and confirm 0 errors.
4. Document all changes and verification output in `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/worker_m2_1/changes.md` and `handoff.md`.
5. Send completion report back to parent orchestrator via `send_message`.
