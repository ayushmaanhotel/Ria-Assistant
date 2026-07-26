# Milestone 3 (R3: GenUI & Telemetry Panels) — Adversarial Challenge Report

## Challenge Summary

**Overall risk assessment**: **MEDIUM-HIGH**

While TypeScript compilation succeeds cleanly (`npx tsc --noEmit` passes with 0 errors), empirical stress testing of the Milestone 3 interactive GenUI & Telemetry components (`SystemTelemetry.tsx`, `CodeDiffEditor.tsx`, `CommandLauncher.tsx`) revealed **6 specific functional bugs and edge-case resilience flaws**, including SVG rendering corruption (`NaN` points), metric NaN state propagation, visual side-by-side diff row misalignment, in-flight fetch state update leaks on modal close/unmount, and unhandled clipboard API calls.

---

## TypeScript Compilation & Build Check

- **Command**: `node node_modules/typescript/bin/tsc --noEmit`
- **Result**: **PASS** (0 errors).
- **Assessment**: Syntax and type signatures satisfy TypeScript constraints.

---

## Challenges & Flaw Details

### [HIGH] Challenge 1: `SystemTelemetry.tsx` — SVG Sparkline NaN Render & State Degradation
- **Assumption challenged**: Assumed `data` passed to `renderSparkline` always has length ≥ 2 and contains strictly valid numeric values.
- **Attack scenario**:
  1. When history array `data` has length 1 (e.g. initial single data point), `data.length - 1` evaluates to `0`. `idx / 0` produces `NaN`, resulting in SVG attribute `points="NaN,18"`.
  2. If any telemetry metric (`cpuPercent`, `ramPercent`, etc.) becomes `NaN` or `undefined` (e.g. from missing API properties or calculation error), `prev.cpuPercent + cpuNoise` yields `NaN`. All future updates permanently corrupt the state to `NaN`.
- **Blast radius**: Broken SVG layout in UI, invisible sparklines, `NaN%` displayed across telemetry metric cards.
- **Mitigation**:
  - In `renderSparkline`: Add guard `const denominator = data.length > 1 ? data.length - 1 : 1;` and clamp values with `Number.isFinite(val) ? val : 0`.
  - In telemetry state update: Clamp calculated values using `Math.max(min, Math.min(max, Number.isFinite(val) ? val : defaultVal))`.

### [MEDIUM] Challenge 2: `SystemTelemetry.tsx` — In-Flight Polling & Manual Refresh Memory Leak
- **Assumption challenged**: Assumed modal remains open until all async HTTP operations and timeout callbacks complete.
- **Attack scenario**:
  1. `fetchTelemetry()` fires an async `fetch("/api/agent-health")`. If `isOpen` changes to `false` or component unmounts while fetch is pending, the resolved promise calls `setTelemetry` on the closed/unmounted component.
  2. In `handleManualRefresh`, `setTimeout(() => setIsRefreshing(false), 500)` runs without cleanup reference or unmount guard.
- **Blast radius**: React unmounted state update warning, memory leaks, background state updates on hidden components.
- **Mitigation**:
  - Use `AbortController` or an `isMounted` flag inside `useEffect` to cancel/ignore fetch responses if `isOpen` is `false` or component unmounted.
  - Store timer reference for `handleManualRefresh` and clear it on unmount.

### [MEDIUM] Challenge 3: `CodeDiffEditor.tsx` — Side-by-Side Split View Row Misalignment
- **Assumption challenged**: Assumed mapping `originalCode.split()` in left column and `modifiedCode.split()` in right column would align corresponding lines.
- **Attack scenario**:
  - When lines are deleted from original or added to modified, the left and right columns have different row counts. Unchanged lines below the diff shift out of vertical alignment (e.g., Row 2 on left shows line deleted, Row 2 on right shows line 3 of modified code).
- **Blast radius**: Misleading side-by-side diff presentation where unmodified lines fail to align horizontally across columns.
- **Mitigation**:
  - Construct a unified dual-column line table from the LCS diff result, inserting empty spacer rows (`<div className="h-6 opacity-0" />`) on either left or right side whenever a line is added or removed.

### [MEDIUM] Challenge 4: `CodeDiffEditor.tsx` — Unsafe Clipboard API Call & False Positive Apply Feedback
- **Assumption challenged**: Assumed `navigator.clipboard` is always defined and `onApply` callback is always provided.
- **Attack scenario**:
  1. In non-secure HTTP contexts or WebViews without clipboard permissions, `navigator.clipboard` is `undefined`. Clicking "Copy Raw Diff" throws `TypeError: Cannot read properties of undefined (reading 'writeText')`.
  2. When `onApply` prop is omitted, clicking "Apply Changes" still displays "Patch Applied!" and closes the modal after 1 second, implying success to the user when no change was committed.
