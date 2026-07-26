# Milestone 1 (R1): Visualizer Handoff Report (`handoff.md`)

**Agent**: Explorer 3 (`explorer_m1_3`)  
**Scope**: `src/components/MyraaCoreVisualizer.tsx` analysis, backdrop particle enhancements, state animation planning (FFT `speechVolumeRef`), and dual persona (MYRAA vs. Ria) visual theme adaptation.  
**Date**: July 24, 2026  

---

## 1. Observation

1. **Target Visualizer Component**:
   - File path: `src/components/MyraaCoreVisualizer.tsx` (393 lines).
   - Props (lines 18–24):
     ```ts
     interface MyraaCoreVisualizerProps {
       session: MyraaAudioSession | null;
       state: LiveState;
       themeColor: string; // Violet, crimson, emerald, celestial, gold, rose, charcoal
       activeEmotion?: MyraaEmotion;
       characterState: "idle" | "thinking" | "talking";
     }
     ```
2. **2D Canvas Setup & Particle Loop**:
   - HTML5 2D canvas element initialized via `canvasRef` (lines 33, 137, 385–389).
   - Flat particle generator (lines 146–155):
     ```ts
     const generateParticles = () => {
       const count = Math.min(60, Math.floor(width / 24));
       particlesRef.current = Array.from({ length: count }, () => ({
         x: Math.random() * width,
         y: Math.random() * height + height * 0.1,
         speed: Math.random() * 0.35 + 0.12,
         size: Math.random() * 1.5 + 0.5,
         opacity: Math.random() * 0.6 + 0.2,
       }));
     };
     ```
   - Cursor tracking refs (lines 48–49, 101–113) record mouse position via window event listener and smooth with `0.05` lerp (line 204), but mouse coordinates are currently unlinked from particle parallax or volumetric beam origin.
3. **FFT Audio Level Extraction**:
   - Lines 175–199 extract frequency data from `session.outputAnalyser` (when `state === "speaking"`) or `session.inputAnalyser` (when `state === "listening"`).
   - Audio volume is averaged across 64 bins into `speechVolumeRef.current` with exponential smoothing factor `0.2` (line 198):
     ```ts
     speechVolumeRef.current += (audioLevel / 255 - speechVolumeRef.current) * 0.2;
     ```
4. **Theme Mapping**:
   - Lines 116–133 map `themeColor` to primary, secondary, and glow RGBA tuples via `getGlowColors()`.
   - `App.tsx` lines 538–568 switch `activeAssistant` between `"MYRAA"` (`themeColor: "charcoal"`) and `"Ria"` (`themeColor: "violet"`).
5. **Type Check Status**:
   - Execution of `node node_modules/typescript/bin/tsc --noEmit` returns Exit Code 0 (clean compilation).

---

## 2. Logic Chain

1. **Observation 1 & 2 -> Multi-Tier Backdrop Architecture**:
   - The current single array particle generator creates a static rising pattern. By replacing this with a 3-tiered particle model (Micro-Stardust, Audio-Excited Core Embers, and Interactive Cursor Nodes), the visualizer achieves high spatial depth under the cyber-glass UI without exceeding performance limits.
2. **Observation 2 -> Parallax & Interactive Cursor Field**:
   - `mouseRef.current` already tracks smooth normalized cursor position. Connecting `mouseRef` to stage light origin tilt and adding particle distance calculations (`Math.hypot`) introduces dynamic cursor repulsion and mouse parallax.
3. **Observation 3 -> Multi-Band State Animation Mapping**:
   - The current single-bin average (`bufferLength = 64`) limits visual distinction between low-frequency vocal bass and high-frequency sibilance. Upgrading to a 256-bin FFT and splitting spectrum into Bass (0–12), Mid (13–45), and Treble (46–128) allows Bass to modulate stage light radius, Mid to drive particle velocity, and Treble to trigger micro-stardust sparkles.
4. **Observation 4 -> Dual Persona Theme Transition**:
   - Switching between MYRAA (Cyan/Amber) and Ria (Purple/Rose) currently triggers immediate theme string changes. Implementing exponential RGB color smoothing inside the canvas render loop ensures seamless, fluid color transitions across persona changes.

---

## 3. Caveats

- **Video Asset Availability**: If character video files (`idle.mp4`, `thinking.mp4`, `talking.mp4`) are not present in `/assets/` or `/assets/ria/`, the component gracefully falls back to the existing error overlay placeholder (`hasError` state).
- **Web Audio Context Autoplay**: Browser security policies require user gesture activation before `AudioContext` resumes. `MyraaAudioSession` handles this, but visualizer fallback baselines (synthetic pulse) ensure particles still animate gracefully prior to mic activation.

---

## 4. Conclusion

`src/components/MyraaCoreVisualizer.tsx` is structurally sound, type-safe, and ready for R1 visual overhaul. The design plan detailed in `analysis.md` provides complete implementation blueprints for:
1. Multi-tiered particle system (stardust, audio embers, cursor repulsion).
2. Spatial mouse parallax and volumetric beam origin tilt.
3. Multi-band FFT spectral decomposition (Bass, Mid, Treble) linked to assistant state profiles (`idle`, `listening`, `thinking`, `speaking`).
4. RGB canvas color interpolator for MYRAA (cyan/amber) vs. Ria (purple/rose) persona switching.

---

## 5. Verification Method

1. **Inspection Verification**:
   - Confirm `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/explorer_m1_3/analysis.md` contains complete architectural specifications and line-level implementation guidance.
2. **TypeScript Compilation Command**:
   - Run in project root:
     ```bash
     node node_modules/typescript/bin/tsc --noEmit
     ```
   - Must return Exit Code 0 with zero errors.
3. **Invalidation Conditions**:
   - Invalidation occurs if any modification to `MyraaCoreVisualizer.tsx` introduces TypeScript build errors, breaks video crossfading, or causes frame drop on 60 Hz/120 Hz displays.
