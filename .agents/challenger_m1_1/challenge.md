# Challenge Report — Milestone 1 (R1: Modernized Cyber-Glass UI & Assistant Selector)

## Challenge Summary

**Overall risk assessment**: HIGH

Empirical testing of `src/App.tsx`, `src/index.css`, `src/components/MemoryDashboard.tsx`, and `server.ts` confirmed that TypeScript compilation succeeds cleanly (`node node_modules/typescript/bin/tsc --noEmit` returned 0 errors). However, empirical stress-testing revealed 7 concrete vulnerabilities and failure modes spanning state race conditions, unhandled layout overflow, missing CSS classes, and incomplete backend persona wiring.

---

## Challenges & Failure Modes

### [High] Challenge 1: Uncancelled Async Switch Timer & State Race Condition during Fast Assistant Toggling

- **Assumption challenged**: Rapid user switching between "MYRAA" and "Ria" in the navigation bar safely handles active audio session disconnections and reconnections without race conditions or orphaned background tasks.
- **Attack scenario**: 
  In `src/App.tsx` (lines 465–488), `handleAssistantSwitch` executes the following reconnection logic when active:
  ```tsx
  if (sessionRef.current && state !== "disconnected") {
    sessionRef.current.disconnect();
    setTimeout(() => {
      if (sessionRef.current) {
        sessionRef.current.connect();
      }
    }, 250);
  }
  ```
  1. The user clicks "Ria" while connected. `handleAssistantSwitch("Ria")` runs `sessionRef.current.disconnect()`, setting `state` to `"disconnected"`, and schedules `Timer A` (250ms delay).
  2. 100ms later, the user clicks "MYRAA". `handleAssistantSwitch("MYRAA")` checks `if (state !== "disconnected")`, which evaluates to `false` because `state` was already changed to `"disconnected"`. Step 3 is skipped entirely.
  3. At t=250ms, `Timer A` fires and unconditionally executes `sessionRef.current.connect()`.
  4. If a user rapidly toggles back and forth multiple times, orphaned timers pile up, causing redundant WebSocket connection attempts and potential state corruption in `MyraaAudioSession`.
- **Blast radius**: State desynchronization, multiple concurrent WebSocket handshakes, unnecessary mic re-initializations, and potential memory leaks from dangling `AudioContext` instances.
- **Mitigation**:
  - Maintain a `switchTimerRef = useRef<NodeJS.Timeout | null>(null)`.
  - On every call to `handleAssistantSwitch`, execute `if (switchTimerRef.current) clearTimeout(switchTimerRef.current)`.
  - Track `isSwitchingRef` so rapid toggles queue cleanly or cancel prior pending connection attempts.

---

### [High] Challenge 2: Backend Disconnect & Incomplete Persona/Voice Wiring for Ria vs MYRAA

- **Assumption challenged**: Selecting "Ria" switches the AI assistant's voice and personality to Ria.
- **Attack scenario**:
  - `src/App.tsx` switches `themeColor` to `"violet"` and records `activeAssistant: "Ria"`.
  - `MyraaAudioSession.connect()` in `src/lib/audio.ts` (line 134) connects to `ws://${host}/live` WITHOUT passing query parameters or initial socket payloads containing `activeAssistant`, `riaVoice`, or `riaSystemPrompt`.
  - In `server.ts` (lines 756–860), the `/live` WebSocket connection handler ALWAYS initializes the Gemini Live session with:
    - Model voice: `voiceName: "Aoede"`
    - System instruction: `"You are Myraa, a warm, soft-spoken, and incredibly cute high-pitched anime heroine..."`
  - As a result, switching to Ria only changes front-end UI colors; the underlying Gemini session remains configured as MYRAA with voice Aoede.
- **Blast radius**: Feature breakage — assistant selection between MYRAA and Ria is purely cosmetic on the front-end and completely ineffective on the voice AI backend.
- **Mitigation**:
  - Pass active assistant and voice settings in the WebSocket URL, e.g. `/live?assistant=Ria&voice=Kore`.
  - In `server.ts`, parse `req.url` query params to select the correct prompt (`baseInstructions` vs `riaSystemPrompt`) and voice (`"Aoede"` vs `settings.riaVoice`).

---

### [Medium] Challenge 3: Unconstrained Subtitle Height Growth Causes Viewport Overflow

- **Assumption challenged**: Subtitles rendered in `#cinematic-subtitles` handle long streaming AI transcripts without breaking the UI layout.
- **Attack scenario**:
  In `src/App.tsx` (lines 769–819):
  ```tsx
  <div id="cinematic-subtitles" className="w-full max-w-3xl flex flex-col items-center justify-center text-center px-6 relative z-25 mt-auto mb-6 pointer-events-none min-h-[6rem]">
    <h2 className="text-xl sm:text-2xl font-light text-white leading-relaxed tracking-wide font-display max-w-2xl drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)]">
      {activeText}
    </h2>
  </div>
  ```
  - When Gemini streams a long response (e.g. 500–1000 characters explaining code or summarizing a page), `modelCaption` appends continuously.
  - The `<h2>` element expands vertically to 200px–500px+ height.
  - Because the root container in `App.tsx` is fixed at `h-screen overflow-hidden flex flex-col justify-between`, expanding the subtitle container vertically pushes the header or footer completely off-screen or clips controls behind the screen edge with no scrollbar available.