- **Blast radius**: App crash on copy, silent failure of patch application when `onApply` is missing.
- **Mitigation**:
  - Add optional chaining/fallback: `if (navigator?.clipboard?.writeText) { ... } else { fallbackCopyTextToClipboard(formattedDiff); }`.
  - Disable or hide the "Apply Changes" button if `onApply` is undefined, or log a warning.

### [LOW] Challenge 5: `CodeDiffEditor.tsx` — Empty String Diff Edge Case
- **Assumption challenged**: Assumed `"".split(/\r?\n/)` returns an empty array `[]`.
- **Attack scenario**:
  - `"".split(/\r?\n/)` yields `[""]` (an array containing 1 empty string). Replacing an empty file `""` with `"const x = 1;"` calculates 1 deletion (of `""`) and 1 addition (of `"const x = 1;"`), reporting `+1 additions, -1 deletions`.
- **Blast radius**: Slightly skewed diff metrics (`+1 additions, -1 deletions` instead of `+1 additions, -0 deletions`) when operating on empty strings.
- **Mitigation**:
  - Normalize empty input strings before split: `const oldLines = originalCode === "" ? [] : originalCode.split(/\r?\n/);`.

### [LOW] Challenge 6: `CommandLauncher.tsx` — Zero-Match `scrollIntoView` Targeting
- **Assumption challenged**: Assumed `listRef.current.children[selectedIndex]` always targets an action item element.
- **Attack scenario**:
  - When `filteredActions.length === 0`, `listRef.current.children` contains 1 element: the empty state message (`"No matching quick actions found..."`). `selectedIndex` (0) targets this empty message element and calls `scrollIntoView` on it.
- **Blast radius**: Minor harmless DOM invocation on empty state container.
- **Mitigation**:
  - Add guard: `if (filteredActions.length > 0 && selectedEl) selectedEl.scrollIntoView(...)`.

---

## Stress Test Results

| Component | Scenario | Expected Behavior | Actual Behavior | Pass/Fail |
|---|---|---|---|---|
| `SystemTelemetry.tsx` | Single metric history item `[50]` in sparkline | Render clean SVG path | `points="NaN,18"` (Division by zero) | ❌ FAIL |
| `SystemTelemetry.tsx` | Metric value receives `NaN`/`undefined` | Clamp to 0/default and remain finite | State permanently degrades to `NaN` | ❌ FAIL |
| `SystemTelemetry.tsx` | Modal closed while fetch pending | Abort fetch / ignore response | State update called on closed/unmounted component | ❌ FAIL |
| `SystemTelemetry.tsx` | Manual refresh 500ms timeout during unmount | Timer cancelled on unmount | `setIsRefreshing(false)` called after unmount | ❌ FAIL |
| `CodeDiffEditor.tsx` | Side-by-side view with inserted/deleted lines | Left & right unchanged lines align horizontally | Lines shift vertically out of alignment | ❌ FAIL |
| `CodeDiffEditor.tsx` | Copy diff in HTTP / guarded environment | Safe fallback or graceful handle | Throws `TypeError: Cannot read properties of undefined` | ❌ FAIL |
| `CodeDiffEditor.tsx` | Diff between `""` and `"hello"` | 1 addition, 0 deletions | 1 addition, 1 deletion (empty line counted as deletion) | ❌ FAIL |
| `CommandLauncher.tsx` | Rapid search typing ("r" -> "ria" -> "xyz") | Fast filter & index reset to 0 | Index resets cleanly, 0 matches handled | ✅ PASS |
| `CommandLauncher.tsx` | Key nav with 0 matches (Enter/Arrow keys) | Ignore selection, allow Escape | Enter ignored, Escape closes modal | ✅ PASS |
| `CommandLauncher.tsx` | Modulo index wrapping (ArrowDown/Up) | Wrap around 0..N-1 cleanly | Wraps cleanly between top and bottom items | ✅ PASS |
| TypeScript Check | `node node_modules/typescript/bin/tsc --noEmit` | Exit code 0 with 0 errors | Exit code 0, 0 errors | ✅ PASS |

---

## Unchallenged Areas

- **CSS Tailwind v4 Layout Details**: Out of scope for empirical functional logic testing; relied on visual inspection of class structures.
