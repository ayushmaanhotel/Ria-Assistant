# Changes Summary — Defensive Hardening for Milestone 1

## Modified Files

### 1. `src/components/MyraaCoreVisualizer.tsx`
- **Audio Ref Clamping & Fallbacks**:
  - Guarded `speechVolumeRef.current`, `bassVolumeRef.current`, `midVolumeRef.current`, `trebleVolumeRef.current` against `NaN`, `Infinity`, or negative values.
  - Clamped `speechVolumeRef.current` using `Math.max(0, isFinite(speechVolumeRef.current) ? speechVolumeRef.current : 0)`.
- **Canvas Radial Gradient Protection**:
  - Ensured outer radius passed to `ctx.createRadialGradient` is non-NaN and strictly positive: `Math.max(0.1, isFinite(rad * 2) ? rad * 2 : 0.1)`. This prevents `IndexSizeError` canvas render loop crashes.
- **RGB Interpolation & Alpha Formatting Guards**:
  - Added `lerpChannel` and `safeAlpha` functions to strictly constrain RGB channels to `[0, 255]` integers and alpha transparency values to `[0, 1]`.
- **Stardust Particle Array Preservation**:
  - Checked `particlesRef.current.length === 0` before calling `generateParticles()` in `useEffect`. Particles are preserved during simple prop and state updates (e.g. `session`, `state`, `themeColor`, `activeEmotion`, `characterState`, `activeAssistant`), preventing particle position jump/flicker.

### 2. `src/App.tsx`
- **State Toggle Race Condition Guard**:
  - Added `reconnectTimeoutRef` (`useRef<NodeJS.Timeout | number | null>(null)`).
  - Cleared active timeouts in `handleAssistantSwitch` before setting new reconnect timers to prevent race conditions during rapid assistant toggles (MYRAA / RIA).
  - Ensured timeout reference is cleared on unmount.
- **Subtitle Layout Overflow Cap**:
  - Added `max-h-[8rem] overflow-y-auto glass-scrollbar` to `#cinematic-subtitles` container to prevent expanding subtitle text from pushing layout off-screen.

### 3. `src/index.css`
- **CSS Utility Addition**:
  - Added `.no-scrollbar` utility class for hiding scrollbars across all modern engines (`scrollbar-width: none; -ms-overflow-style: none; ::-webkit-scrollbar { display: none; }`).

## Verification Results
- Executed command: `node node_modules/typescript/bin/tsc --noEmit`
- Result: Completed successfully with 0 errors.
