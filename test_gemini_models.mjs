import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const modelsToTest = [
  "gemini-2.0-flash-realtime-exp",
  "gemini-2.0-flash-exp",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash-thinking-exp-01-21"
];

async function testModel(modelName) {
  console.log(`\nTesting model: ${modelName}...`);
  return new Promise((resolve) => {
    let closed = false;
    try {
      ai.live.connect({
        model: modelName,
        config: { responseModalities: [Modality.AUDIO] },
        callbacks: {
          onclose: (e) => {
            if (!closed) {
              closed = true;
              console.log(`[${modelName}] FAILED / CLOSED:`, e?.reason || e);
              resolve(false);
            }
          },
          onerror: (err) => {
            if (!closed) {
              closed = true;
              console.log(`[${modelName}] ERROR:`, err);
              resolve(false);
            }
          }
        }
      }).then((session) => {
        setTimeout(() => {
          if (!closed) {
            closed = true;
            console.log(`>>> [${modelName}] SUCCESS! CONNECTED & STABLE! <<<`);
            try { session.close(); } catch {}
            resolve(true);
          }
        }, 3000);
      }).catch((err) => {
        if (!closed) {
          closed = true;
          console.log(`[${modelName}] CATCH ERROR:`, err.message || err);
          resolve(false);
        }
      });
    } catch (err) {
      console.log(`[${modelName}] INITIAL ERROR:`, err.message || err);
      resolve(false);
    }
  });
}

async function runAll() {
  for (const m of modelsToTest) {
    const success = await testModel(m);
    if (success) {
      console.log(`\nFOUND WORKING LIVE MODEL: ${m}`);
      break;
    }
  }
}

runAll();
