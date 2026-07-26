import fs from 'fs';
import path from 'path';
import express from 'express';

// Create temporary directory for test config files
const testDir = path.resolve('./test_harness/temp_configs');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Write test payloads
const files = {
  'null.json': 'null',
  'array.json': '[1, 2, 3]',
  'string.json': '"hello world"',
  'number.json': '12345',
  'boolean.json': 'true',
  'malformed.json': '{ invalid json }',
  'valid_full.json': JSON.stringify({
    assistantName: "Ria Test",
    voice: "Aoede",
    systemPrompt: "You are Ria test assistant.",
    directives: ["Be helpful", "Be concise"],
    memories: ["User name is Alex"]
  }),
  'valid_minimal.json': JSON.stringify({
    name: "Ria Minimal",
    voice: "Fenrir"
  })
};

for (const [name, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(testDir, name), content, 'utf-8');
}

// Define the express app & mount /api/ria-config exactly as in server.ts
const app = express();
app.use(express.json());

function loadSettingsFile() {
  return {};
}

app.get("/api/ria-config", async (req, res) => {
  try {
    const settings = loadSettingsFile();
    const targetPath = (req.query.path) || (settings.riaCustomConfigPath);
    if (!targetPath) {
      return res.status(400).json({ ok: false, valid: false, error: "No config path specified." });
    }
    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ ok: false, valid: false, error: `Config file not found at: ${targetPath}` });
    }
    const content = fs.readFileSync(resolved, "utf-8");
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      return res.status(400).json({ ok: false, valid: false, error: `Invalid JSON format: ${e.message}` });
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return res.status(400).json({ ok: false, valid: false, error: "Configuration payload must be a non-null JSON object." });
    }

    const validVoice = ["Aoede", "Kore", "Fenrir", "Puck"].includes(parsed.voice) ? parsed.voice : undefined;
    const systemPrompt = parsed.systemPrompt || parsed.instructions || parsed.prompt || "";
    const directives = Array.isArray(parsed.directives) ? parsed.directives : [];
    const memories = Array.isArray(parsed.memories) ? parsed.memories : [];

    res.json({
      ok: true,
      valid: true,
      path: resolved,
      config: {
        assistantName: parsed.assistantName || parsed.name || "Ria",
        voice: validVoice,
        systemPrompt,
        directives,
        memories,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, valid: false, error: err.message });
  }
});

const PORT = 3099;
const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);
  
  const results = [];

  const testCases = [
    { label: "Missing path query", url: `http://localhost:${PORT}/api/ria-config` },
    { label: "Non-existent file", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'missing.json'))}` },
    { label: "Non-object JSON: null", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'null.json'))}` },
    { label: "Non-object JSON: Array []", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'array.json'))}` },
    { label: "Non-object JSON: String", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'string.json'))}` },
    { label: "Non-object JSON: Number", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'number.json'))}` },
    { label: "Non-object JSON: Boolean", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'boolean.json'))}` },
    { label: "Malformed JSON", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'malformed.json'))}` },
    { label: "Valid JSON Object (Full)", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'valid_full.json'))}` },
    { label: "Valid JSON Object (Minimal)", url: `http://localhost:${PORT}/api/ria-config?path=${encodeURIComponent(path.join(testDir, 'valid_minimal.json'))}` },
  ];

  for (const tc of testCases) {
    try {
      const res = await fetch(tc.url);
      const data = await res.json();
      results.push({
        label: tc.label,
        status: res.status,
        ok: res.ok,
        body: data
      });
    } catch (e) {
      results.push({
        label: tc.label,
        error: e.message
      });
    }
  }

  console.log("\n=== API HARDENING TEST RESULTS ===");
  console.log(JSON.stringify(results, null, 2));

  // MemoryDashboard Search Filter Test Suite
  console.log("\n=== MEMORY DASHBOARD SEARCH FILTER TEST RESULTS ===");
  
  const mockMemories = [
    { id: "1", category: "identity", text: "User prefers dark mode and voice control [v2].", createdAt: "2026-01-01" },
    { id: "2", category: "project", text: "Working on MYRAA AI Assistant (React + Express).", createdAt: "2026-01-02" },
    { id: "3", category: "preference", text: "Enjoys coffee (café) ☕ & tech podcast.", createdAt: "2026-01-03" },
    { id: "4", category: "goal", text: "Build a high-performance $100k project with (regex) support.", createdAt: "2026-01-04" },
  ];

  function filterMemories(memories, searchQuery, activeTab = "all") {
    return memories.filter((m) => {
      const matchesTab = activeTab === "all" || m.category === activeTab;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        m.text.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query);
      return matchesTab && matchesSearch;
    });
  }

  const memoryTestCases = [
    { label: "Empty query", query: "" },
    { label: "Whitespace query", query: "   " },
    { label: "Mixed case: 'mYrAa'", query: "mYrAa" },
    { label: "Mixed case category: 'IdEnTiTy'", query: "IdEnTiTy" },
    { label: "Special char: '['", query: "[" },
    { label: "Special char: ']' ", query: "]" },
    { label: "Special char: '('", query: "(" },
    { label: "Special char: ')'", query: ")" },
    { label: "Special char: '*'", query: "*" },
    { label: "Special char: '\\'", query: "\\" },
    { label: "Special char: '$100k'", query: "$100k" },
    { label: "Special char: '+'", query: "+" },
    { label: "Special char: '?'", query: "?" },
    { label: "Emoji / Unicode: '☕'", query: "☕" },
    { label: "Unicode accented: 'café'", query: "café" },
    { label: "Long query (1000 chars)", query: "a".repeat(1000) },
    { label: "Long query (10000 chars)", query: "a".repeat(10000) },
    { label: "No match query: 'nonexistentxyz'", query: "nonexistentxyz" }
  ];

  const memoryResults = [];
  for (const tc of memoryTestCases) {
    try {
      const startTime = performance.now();
      const filtered = filterMemories(mockMemories, tc.query);
      const durationMs = performance.now() - startTime;
      memoryResults.push({
        label: tc.label,
        matchedCount: filtered.length,
        matchedIds: filtered.map(m => m.id),
        durationMs: durationMs.toFixed(3),
        passed: true
      });
    } catch (err) {
      memoryResults.push({
        label: tc.label,
        passed: false,
        error: err.message
      });
    }
  }

  console.log(JSON.stringify(memoryResults, null, 2));

  fs.writeFileSync('./test_harness/test_output.json', JSON.stringify({ apiResults: results, memoryResults }, null, 2));

  server.close(() => {
    console.log("Test server shut down.");
    process.exit(0);
  });
});
