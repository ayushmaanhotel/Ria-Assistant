import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function testLive() {
  console.log("Connecting to Gemini Live API...");
  try {
    const session = await ai.live.connect({
      model: "gemini-2.0-flash-exp",
      config: {
        responseModalities: [Modality.AUDIO],
      }
    });
    console.log("SUCCESS! Live session connected successfully!");
    session.close();
  } catch (err) {
    console.error("ERROR in live connect:", err);
  }
}

testLive();
