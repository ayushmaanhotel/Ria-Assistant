# Project: MYRAA Desktop AI Assistant UI Overhaul and Ria Persona Integration

## Architecture
MYRAA Desktop AI Assistant built with React, TypeScript, Tailwind/CSS, Electron/Vite backend.

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 0 | Exploratory Codebase Analysis | Analyze existing structure in `src/`, settings, audio visualizer, components | none | DONE |
| 1 | R1: Modernized Cyber-Glass UI & Assistant Selector | Redesign `src/App.tsx` & components with cyber-glass aesthetic, glowing status indicators, particle backdrop, interactive audio visualizer, top navigation pill/sidebar selector | M0 | DONE |
| 2 | R2: Dual Assistant Persona Engine (MYRAA & Ria) | Integrate Ria co-assistant persona alongside MYRAA with distinct voice settings, system instructions, avatar/visual styling, custom config path loading | M1 | DONE |
| 3 | R3: Enhanced Interactive GenUI & Telemetry Panels | Live system telemetry panel, code diff review panel, quick action launcher, interactive memory dashboard | M1, M2 | IN_PROGRESS |
| 4 | Build Verification & Final Acceptance | `npx tsc --noEmit` check, full build check, settings store validation, zero layout overflow | M1, M2, M3 | PLANNED |

## Interface Contracts
- Assistant Persona State: `ActivePersona` ('MYRAA' | 'Ria'), system prompt, voice parameters, avatar/styling, custom config path.
- Settings Store: Persisted settings for assistant profiles, custom path loading, telemetry preferences.
- Visualizer State: Animate according to assistant state (`idle`, `listening`, `speaking`, `processing`).
- GenUI Panels: Telemetry Panel, Code Diff Reviewer, Quick Action Launcher, Memory Dashboard.
