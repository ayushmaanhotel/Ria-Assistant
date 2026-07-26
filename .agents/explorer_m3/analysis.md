# Milestone 3 (R3) Comprehensive Architecture & Implementation Analysis

## Executive Summary
This report presents the complete codebase audit, gap analysis, and architectural plan for **Milestone 3 (R3: Enhanced Interactive GenUI & Telemetry Panels)** of the MYRAA Desktop AI Assistant.

The investigation examined all core files in `src/` (`App.tsx`, `components/`, `lib/`), backend endpoints in `server.ts`, Python desktop agent tools in `desktop_agent/`, and current TypeScript build status.

---

## 1. Current Codebase State & Gap Identification

### Summary of Component Inventory
- **Existing Components in `src/components/`**:
  1. `ApiKeyGate.tsx`: Modal gate for initial Gemini API Key entry.
  2. `BrowserAgent.tsx`: Holographic website browser projector canvas.
  3. `HolographicProjector.tsx`: Web page projector view overlay.
  4. `MemoryDashboard.tsx`: Persistent memories slide-over drawer (lacks text search filter).
  5. `MyraaCoreVisualizer.tsx`: 3D canvas / particle audio state visualizer.
  6. `SettingsPanel.tsx`: Configuration drawer for wake word, personas, auto-start, and system settings.

### Identified Missing Components & Endpoints (R3 Scope)
1. **Live System Telemetry Panel (`src/components/SystemTelemetry.tsx`)** — *MISSING*
   - Needs live polling of CPU, RAM, GPU, and Python agent health metrics from `http://localhost:8765/health` / `/api/agent-health` or desktop tool execution.
   - Must provide smooth mock/fallback simulated telemetry data when offline.
   - Requires glass visual panel with progress gauges, metrics cards, and historical sparklines.

2. **Code Diff Reviewer (`src/components/CodeDiffEditor.tsx`)** — *MISSING*
   - Needs side-by-side or inline code diff visualization.
   - Must support syntax-highlighted glass aesthetic, addition (+N green glow) / deletion (-M red glow) counters, copy diff, and apply changes handlers.

3. **Quick Action Command Launcher Modal (`src/components/CommandLauncher.tsx`)** — *MISSING*
   - Needs a `Ctrl+K` / `Cmd+K` global keyboard shortcut triggered command palette and top navigation bar trigger (`<Zap />`).
   - Must include search filtering, keyboard navigation (Up/Down/Enter/Esc), and categorized quick actions (Persona switching, Telemetry, Diff, Memories, Screen Vision, Settings, Audio Engine controls).

4. **Interactive Memory Dashboard Enhancements (`src/components/MemoryDashboard.tsx`)** — *EXISTING (NEEDS R3 ENHANCEMENTS)*
   - Current implementation supports category tabs and manual addition/deletion.
   - Needs a real-time **text search filter** (`searchQuery`) to search across stored memories, facts, and conversation history.
   - Needs memory count stats breakdown banner and memory core sync state indicators.

5. **Defensive JSON Validation for `/api/ria-config` in `server.ts`** — *NEEDS HARDENING*
   - Current `/api/ria-config` endpoint (lines 349-388 of `server.ts`) handles JSON parse errors with a `400` status, but fails to check if `parsed` is a non-null object.
   - If `content` is `"null"`, `"[1, 2, 3]"`, `"123"`, or `"true"`, `JSON.parse` succeeds, causing runtime `TypeError` exceptions (`500 Internal Server Error`) instead of a graceful `400 Bad Request`.

6. **UI Integration in `src/App.tsx`** — *NEEDS WIRING*
   - Needs state handlers (`showTelemetry`, `showCodeDiff`, `showCommandLauncher`).
   - Needs global `Ctrl+K` keyboard event listener.
   - Needs top navigation bar buttons for **Telemetry**, **Diff**, and **Command Launcher**.

---

## 2. Detailed Technical Specifications & Component Designs

### Component A: `src/components/SystemTelemetry.tsx`
- **File Location**: `src/components/SystemTelemetry.tsx`
- **Props**:
  ```typescript
  interface SystemTelemetryProps {
    isOpen: boolean;
    onClose: () => void;
    themeColor: string;
  }
  ```
- **Key Features**:
  - **Polling Cycle**: 2-second interval polling `/api/agent-health` and local metrics or generating graceful fallback telemetry when offline.
  - **Metrics Displayed**:
    - **CPU**: Utilization %, Physical Cores, Logical Threads, live sparkline history.
    - **RAM**: Usage %, Used GB / Total GB, available memory.
    - **GPU & VRAM**: GPU Utilization %, VRAM Used / Total, GPU Temperature (°C) or N/A fallback when no NVIDIA GPU is detected.
    - **Python Agent Health**: Connection Status (Online / Offline), Tool Count (52 tools), Endpoint (`http://127.0.0.1:8765`), Ping Latency (ms).
  - **Glass Aesthetic**: Glass panel backdrop blur, cyber-pill badges, glowing progress bars with theme colors (cyan/purple/emerald).

### Component B: `src/components/CodeDiffEditor.tsx`
- **File Location**: `src/components/CodeDiffEditor.tsx`
- **Props**:
  ```typescript
  interface CodeDiffEditorProps {
    isOpen: boolean;
    onClose: () => void;
    originalCode?: string;
    modifiedCode?: string;
    filename?: string;
    themeColor: string;
    onApply?: (newCode: string) => void;
  }
  ```
