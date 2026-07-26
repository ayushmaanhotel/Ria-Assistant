import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function listModels() {
  console.log("Listing available models...");
  try {
    const pager = await ai.models.list();
    for await (const m of pager) {
      console.log(`- ${m.name} (${m.displayName})`);
    }
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

listModels();
