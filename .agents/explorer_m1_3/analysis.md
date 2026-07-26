# Milestone 1 (R1): MyraaCoreVisualizer Analysis & Design Specification

**Target File**: `src/components/MyraaCoreVisualizer.tsx`  
**Scope**: 2D Canvas particle backdrop, AudioContext AnalyserNode FFT reactivity (`speechVolumeRef`), state animation mapping (`characterState` / `state`), and Dual Assistant Persona styling (MYRAA vs. Ria).  
**Author**: Explorer 3 (`explorer_m1_3`)  
**Date**: July 24, 2026  

---

## 1. Codebase Baseline & File Audit

### File Details
- **Path**: `src/components/MyraaCoreVisualizer.tsx` (393 lines)
- **Dependencies**: `react` (`useEffect`, `useRef`, `useState`), `../lib/audio` (`MyraaAudioSession`, `LiveState`), `lucide-react` (`Sparkles`).
- **Primary Responsibilities**:
  1. HTML5 2D Canvas background rendering (`canvasRef`, `animationRef`).
  2. Character video state crossfading (`idle.mp4`, `thinking.mp4`, `talking.mp4` via HTML5 `<video>` refs).
  3. Audio FFT signal extraction from `MyraaAudioSession` (`inputAnalyser` / `outputAnalyser`).
  4. Ambient backlight glow positioning and theme mapping (`themeColor`).

---

## 2. Item 1: 2D Canvas Particle Backdrop Enhancements

### Current Implementation Assessment
- **Lines 146–155**: `generateParticles()` generates a flat array of up to 60 particles with basic properties (`x`, `y`, `speed`, `size`, `opacity`).
- **Lines 213–232**: Stage volumetric light beam is drawn using a simple static conical linear gradient (`conicalBeamGrad`).
- **Lines 248–268**: Particle animation loop moves particles upward (`p.y -= riseSpeed`) with horizontal sine sway `Math.sin(p.y * 0.015 + p.size) * 0.4`.
- **Lines 204–206**: Cursor tracking updates `mouseRef.current` with exponential smoothing (`0.05`), but `mouseRef` coordinates are currently **unused** in particle rendering or stage light angle calculation.

### Proposed R1 Backdrop Enhancements

#### A. Multi-Tier Particle System Architecture
Replace single flat particle array with a 3-tiered particle engine:
1. **Tier 1: Micro-Stardust (Background Field)**
   - **Count**: 80–120 particles.
   - **Size**: 0.4px – 1.2px.
   - **Speed**: Slow vertical float (0.05–0.18 px/frame).
   - **Visuals**: Low opacity (0.15–0.4), subtle sinusoidal alpha shimmer (`Math.sin(systemTime * 0.002 + p.phase)`).
2. **Tier 2: Audio-Excited Core Embers (Midground Field)**
   - **Count**: 20–35 particles.
   - **Size**: 1.5px – 3.2px.
   - **Speed**: Dynamic speed governed by `speechVolumeRef.current` (0.2–1.2 px/frame).
   - **Visuals**: Dual-stop radial gradient fill (`ctx.createRadialGradient`) producing a soft glowing aura around each ember.
3. **Tier 3: Interactive Cursor-Reactive Nodes (Foreground Field)**
   - **Count**: 12–18 particles.
   - **Size**: 2.0px – 4.0px.
   - **Behavior**: Responds to cursor proximity with a radial repulsion force vector.

#### B. Volumetric Ambient Beams & Cybernetic Projection Light
1. **Multi-Stage Volumetric Cone**:
   - Primary central spotlight cone with dynamic width scaling based on audio intensity:
     `baseDiameterX = (280 + speechVolumeRef.current * 90) * scale`
   - Pulsing beam intensity: opacity modulates between 0.03 and 0.18 aligned with `speechVolumeRef.current`.
2. **Side-Ambient Laser Scanning Lines**:
   - Add two subtle side-angled light beams flanking the avatar (`centerX - width * 0.35` and `centerX + width * 0.35`).
   - Slowly oscillate beam angles (`Math.sin(systemTime * 0.0008)`) to produce a live stage projection environment.

