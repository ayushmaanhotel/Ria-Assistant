## 2026-07-24T12:33:49Z
<USER_REQUEST>
You are Worker subagent assigned to apply defensive hardening fixes for Milestone 1 (R1 Cyber-Glass UI & Assistant Selector).

Working directory: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/worker_m1_2
Project root: c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Task:
1. Fix Visualizer audio ref & canvas edge cases in `src/components/MyraaCoreVisualizer.tsx`:
   - Clamp `speechVolumeRef.current` values defensively (`const vol = Math.max(0, isFinite(speechVolumeRef.current) ? speechVolumeRef.current : 0)`).
   - Ensure radial gradient radii passed to `ctx.createRadialGradient` are strictly positive (`Math.max(0.1, radius)`) and non-NaN to prevent `IndexSizeError` canvas crashes.
   - Guard RGB lerp values so color strings are always valid `rgba(r,g,b,a)`.
   - Prevent stardust particle array recreation flicker on simple prop updates by preserving particles array or keying appropriately.
2. Fix App.tsx layout overflow and state toggle race conditions in `src/App.tsx`:
   - Add `reconnectTimeoutRef` to cancel existing uncancelled `setTimeout` timers in `handleAssistantSwitch` when toggling assistants rapidly.
   - Cap `#cinematic-subtitles` with `max-h-[8rem] overflow-y-auto glass-scrollbar` to prevent expanding subtitle text from pushing layout off-screen.
3. Fix CSS utilities in `src/index.css`:
   - Add `.no-scrollbar` utility class (`scrollbar-width: none; -ms-overflow-style: none; ::-webkit-scrollbar { display: none; }`).
4. Run verification: `node node_modules/typescript/bin/tsc --noEmit` using `run_command` in `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant` and confirm 0 errors.
5. Document all changes and verification in `c:/Users/ayush/OneDrive/Documents/MYRAA/myraa-ai-assistant/.agents/worker_m1_2/changes.md` and `handoff.md`.
6. Send completion report back to parent orchestrator via `send_message`.
</USER_REQUEST>
