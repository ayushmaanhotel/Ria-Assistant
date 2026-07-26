# Challenge Report — Milestone 2 (R2: Dual Assistant Persona Engine MYRAA & Ria)

## Challenge Summary

**Overall risk assessment**: LOW

The Dual Persona Engine (MYRAA & Ria) exhibits strong overall resilience: server fallback logic prevents process crashes on missing, empty, malformed, or invalid custom config paths, and `URLSearchParams` guarantees query string encoding safety when switching assistants/voices. However, targeted empirical testing identified 3 minor schema-validation edge cases in the custom config loader (`/api/ria-config` and WebSocket `/live` session) when parsing non-object or null JSON payloads.

---

## Challenges & Findings

### [Low] Challenge 1: Primitive `null` JSON payload in config file causes 500 Internal Server Error in `/api/ria-config`

- **Assumption challenged**: Assumed that valid JSON syntax parsed from a custom config file is always a non-null object.
- **Attack scenario**: A user creates an empty or reset config file containing literal `null`. When `/api/ria-config?path=...` is requested, `JSON.parse("null")` returns `null`. Line 368 in `server.ts` performs `["Aoede", "Kore", ...].includes(parsed.voice)` which attempts property access on `null`, throwing `TypeError: Cannot read properties of null (reading 'voice')`.
- **Blast radius**: The API endpoint catches the exception in its outer `try...catch` block and returns HTTP 500 Internal Server Error instead of a 400 validation error. The server process does NOT crash, but client UI (`SettingsPanel.tsx`) receives a 500 error.
- **Mitigation**: Add a type check after `JSON.parse(content)`:
  ```ts
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return res.status(400).json({ ok: false, valid: false, error: "Config payload must be a JSON object." });
  }
  ```

---

### [Low] Challenge 2: Non-object primitive JSON payloads (`12345`, `"string"`, `true`) bypass schema validation in `/api/ria-config`

- **Assumption challenged**: Assumed that non-object JSON values would be caught as invalid schema.
- **Attack scenario**: A user points `riaCustomConfigPath` to a JSON file containing a scalar value like `12345` or `"hello"`. `JSON.parse` succeeds without throwing. In `server.ts` lines 368-372, `(12345).voice` returns `undefined`, and `Array.isArray(12345.directives)` returns `false`. The endpoint returns HTTP 200 OK with `ok: true, valid: true` and default fallback configuration `{ assistantName: "Ria", voice: undefined, systemPrompt: "", directives: [], memories: [] }`.
- **Blast radius**: The `SettingsPanel` UI presents invalid scalar JSON files as "✓ Config Valid", misinforming the user.
- **Mitigation**: Ensure `typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)` is checked before returning `valid: true`.

---

### [Low] Challenge 3: Null elements inside `memories` array throw TypeError during WebSocket session config loading

- **Assumption challenged**: Assumed elements inside the `memories` array of custom config files are always non-null objects or strings.
- **Attack scenario**: A custom config JSON file contains `"memories": [null]`. During WebSocket `/live` session setup (`server.ts` line 936), `configData.memories.map((m: any) => ({ category: m.category || "preference", ... }))` executes `null.category`, throwing a `TypeError`.
- **Blast radius**: Caught by the surrounding `try...catch (cfgErr)` block in `/live` connection setup. The server logs a warning and falls back to default prompt without crashing, but custom config memories/directives are skipped entirely.
- **Mitigation**: Filter or validate items in `memories` array: `m && (typeof m === "string" || typeof m === "object")`.

---

## Stress Test Results

| # | Test Scenario | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| 1 | Missing `path` parameter in `/api/ria-config` | HTTP 400 `No config path specified.` | HTTP 400 `No config path specified.` | **PASS** |
| 2 | Empty string `path` (`?path=`) | HTTP 400 `No config path specified.` | HTTP 400 `No config path specified.` | **PASS** |
| 3 | Non-existent config path | HTTP 404 `Config file not found` | HTTP 404 `Config file not found` | **PASS** |
| 4 | Directory path passed to `/api/ria-config` | Graceful HTTP error handling | HTTP 500 `EISDIR` (caught safely, server remains stable) | **PASS** |
| 5 | Empty file (0 bytes) | HTTP 400 `Invalid JSON format` | HTTP 400 `Invalid JSON format: Unexpected end of JSON input` | **PASS** |
| 6 | Malformed JSON file (`{ voice: `) | HTTP 400 `Invalid JSON format` | HTTP 400 `Invalid JSON format` | **PASS** |
| 7 | Primitive JSON `null` | HTTP 400 `Config must be an object` | HTTP 500 `Cannot read properties of null (reading 'voice')` | **FAIL (Minor)** |
| 8 | Primitive JSON `12345` | HTTP 400 `Config must be an object` | HTTP 200 `ok: true, valid: true` (scalar treated as empty config) | **FAIL (Minor)** |
| 9 | Valid custom config file | HTTP 200 `valid: true` with parsed fields | HTTP 200 `valid: true` with `assistantName`, `voice`, `systemPrompt`, `directives`, `memories` | **PASS** |
| 10 | Invalid voice name in config (`"RobotVoice"`) | Fall back `voice` to default | Returns `voice: undefined` in API; falls back to `"Kore"` in WS | **PASS** |
| 11 | Special chars & slashes in `configPath` query | URL parameter encoding safety | `URLSearchParams` percent-encodes; `server.ts` decodes exact path | **PASS** |
| 12 | WS connection with non-existent config path | Log warning & fallback to defaults | Log warning & fallback to defaults (server does not crash) | **PASS** |
| 13 | TypeScript compilation check (`tsc --noEmit`) | 0 compilation errors | 0 compilation errors | **PASS** |

---

## Unchallenged Areas

- **Gemini Live Audio Stream WebSocket Output**: Real API authentication with Google Gemini requires valid API key and active WebSocket credentials, which is mocked/isolated in unit harness.