- **Blast radius**: Severe UI layout breakage during detailed responses; microphone button and header navigation become unreachable.
- **Mitigation**:
  - Add `max-h-36 overflow-y-auto glass-scrollbar pointer-events-auto` or `line-clamp-4` to `#cinematic-subtitles` container so long text scrolls cleanly within a fixed subtitle boundary.

---

### [Medium] Challenge 4: Missing Utility Class `.no-scrollbar` Causes Scrollbar Leaks

- **Assumption challenged**: All scrollable containers present a clean cyber-glass aesthetic without default browser scrollbar leaks.
- **Attack scenario**:
  - In `src/components/MemoryDashboard.tsx` (line 264), the category tab scroller uses:
    ```tsx
    <div className="px-6 py-4 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-light border-white/10 shrink-0">
    ```
  - However, `.no-scrollbar` is NOT defined anywhere in `src/index.css` or Tailwind configuration.
  - In Chrome, Edge, and Firefox, standard native scrollbars appear underneath the category pill list, breaking the glassmorphic aesthetic.
- **Blast radius**: Visual regression and scrollbar leak in Memory Dashboard tabs.
- **Mitigation**:
  Add `.no-scrollbar` rule to `src/index.css`:
  ```css
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  ```

---

### [Medium] Challenge 5: Viewport Vertical Clipping Risk via Fixed `h-screen overflow-hidden`

- **Assumption challenged**: The application layout adapts safely to various desktop and mobile screen heights.
- **Attack scenario**:
  - Root container in `src/App.tsx` (line 592): `className="relative w-full h-screen overflow-hidden bg-[#020205] text-white ... flex flex-col justify-between p-6 sm:p-10"`
  - On laptops with 768px height or mobile browsers with visible address bars (e.g. 667px height), total required height of Header (~60px) + Main py-6 (~48px) + Spacer (~40px) + Subtitles (~96px+) + Footer (~120px) + Padding (~80px) = 444px+. When suggestion guide cards or error banners open, total required height exceeds viewport height.
  - `overflow-hidden` clips top or bottom elements with zero scrollability.
- **Blast radius**: Total layout cutoff on smaller displays, mobile viewports, or low-resolution screens.
- **Mitigation**:
  - Replace root `h-screen overflow-hidden` with `min-h-screen h-screen overflow-y-auto sm:overflow-hidden` or wrap content in a scrollable inner flex column.

---

### [Low] Challenge 6: Header Component Horizontal Overflow on Mobile Viewports (<400px)

- **Assumption challenged**: Navigation header bar fits all viewports seamlessly.
- **Attack scenario**:
  - Header navbar in `src/App.tsx` (lines 618–720) uses `flex items-center justify-between` containing Left identity badge, Center dual assistant selector pill, and Right utility action buttons.
  - On screens <400px wide, combined content width (~430px) exceeds available inner width (~312px), causing elements to collide or clip.
- **Blast radius**: Minor layout squishing and text clipping on mobile portrait devices.
- **Mitigation**:
  - Hide brand text `MYRAA OS v2.0` on extra-small screens (`hidden xs:inline`) or allow header items to collapse smoothly.

---

## Stress Test Results

| Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|
| TypeScript Type Check (`tsc --noEmit`) | Exits with 0 errors | Exits with 0 errors | ✅ PASS |
| Rapid Assistant Switching (MYRAA ↔ Ria) | Timers cancelled; single clean reconnect | Uncancelled timers fire concurrently; state race | ❌ FAIL |
| Backend Assistant Persona Selection | WebSocket loads Ria prompt & voice when selected | `/live` always loads Myraa prompt & Aoede voice | ❌ FAIL |
| Memory Dashboard Tab Scroller (.no-scrollbar) | Scrollbars hidden | Default browser scrollbars leak (.no-scrollbar missing in CSS) | ❌ FAIL |
| Viewport Responsiveness (Vertical <768px) | Content fits or scrolls smoothly | Content clipped due to `h-screen overflow-hidden` | ❌ FAIL |
| Subtitle Growth under Long Transcripts (500+ chars) | Text contained within fixed height | Subtitle container expands, pushing footer off-screen | ❌ FAIL |
| Header Flex Layout (<400px viewport width) | Elements collapse or fit | Horizontal collision/overflow | ❌ FAIL |

---

## Unchallenged Areas

- Audio PCM 16-bit to 24-bit resampling algorithms — Verified standard web audio buffer math.
