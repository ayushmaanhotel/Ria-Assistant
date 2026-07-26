## 2026-07-24T07:34:55Z

You are the Implementer / Worker for Milestone 3 (R3: Enhanced Interactive GenUI & Telemetry Panels) of MYRAA Desktop AI Assistant.

Working directory: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/worker_m3
Project root: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant

DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
1. **Create `src/components/SystemTelemetry.tsx`**:
   - Translucent glass modal/panel displaying live system telemetry: CPU usage %, physical/logical cores, RAM usage %, used/total GB, GPU & VRAM metrics, and Python desktop agent health (polling `http://localhost:8765/health` or `/api/agent-health` with graceful mock/fallback telemetry data when offline).
   - Cyber-glass aesthetic with progress gauges, metrics cards, and historical sparklines.
   - Props: `{ isOpen: boolean; onClose: () => void; themeColor: string }`.

2. **Create `src/components/CodeDiffEditor.tsx`**:
   - Interactive code diff reviewer component supporting Side-by-Side and Inline view modes, line numbers, green (+N additions) / red (-M deletions) line highlighting, copy diff handler, and apply code callback.
   - Props: `{ isOpen: boolean; onClose: () => void; originalCode?: string; modifiedCode?: string; filename?: string; themeColor: string; onApply?: (newCode: string) => void }`.

3. **Create `src/components/CommandLauncher.tsx`**:
   - Quick Action Command Launcher palette modal with `Ctrl+K` / `Cmd+K` global keyboard shortcut trigger and top nav bar trigger button.
   - Includes real-time search filtering, arrow key navigation (Up/Down/Enter/Esc), categorized quick actions (Persona switching between MYRAA & Ria, Atmosphere themes, Open Telemetry, Open Code Diff, Open Memories, Toggle Screen Vision, Audio settings).
   - Props: `{ isOpen: boolean; onClose: () => void; onSelectAction: (actionId: string) => void; themeColor: string }`.

4. **Enhance `src/components/MemoryDashboard.tsx`**:
   - Add real-time text search filter (`searchQuery`) filtering memory items across category tabs and text contents.
   - Add memory count overview stats banner breakdown.

5. **Defensive API Hardening in `server.ts` (`/api/ria-config`)**:
   - Inspect `/api/ria-config` endpoint handling in `server.ts`.
   - Add defensive JSON check ensuring parsed body/payload is a non-null JSON object: `if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))` returning HTTP 400 with `{ ok: false, valid: false, error: "Configuration payload must be a non-null JSON object." }`.

6. **Integrate into `src/App.tsx`**:
   - Add state variables for `showTelemetry`, `showCodeDiff`, `showCommandLauncher`.
   - Add global `Ctrl+K` keyboard event listener to toggle `showCommandLauncher`.
   - Wire top floating capsule navigation bar buttons (`TELEMETRY`, `DIFF`, `LAUNCH`) to trigger modals.
   - Render `SystemTelemetry`, `CodeDiffEditor`, `CommandLauncher`, and enhanced `MemoryDashboard`.

7. **Verification**:
   - Run `npx tsc --noEmit` and confirm 0 TypeScript errors.
   - Write implementation report to `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/worker_m3/changes.md` and handoff report to `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/worker_m3/handoff.md`.
   - Send completion message to parent.
