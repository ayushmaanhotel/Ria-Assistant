import { GoogleGenAI, Modality, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

// Replicate desktop agent tools schema from server.ts
const desktopTools = [
  { name: "openApplication", description: "Open desktop app", parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } },
  { name: "openWebsite", description: "Open website", parameters: { type: Type.OBJECT, properties: { url: { type: Type.STRING } } } },
  { name: "takeScreenshot", description: "Take screenshot", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "volumeUp", description: "Increase volume", parameters: { type: Type.OBJECT, properties: {} } },
  { name: "volumeDown", description: "Decrease volume", parameters: { type: Type.OBJECT, properties: {} } },
];

async function runTest() {
  console.log("Testing ai.live.connect with gemini-3.1-flash-live-preview + tools...");
  try {
    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction: { parts: [{ text: "You are Ria." }] },
        tools: [{ functionDeclarations: desktopTools }]
      },
      callbacks: {
        onmessage: (msg) => {
          console.log("[Live Message]:", JSON.stringify(msg));
        },
        onclose: (e) => {
          console.log("[Live Session Closed!]:", e?.code, e?.reason || e);
        },
        onerror: (err) => {
          console.error("[Live Session Error]:", err);
        }
      }
    });

    console.log("Session connected successfully!");
    await new Promise((r) => setTimeout(r, 5000));
    session.close();
  } catch (err) {
    console.error("Connect failed:", err);
  }
}

runTest();
