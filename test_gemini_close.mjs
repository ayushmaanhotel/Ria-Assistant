import { GoogleGenAI, Modality, Type } from "@google/genai";
import fs from "fs";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function testWithTools() {
  console.log("=== Testing Gemini Live with full 50+ tool declarations ===");
  
  // Read tools from server.ts structure
  const sampleTools = [
    {
      functionDeclarations: [
        { name: "browserOpen", description: "Open URL", parameters: { type: Type.OBJECT, properties: { url: { type: Type.STRING } }, required: ["url"] } },
        { name: "browserSearch", description: "Search query", parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ["query"] } },
        { name: "browserClick", description: "Click selector", parameters: { type: Type.OBJECT, properties: { selector: { type: Type.STRING } }, required: ["selector"] } },
        { name: "openApplication", description: "Open app", parameters: { type: Type.OBJECT, properties: { name: { type: Type.STRING } } } },
        { name: "takeScreenshot", description: "Take screenshot", parameters: { type: Type.OBJECT, properties: {} } },
      ]
    }
  ];

  try {
    const session = await ai.live.connect({
      model: "gemini-2.0-flash-exp",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction: { parts: [{ text: "You are Ria, an AI assistant." }] },
        tools: sampleTools
      },
      callbacks: {
        onmessage: (msg) => {
          console.log("[Live Message received]:", JSON.stringify(msg).substring(0, 100));
        },
        onclose: (e) => {
          console.log("[Live Session Closed by Google!]:", e);
        },
        onerror: (err) => {
          console.error("[Live Session Error]:", err);
        }
      }
    });

    console.log("Session opened! Waiting 5 seconds...");
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log("Closing session manually.");
    session.close();
  } catch (err) {
    console.error("Connect failed:", err);
  }
}

testWithTools();