#### C. Parallax Depth Engine & Cursor Lag Tracking
1. **Spatial Parallax Offset**:
   - Convert normalized `mouseRef.current` (`x: 0.0 .. 1.0`, `y: 0.0 .. 1.0`) to offset coordinates relative to center:
     `offsetX = (mouseRef.current.x - 0.5) * 2`
     `offsetY = (mouseRef.current.y - 0.5) * 2`
   - Shift stage light projection center: `projectorCenterX = centerX + offsetX * 35`.
   - Apply layer-dependent horizontal parallax drift:
     - Tier 1 Particles: `p.x += offsetX * 0.15`
     - Tier 2 Particles: `p.x += offsetX * 0.45`
     - Tier 3 Particles: `p.x += offsetX * 0.85`
2. **Cursor Repulsion Field**:
   - For each Tier 3 particle, calculate distance to cursor:
     `dist = Math.hypot(p.x - mouseCanvasX, p.y - mouseCanvasY)`
   - If `dist < 120px`, apply outward velocity displacement vector:
     `p.x += (p.x - mouseCanvasX) / dist * 1.5`
     `p.y += (p.y - mouseCanvasY) / dist * 1.5`

---

## 3. Item 2: Visualizer State Animations & AudioContext AnalyserNode FFT Data

### State Mapping Matrix
`MyraaCoreVisualizer` receives both `state` (`LiveState`: `"disconnected" | "connecting" | "listening" | "speaking"`) and `characterState` (`"idle" | "thinking" | "talking"`). The visualizer state engine will synthesize these into four distinct visual animation profiles:

| Assistant / Visualizer State | Trigger Condition | Particle Dynamics | Ambient Light & Beams | Audio FFT Source |
|---|---|---|---|---|
| **IDLE** | `state === "listening"` & `characterState === "idle"` (or `"disconnected"`) | Slow float (0.1x speed), gentle horizontal sways. | Soft breathing backlight (0.15 Hz sine pulse). | None / Resting baseline (0.0). |
| **LISTENING** | `state === "listening"` & mic active | Particle velocity and size scale with microphone input volume. | Core beam expands, tightens center focus. | `session.inputAnalyser` (mic PCM stream). |
| **PROCESSING / THINKING** | `characterState === "thinking"` or `state === "connecting"` | Accelerated upward particle speed (2.5x), orbital neural link lines between nearby particles (`dist < 75px`). | Rotating halo ring / scanning line sweep across stage base. | Baseline + synthetic pulse (`Math.sin(systemTime * 0.01)`). |
| **SPEAKING / TALKING** | `state === "speaking"` & `characterState === "talking"` | High excitation, multi-band frequency particle dispersion. | Dynamic backlight flare, avatar border audio glow expansion. | `session.outputAnalyser` (model 24kHz PCM stream). |

### Multi-Band FFT Extraction Engine
Currently (lines 175–195), `MyraaCoreVisualizer` computes a single unweighted average across 64 frequency bins:
`audioLevel = sum / bufferLength`

#### R1 Multi-Band Frequency Decomposition Plan:
Increase FFT size to 256 (`bufferLength = 128`) and split spectrum into three distinct frequency bands:
1. **Low Frequency / Bass (Bins 0–12, ~0–1.5 kHz)**:
   - Measures deep vocal resonance and acoustic punch.
   - **Target Visual**: Drives the outer ambient spotlight radius, video mask drop-shadow blur, and core beam base expansion.
2. **Mid Frequency / Vocals (Bins 13–45, ~1.5–5.5 kHz)**:
   - Measures core vocal formants and speech presence.
   - **Target Visual**: Drives Tier 2 particle upward velocity boost (`riseSpeed = p.speed * (1 + midVolume * 2.4)`) and side laser brightness.
3. **High Frequency / Treble (Bins 46–128, ~5.5–16 kHz)**:
   - Measures sibilance, crispness, and transients.
   - **Target Visual**: Drives Tier 1 micro-stardust alpha flashes and subtle cybernetic glitch line probability.