- **Key Features**:
  - **View Modes**: Toggle between **Side-by-Side** (two columns) and **Inline** (unified list).
  - **Diff Calculation**: Line-by-line comparison computing added (`+`), deleted (`-`), and modified lines.
  - **Metadata Header**: Filename badge, total additions count (`+N`), total deletions count (`-M`), line change ratio.
  - **User Actions**: "Copy Diff" to clipboard with feedback tooltip, "Apply Code" callback trigger, view switcher tab bar.
  - **Styling**: Monospace font (`font-mono`), green line highlighting (`bg-emerald-500/15 text-emerald-300`), red line highlighting (`bg-rose-500/15 text-rose-300`), glass modal container.

### Component C: `src/components/CommandLauncher.tsx`
- **File Location**: `src/components/CommandLauncher.tsx`
- **Props**:
  ```typescript
  interface CommandLauncherProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectAction: (actionId: string) => void;
    themeColor: string;
  }
  ```
- **Key Features**:
  - **Shortcut Listener**: Global `Ctrl+K` / `Cmd+K` listener in `App.tsx` toggles state `showCommandLauncher`.
  - **Interactive Search**: Auto-focused search input filtering quick actions dynamically.
  - **Keyboard Navigation**: `ArrowUp`, `ArrowDown` to change highlighted index, `Enter` to invoke selected action, `Esc` to close.
  - **Action Catalog**:
    - *Persona*: Switch to MYRAA, Switch to Ria, Set Atmosphere Theme (Violet, Crimson, Emerald, Celestial, Gold, Charcoal).
    - *Panels*: Open System Telemetry, Open Code Diff Reviewer, Open Memory Dashboard, Open Settings Panel, Toggle Screen Vision.
    - *Controls*: Connect Live Audio Session, Clear Subtitles, Toggle Playful Guide.
  - **Glass Design**: Backdrop blur, category section headers, action icons, keyboard shortcut indicators (`Ctrl+K`).

### Component D: `src/components/MemoryDashboard.tsx` (R3 Enhancements)
- **Modifications**:
  - Add state `searchQuery: string`.
  - Add real-time search input bar with search icon `<Search size={14} />` and clear button.
  - Filter memories using both `activeTab` and `searchQuery`:
    ```typescript
    const filteredMemories = memories.filter((m) => {
      const matchesTab = activeTab === "all" || m.category === activeTab;
      const matchesSearch = !searchQuery.trim() || m.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
    ```
  - Add Memory Core Overview badge stats banner showing total memories count, active category breakdown, and memory database storage status.

### Component E: `server.ts` `/api/ria-config` Defensive JSON Validation
- **Location**: Lines 349-388 of `server.ts`.
- **Patch**:
  ```typescript
  const content = fs.readFileSync(resolved, "utf-8");
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e: any) {
    return res.status(400).json({ ok: false, valid: false, error: `Invalid JSON format: ${e.message}` });
  }

  // Defensive JSON type check for non-object, null, or array payloads
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return res.status(400).json({
      ok: false,
      valid: false,
      error: "Configuration payload must be a non-null JSON object."
    });
  }
  ```

---

## 3. Build & Type Checking Verification

- **Current TypeScript Build Status**:
  Executed `cmd /c "npx tsc --noEmit"`:
  ```
  npm notice run myraa@1.0.0 npx
  npm notice run tsc --noEmit
  Exit Code: 0 (SUCCESS)
  ```
  The current codebase compiles cleanly without any TypeScript errors. All new components must adhere strictly to React 19 and TypeScript ~5.8 types to maintain clean compilation.

---

## 4. Proposed File Creation & Modification Plan

| Action | Target File | Description |
|---|---|---|
| **CREATE** | `src/components/SystemTelemetry.tsx` | Live CPU, RAM, GPU, Python agent health panel component with mock fallback. |
| **CREATE** | `src/components/CodeDiffEditor.tsx` | Side-by-side & inline code diff reviewer component with glass design. |
| **CREATE** | `src/components/CommandLauncher.tsx` | Quick Action Palette with `Ctrl+K` shortcut support & action catalog. |
| **MODIFY** | `src/components/MemoryDashboard.tsx` | Add text search input filter & memory stats overview. |
| **MODIFY** | `server.ts` | Add defensive JSON object/null/array validation in `/api/ria-config`. |
| **MODIFY** | `src/App.tsx` | Integrate top navigation bar buttons, state management, and `Ctrl+K` listener for the 3 new components. |

---

## 5. Verification Checklist for Implementer

1. **Type Safety**: Run `cmd /c "npx tsc --noEmit"` and verify zero errors.
2. **Telemetry Test**: Click `TELEMETRY` header button -> verify Live Telemetry panel opens, metrics update every 2s, and fallback works when agent is offline.
3. **Diff Reviewer Test**: Click `DIFF` header button -> verify side-by-side and inline view modes toggle cleanly with line numbers, green/red line highlights, and copy action.
4. **Command Palette Test**: Press `Ctrl+K` or click `LAUNCH` header button -> verify command launcher opens, search filter works, arrow key navigation works, and action triggers function.
5. **Memory Search Test**: Click `RECALLS` header button -> verify search box filters memories by text query in real-time.
6. **Defensive API Test**: Send malformed/non-object payload (`null`, `[]`, `"hello"`, `123`) to `/api/ria-config` -> verify HTTP 400 response with detailed error JSON.
