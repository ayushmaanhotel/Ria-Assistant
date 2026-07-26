import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

async function testAudioStream() {
  console.log("Connecting to gemini-3.1-flash-live-preview for audio output test...");
  let audioChunkCount = 0;
  
  try {
    const session = await ai.live.connect({
      model: "gemini-3.1-flash-live-preview",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
        },
        systemInstruction: { parts: [{ text: "Say hello and sing a short 1-line song warmly." }] },
      },
      callbacks: {
        onmessage: (msg) => {
          const parts = msg.serverContent?.modelTurn?.parts || [];
          for (const p of parts) {
            if (p.inlineData?.data) {
              audioChunkCount++;
              console.log(`[Audio Chunk #${audioChunkCount}] Received ${p.inlineData.data.length} base64 chars`);
            }
            if (p.text) {
              console.log("[Text Chunk]:", p.text);
            }
          }
        },
        onclose: (e) => {
          console.log("[Live Session Closed]:", e);
        },
        onerror: (err) => {
          console.error("[Live Session Error]:", err);
        }
      }
    });

    console.log("Session connected! Waiting 8 seconds for audio output...");
    await new Promise((r) => setTimeout(r, 8000));
    console.log(`\nTotal audio chunks received: ${audioChunkCount}`);
    session.close();
  } catch (err) {
    console.error("Connect failed:", err);
  }
}

testAudioStream();