#### Exponential Smoothing (`speechVolumeRef`)
To prevent visual jitter at high frame rates while retaining responsiveness to sudden voice cues:
```ts
const targetVolume = audioLevel / 255;
speechVolumeRef.current += (targetVolume - speechVolumeRef.current) * 0.15;
```

---

## 4. Item 3: Dual Persona Theme Adaptation (MYRAA vs. Ria)

### Theme Specification Matrix

| Assistant Persona | Primary Core RGB | Secondary Accent RGB | Glow Halo RGB | Tailwind Glass Glow Class |
|---|---|---|---|---|
| **MYRAA** (Cyan / Amber Light Core) | `rgba(6, 182, 212, 1.0)` (Cyan-500) | `rgba(245, 158, 11, 0.85)` (Amber-500) | `rgba(2, 132, 199, 0.70)` (Sky-600) | `shadow-[0_0_40px_rgba(6,182,212,0.35)]` |
| **Ria** (Purple / Rose Light Core) | `rgba(168, 85, 247, 1.0)` (Purple-500) | `rgba(236, 72, 153, 0.85)` (Pink-500) | `rgba(192, 38, 211, 0.70)` (Fuchsia-600) | `shadow-[0_0_40px_rgba(168,85,247,0.35)]` |

### Canvas Color Interpolation Engine
To eliminate harsh visual pops when switching assistants via the top navigation pill in `App.tsx`:
1. Maintain active RGB state references (`currentThemeRGB` and `targetThemeRGB`).
2. Smoothly interpolate RGB color components per frame in the Canvas `render()` loop:
   ```ts
   currentRGB.r += (targetRGB.r - currentRGB.r) * 0.06;
   currentRGB.g += (targetRGB.g - currentRGB.g) * 0.06;
   currentRGB.b += (targetRGB.b - currentRGB.b) * 0.06;
   ```
3. Dynamically construct CSS string representations (`rgba(r, g, b, alpha)`) for `conicalBeamGrad` and particle fill styles.

### Persona Skinning & Asset Resolution Protocol
- Extend props to accept `activeAssistant?: "MYRAA" | "Ria"`.
- Support persona-specific video paths:
  - MYRAA: `/assets/myraa/idle.mp4`, `/assets/myraa/thinking.mp4`, `/assets/myraa/talking.mp4` (with fallback to `/assets/idle.mp4`).
  - Ria: `/assets/ria/idle.mp4`, `/assets/ria/thinking.mp4`, `/assets/ria/talking.mp4` (with fallback to `/assets/idle.mp4`).
- Update outer ambient backlight spot in `MyraaCoreVisualizer.tsx` (lines 291–300) with soft crossfading Framer Motion transitions.

---

## 5. Verification & Implementation Guidance

### Target File Changes
- **Primary File**: `src/components/MyraaCoreVisualizer.tsx`
- **Supporting File**: `src/App.tsx` (ensure `activeAssistant` setting passes cleanly into `MyraaCoreVisualizer`).

### TypeScript Compilation Verification
Run verification check command:
```bash
npx tsc --noEmit
```
Expected output: **Exit Code 0** (No type errors).

---

## 6. Summary of Actionable Implementation Steps for Implementers

1. **Refactor Canvas Particle Engine**: Implement the 3-tiered particle struct and array refs in `MyraaCoreVisualizer.tsx`.
2. **Wire Parallax & Mouse Repulsion**: Connect `mouseRef.current` to particle rendering loop and stage light origin.
3. **Upgrade FFT Audio Processing**: Implement 3-band spectral analysis (Bass, Mid, Treble) from `AnalyserNode` frequency data.
4. **Implement State Animation Profiles**: Map `idle`, `listening`, `thinking`, and `speaking` to distinct backdrop rendering behaviors.
5. **Add Persona RGB Color Interpolator**: Implement linear interpolation for theme transitions between MYRAA (Cyan/Amber) and Ria (Purple/Rose).
