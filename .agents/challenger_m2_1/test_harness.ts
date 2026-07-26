import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";

// Create temp directory for test config files
const TEST_DIR = path.join(process.cwd(), ".agents", "challenger_m2_1", "test_configs");
if (!fs.existsSync(TEST_DIR)) {
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// 1. Create various test config files
const validConfigPath = path.join(TEST_DIR, "valid_ria.json");
const emptyConfigPath = path.join(TEST_DIR, "empty.json");
const malformedJsonPath = path.join(TEST_DIR, "malformed.json");
const nullJsonPath = path.join(TEST_DIR, "null.json");
const numberJsonPath = path.join(TEST_DIR, "number.json");
const invalidVoiceConfigPath = path.join(TEST_DIR, "invalid_voice.json");
const nullMemoriesConfigPath = path.join(TEST_DIR, "null_memories.json");
const specialCharPath = path.join(TEST_DIR, "ria config & special #1 (v2).json");
const dirPath = path.join(TEST_DIR, "test_dir");

if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(validConfigPath, JSON.stringify({
  assistantName: "Ria Custom",
  voice: "Puck",
  systemPrompt: "You are Ria Custom Assistant.",
  directives: ["Be concise", "Be helpful"],
  memories: [{ category: "preference", text: "User likes tea" }]
}), "utf-8");

fs.writeFileSync(emptyConfigPath, "", "utf-8");
fs.writeFileSync(malformedJsonPath, "{ assistantName: 'Ria', voice: ", "utf-8");
fs.writeFileSync(nullJsonPath, "null", "utf-8");
fs.writeFileSync(numberJsonPath, "12345", "utf-8");
fs.writeFileSync(invalidVoiceConfigPath, JSON.stringify({
  assistantName: "Ria Unknown Voice",
  voice: "NonExistentVoiceModel",
  systemPrompt: "Custom prompt"
}), "utf-8");
fs.writeFileSync(nullMemoriesConfigPath, JSON.stringify({
  assistantName: "Ria Null Memories",
  memories: [null, "string memory", { text: "valid obj" }]
}), "utf-8");
fs.writeFileSync(specialCharPath, JSON.stringify({
  assistantName: "Ria Special Path",
  voice: "Kore"
}), "utf-8");

console.log("Created test config files in:", TEST_DIR);

// Mock server logic mimicking server.ts
const app = express();
app.use(express.json());

const SETTINGS_FILE = path.join(TEST_DIR, "test_settings.json");
function loadSettingsFile() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
    }
  } catch {}
  return {};
}

