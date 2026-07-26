# Original User Request

## Initial Request — 2026-07-24T06:56:12Z

# Teamwork Project Prompt

Significant UI overhaul for MYRAA Desktop AI Assistant and integration of a secondary assistant persona named "Ria".

Working directory: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant
Integrity mode: development

## Requirements

### R1. Modernized Cyber-Glass UI & Assistant Selector
Redesign the application layout in src/App.tsx and related components with a sleek cyber-glass aesthetic, glowing status indicators, particle backdrop, interactive audio visualizer, and a top navigation pill / sidebar allowing seamless switching between MYRAA and Ria.

### R2. Dual Assistant Persona Engine (MYRAA & Ria)
Integrate "Ria" as a co-assistant persona alongside MYRAA with distinct voice settings, system instructions, avatar/visual styling, and support for loading custom configuration paths from settings.

### R3. Enhanced Interactive GenUI & Telemetry Panels
Integrate rich visual panels including live system telemetry, code diff review, quick action launcher, and interactive memory dashboard into the main interface.

## Acceptance Criteria

### Assistant Switching & State Management
- [x] Top navigation bar features an intuitive selector pill to switch active assistant between MYRAA and Ria.
- [x] System prompt and voice parameters dynamically switch when Ria is selected.
- [x] Settings panel includes configurable assistant profiles and custom config path loading.

### Visual & Interactive Overhaul
- [x] Main window presents a cohesive cyber-glass UI with translucent backdrop blur, glowing borders, and particle backdrop.
- [x] Core visualizer animates smoothly according to assistant state (idle, listening, speaking, processing).
- [x] Telemetry and GenUI panels render cleanly with zero TypeScript or layout overflow errors.

### Build Verification
- [x] npx tsc --noEmit passes without TypeScript errors.
- [x] Settings store and UI components properly wired and saved in local workspace.
