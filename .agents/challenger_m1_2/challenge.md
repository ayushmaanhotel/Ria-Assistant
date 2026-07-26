# Adversarial Challenge Report — Milestone 1 (R1: Cyber-Glass Visualizer)

**Target Component**: `src/components/MyraaCoreVisualizer.tsx`  
**Challenger**: Challenger 2 (Empirical Challenger)  
**Date**: 2026-07-24  

---

## Challenge Summary

**Overall risk assessment**: **MEDIUM**

While `MyraaCoreVisualizer.tsx` passes TypeScript verification (`node node_modules/typescript/bin/tsc --noEmit` with 0 errors) and handles standard audio playback smoothly, empirical stress testing revealed three specific vulnerabilities under edge-case inputs:

1. **Unchecked Radial Gradient Radius on Audio Volume Spikes**: Negative or NaN audio volume ref values cause `createRadialGradient` to throw DOMExceptions (`IndexSizeError` / `TypeError`), crashing the `requestAnimationFrame` loop.
2. **Missing Hard Clamp on Color Interpolation RGB Values**: If `pRGB` or `sRGB` is initialized or corrupted with `NaN` or un-clamped values, color interpolation propagates `NaN` into CSS color strings (`rgba(NaN, NaN, NaN, ...)`).
3. **Particle State Reset on Prop Updates**: Particle field generation is coupled directly to the main `useEffect` dependencies, causing particle positions to jump abruptly whenever any prop (e.g., `state` or `themeColor`) changes.

---

## Challenges

### [HIGH] Challenge 1: Negative and NaN Audio Volume Refs Crash Canvas Render Loop

- **Assumption challenged**: Audio volume ref values (`speechVolumeRef.current`, `bassVolumeRef.current`) will always be non-negative finite numbers between 0 and 1.
- **Attack scenario**: 
  1. Audio stream input contains `NaN` or an unexpected negative spike (e.g. from an audio analyzer initialization anomaly, corrupted audio buffer, or `-Infinity`/negative audio processing output).
  2. In `render()` line 410: `const rad = p.size * s * (1 + speechVolumeRef.current * 0.8);`
     - If `speechVolumeRef.current < -1.25`, `rad * 2` becomes negative (e.g., `-1.96`).
     - If `speechVolumeRef.current` is `NaN`, `rad * 2` becomes `NaN`.
  3. In line 411: `const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2);`
     - Calling `createRadialGradient` with a negative radius throws `DOMException: IndexSizeError` ("The r2 provided is negative").
     - Calling `createRadialGradient` with `NaN` radius throws `TypeError` ("The r2 provided is not finite").
  4. Uncaught exception inside `render()` immediately terminates `requestAnimationFrame`, causing the canvas animation to freeze permanently.
- **Blast radius**: Complete freeze of the living holographic canvas visualizer during audio session state transitions or audio buffer glitches.
- **Mitigation**: Guard audio volume refs with `Math.max(0, Number.isFinite(vol) ? vol : 0)` or clamp `rad` to be strictly non-negative and finite before calling `ctx.createRadialGradient`.

---

### [MEDIUM] Challenge 2: Lack of Hard Bounds/Clamping in RGB Color Interpolation

- **Assumption challenged**: RGB interpolation values (`pRGB.r, g, b` and `sRGB.r, g, b`) are guaranteed to remain finite numbers strictly bounded between 0 and 255.
- **Attack scenario**:
  1. In line 249-255: `pRGB.r += (targetColors.primary.r - pRGB.r) * 0.06;`
  2. If `pRGB` or `sRGB` receives `NaN` (or an out-of-range floating point value from an unhandled theme edge case), lerping does not recover: `NaN += ...` remains `NaN`.
  3. Line 257: `const primaryCSS = \`rgba(\${Math.round(pRGB.r)}, \${Math.round(pRGB.g)}, \${Math.round(pRGB.b)}\`;`
     - Produces invalid CSS string `"rgba(NaN, NaN, NaN"`.
  4. When assigned to `ctx.fillStyle` or used in `ctx.createLinearGradient`, Canvas 2D ignores invalid colors or fails color parsing.
  5. Furthermore, `primaryCSS` relies on implicit string prefix formatting (`"rgba(r, g, b"`) which relies on callers adding `, alpha)` correctly.