// Exactly mirror server.ts endpoint logic
app.get("/api/ria-config", async (req, res) => {
  try {
    const settings = loadSettingsFile();
    const targetPath = (req.query.path as string) || (settings.riaCustomConfigPath as string);
    if (!targetPath) {
      return res.status(400).json({ ok: false, valid: false, error: "No config path specified." });
    }
    const resolved = path.isAbsolute(targetPath) ? targetPath : path.resolve(process.cwd(), targetPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ ok: false, valid: false, error: `Config file not found at: ${targetPath}` });
    }
    const content = fs.readFileSync(resolved, "utf-8");
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch (e: any) {
      return res.status(400).json({ ok: false, valid: false, error: `Invalid JSON format: ${e.message}` });
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
  } catch (err: any) {
    res.status(500).json({ ok: false, valid: false, error: err.message });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === "/live") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

let wsTestResults: any[] = [];

wss.on("connection", async (clientWs, req) => {
  try {
    const savedSettings = loadSettingsFile();
    const reqUrl = new URL(req?.url || "", `http://${req?.headers?.host || "localhost"}`);
    const assistantParam = reqUrl.searchParams.get("assistant");
    const voiceParam = reqUrl.searchParams.get("voice");
    const configPathParam = reqUrl.searchParams.get("configPath");

    const activeAssistant = (assistantParam as "MYRAA" | "Ria") || (savedSettings.activeAssistant as "MYRAA" | "Ria") || "MYRAA";
    const validVoices = ["Aoede", "Kore", "Fenrir", "Puck"];

    let resolvedVoice = "Aoede";
    let basePrompt = "";
    let extraMemories: any[] = [];
    let customConfigStatus = "none";
    let customConfigError = null;

    if (activeAssistant === "Ria") {
      resolvedVoice = voiceParam || (savedSettings.riaVoice as string) || "Kore";
      if (!validVoices.includes(resolvedVoice)) {
        resolvedVoice = "Kore";
      }

      basePrompt = (savedSettings.riaSystemPrompt as string) || "Ria Default Prompt";

      const customConfigPath = configPathParam || (savedSettings.riaCustomConfigPath as string);
      if (customConfigPath) {
        try {
          const resolvedPath = path.isAbsolute(customConfigPath) ? customConfigPath : path.resolve(process.cwd(), customConfigPath);
          if (fs.existsSync(resolvedPath)) {
            const fileContent = fs.readFileSync(resolvedPath, "utf-8");
            const configData = JSON.parse(fileContent);

            if (configData.voice && validVoices.includes(configData.voice)) {
              resolvedVoice = configData.voice;
            }
            const cfgPrompt = configData.systemPrompt || configData.instructions || configData.prompt;
            if (cfgPrompt) {
              basePrompt = cfgPrompt;
            }
            if (Array.isArray(configData.directives) && configData.directives.length > 0) {
              basePrompt += "\n\nADDITIONAL DIRECTIVES:\n" + configData.directives.map((d: string) => `- ${d}`).join("\n");
            }
            if (Array.isArray(configData.memories) && configData.memories.length > 0) {
              const nowStr = new Date().toISOString();
              extraMemories = configData.memories.map((m: any, idx: number) => ({
                id: `cfg_mem_${idx}_${Math.random().toString(36).substring(2, 7)}`,
                category: m.category || "preference",
                text: typeof m === "string" ? m : (m.text || JSON.stringify(m)),
                createdAt: m.createdAt || nowStr,
                updatedAt: m.updatedAt || nowStr,
              }));
            }
            customConfigStatus = "loaded";
          } else {
            customConfigStatus = "not_found";
          }
        } catch (cfgErr: any) {
          customConfigStatus = "error";
          customConfigError = cfgErr.message;
        }
      }
    }

    clientWs.send(JSON.stringify({
      type: "handshake_res",
      receivedParams: {
        assistant: assistantParam,
        voice: voiceParam,
        configPath: configPathParam,
      },
      resolved: {
        activeAssistant,
        resolvedVoice,
        basePrompt,
        extraMemoriesCount: extraMemories.length,
        customConfigStatus,
        customConfigError,
      }
    }));
    clientWs.close();
  } catch (err: any) {
    clientWs.send(JSON.stringify({ type: "error", error: err.message }));
    clientWs.close();
  }
});

const PORT = 3099;
server.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  const testCases = [
    { name: "1. Missing path parameter", query: "" },
    { name: "2. Empty string path", query: "?path=" },
    { name: "3. Non-existent config file", query: `?path=${encodeURIComponent(path.join(TEST_DIR, "does_not_exist.json"))}` },
    { name: "4. Directory instead of file", query: `?path=${encodeURIComponent(dirPath)}` },
    { name: "5. Empty config file (0 bytes)", query: `?path=${encodeURIComponent(emptyConfigPath)}` },
    { name: "6. Malformed JSON", query: `?path=${encodeURIComponent(malformedJsonPath)}` },
    { name: "7. Primitive JSON 'null'", query: `?path=${encodeURIComponent(nullJsonPath)}` },
    { name: "8. Primitive JSON '12345'", query: `?path=${encodeURIComponent(numberJsonPath)}` },
    { name: "9. Valid config file", query: `?path=${encodeURIComponent(validConfigPath)}` },
    { name: "10. Invalid voice model name", query: `?path=${encodeURIComponent(invalidVoiceConfigPath)}` },
    { name: "11. Special characters in path (&, #, spaces)", query: `?path=${encodeURIComponent(specialCharPath)}` },
  ];

  console.log("\n--- REST API (/api/ria-config) TEST RESULTS ---");
  for (const tc of testCases) {
    try {
      const res = await fetch(`http://localhost:${PORT}/api/ria-config${tc.query}`);
      const status = res.status;
      const json = await res.json();
      console.log(`\n[${tc.name}] -> HTTP Status: ${status}`);
      console.log(`Payload:`, JSON.stringify(json, null, 2));
    } catch (e: any) {
      console.log(`\n[${tc.name}] -> FETCH ERROR:`, e.message);
    }
  }

  console.log("\n--- WEBSOCKET (/live) TEST RESULTS ---");

  const wsTestCases = [
    {
      name: "WS 1: MYRAA default",
      params: new URLSearchParams({ assistant: "MYRAA", voice: "Aoede" }),
    },
    {
      name: "WS 2: Ria with valid config",
      params: new URLSearchParams({ assistant: "Ria", voice: "Kore", configPath: validConfigPath }),
    },
    {
      name: "WS 3: Ria with non-existent config path",
      params: new URLSearchParams({ assistant: "Ria", voice: "Kore", configPath: path.join(TEST_DIR, "nonexistent.json") }),
    },
    {
      name: "WS 4: Ria with malformed JSON config",
      params: new URLSearchParams({ assistant: "Ria", voice: "Kore", configPath: malformedJsonPath }),
    },
    {
      name: "WS 5: Ria with 'null' JSON config",
      params: new URLSearchParams({ assistant: "Ria", voice: "Kore", configPath: nullJsonPath }),
    },
    {
      name: "WS 6: Ria with directory path",
      params: new URLSearchParams({ assistant: "Ria", voice: "Kore", configPath: dirPath }),
    },
    {
      name: "WS 7: Ria with null item inside memories array",
      params: new URLSearchParams({ assistant: "Ria", voice: "Kore", configPath: nullMemoriesConfigPath }),
    },
    {
      name: "WS 8: Query Encoding - Special chars & Slashes in Config Path",
      params: new URLSearchParams({
        assistant: "Ria",
        voice: "Kore & Fenrir",
        configPath: "C:\\Program Files (x86)\\Myraa & Co\\config #1 (v2).json?test=1&foo=bar",
      }),
    },
  ];

  for (const wtc of wsTestCases) {
    await new Promise<void>((resolve) => {
      const wsUrl = `ws://localhost:${PORT}/live?${wtc.params.toString()}`;
      const ws = new WebSocket(wsUrl);
      ws.on("open", () => {});
      ws.on("message", (msg) => {
        const data = JSON.parse(msg.toString());
        console.log(`\n[${wtc.name}]`);
        console.log(`  WS URL sent: ${wsUrl}`);
        console.log(`  Received params on server:`, data.receivedParams);
        console.log(`  Server resolution:`, data.resolved);
        resolve();
      });
      ws.on("error", (err) => {
        console.log(`\n[${wtc.name}] -> WS ERROR:`, err.message);
        resolve();
      });
    });
  }

  // Cleanup & close server
  server.close(() => {
    console.log("\nTest server closed.");
    process.exit(0);
  });
});