- **Blast radius**: Visual render failure (invisible particle beam or stardust) if color state becomes corrupted.
- **Mitigation**: Wrap RGB interpolation outputs with explicit clamping: `Math.max(0, Math.min(255, Math.round(val)))` and default `NaN` values to cyan/amber defaults (`r: 6, g: 182, b: 212`).

---

### [LOW] Challenge 3: Particle Reset Visual Snap on Prop Updates

- **Assumption challenged**: Prop updates (`state`, `themeColor`, `characterState`, `activeAssistant`) should update visual themes smoothly without interrupting particle field continuity.
- **Attack scenario**:
  1. User toggles assistant from `MYRAA` to `Ria`, or system transitions state from `idle` to `listening`.
  2. The primary `useEffect` hook (lines 163-461) re-runs because `[session, state, themeColor, activeEmotion, characterState, activeAssistant]` are in the dependency array.
  3. Re-running the effect calls `generateParticles()` (line 227), completely re-initializing all 130 particles with random new `(x, y)` coordinates.
  4. The background stardust field visibly snaps/flickers to new random positions instead of maintaining fluid continuous motion.
- **Blast radius**: Minor UI visual artifact (particle position jump on state change).
- **Mitigation**: Decouple particle initialization (`generateParticles()`) into a separate `useEffect` or persist particle positions in `particlesRef` across theme/state prop updates.

---

## Stress Test Results

| Test Scenario / Edge Case | Input / Condition | Expected Behavior | Actual Behavior | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| **TypeScript Compilation** | `node node_modules/typescript/bin/tsc --noEmit` | Clean build with 0 type errors | 0 errors | **PASS** |
| **Null/Undefined Audio Session** | `session = null` or `session = undefined` | Graceful fallback to raw volume = 0 | Raw volume falls back to 0, no exception | **PASS** |
| **FFT Analyser Exception** | `getByteFrequencyData` throws (closed context) | Caught by `try-catch` block, decay to 0 | Caught cleanly, no crash | **PASS** |
| **Audio Volume Ref = 0** | `bassVol = 0, speechVol = 0` | Base diameter = 280*s, rad = p.size*s | Renders correctly | **PASS** |
| **Audio Volume Ref = 1.0** | `bassVol = 1.0, speechVol = 1.0` | Expanded beam (390*s), rad = p.size*s*1.8 | Renders correctly | **PASS** |
| **Audio Volume Ref = NaN** | `bassVolumeRef.current = NaN` | Bounded fallback value | Throws canvas error: `Canvas moveTo received non-finite values (NaN)` | **FAIL** |
| **Negative Audio Volume Spike** | `speechVolumeRef.current = -2.0` | Radius clamped to >= 0 | Throws `createRadialGradient received negative radius: r1=-1.96` | **FAIL** |
| **Canvas Container 0x0 Size** | `width = 0, height = 0` (hidden component) | `baseScale` clamped to 0.95, no crash | Scale clamped to 0.95, no crash | **PASS** |
| **Tab Switch / Time Delta Jump** | `systemTime` jumps +60,000ms after tab switch | `Math.sin(systemTime)` remains bounded [-1, 1] | Bounded within [-1, 1], animation resumes smoothly | **PASS** |
| **Theme Color Clamping** | All 7 themes + unrecognized theme strings | RGB mapped strictly to [0, 255] | Clamped correctly to target RGB | **PASS** |
| **Corrupted RGB NaN State** | `pRGB.r = NaN` | Clamped fallback to valid RGB integer | Formats `"rgba(NaN, NaN, NaN"` invalid CSS color | **FAIL** |
| **Prop State Change (Continuous)** | `state` changes from `"idle"` to `"speaking"` | Smooth particle transition | Particles re-generated, causing position snap | **FAIL** |

---

## Unchallenged Areas

- **HTML5 Video Element Autoplay & Error Overlay**: Verified `handleVideoError` triggers `hasError = true` fallback UI when asset files are missing.
- **Mouse Parallax Motion**: Verified `targetMouseRef` and `mouseRef` lag tracking uses bounded lerp factor `0.05`.
