import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { Memory, MemoryTransaction } from "./src/lib/memoryTypes";
import { dataFile, appRoot } from "./server_paths";

function getMemoryFile(assistant?: string): string {
  const name = (assistant || "MYRAA").toLowerCase();
  if (name === "ria") return dataFile("memories_ria.json");
  if (name === "mike") return dataFile("memories_mike.json");
  return dataFile("memories.json");
}

// Safe file operations with fallback per assistant
export async function loadMemories(assistant?: string): Promise<Memory[]> {
  const targetFile = getMemoryFile(assistant);
  try {
    const data = await fs.readFile(targetFile, "utf-8");
    return JSON.parse(data) as Memory[];
  } catch (error: any) {
    if (error.code === "ENOENT") {
      // Fallback path check in appRoot (pre-packaged memory files or dev environment)
      const name = (assistant || "MYRAA").toLowerCase();
      const relativeName = name === "ria" ? "memories_ria.json" : (name === "mike" ? "memories_mike.json" : "memories.json");
      const fallbackFile = path.join(appRoot, relativeName);
      if (fallbackFile !== targetFile && fsSync.existsSync(fallbackFile)) {
        try {
          const fallbackData = await fs.readFile(fallbackFile, "utf-8");
          return JSON.parse(fallbackData) as Memory[];
        } catch {}
      }
      return [];
    }
    console.error(`[Memory] Error loading memories for ${assistant || "MYRAA"}:`, error);
    return [];
  }
}

// Per-file write lock map to ensure write order safety
const writeLocks: Record<string, Promise<void>> = {};

export function deduplicateMemories(memories: Memory[]): Memory[] {
  const seen = new Set<string>();
  const result: Memory[] = [];

  for (const m of memories) {
    if (!m || !m.text) continue;
    const normalized = m.text.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    if (normalized.length < 3) continue;

    let isDuplicate = false;
    for (const existing of seen) {
      if (existing === normalized || existing.includes(normalized) || normalized.includes(existing)) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate) {
      seen.add(normalized);
      result.push(m);
    }
  }
  return result;
}

export async function saveMemories(memories: Memory[], assistant?: string): Promise<void> {
  const clean = deduplicateMemories(memories);
  const targetFile = getMemoryFile(assistant);
  const tempFile = `${targetFile}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const previousLock = writeLocks[targetFile] || Promise.resolve();
  let resolveLock!: () => void;
  writeLocks[targetFile] = new Promise<void>((resolve) => {
    resolveLock = resolve;
  });

  try {
    await previousLock;
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(tempFile, JSON.stringify(clean, null, 2), "utf-8");
    fsSync.renameSync(tempFile, targetFile);
    console.log(`[Memory] Saved ${clean.length} memories for ${assistant || "MYRAA"} successfully.`);
  } catch (error) {
    console.error(`[Memory] Error writing memory file for ${assistant || "MYRAA"}:`, error);
    try {
      if (fsSync.existsSync(tempFile)) {
        fsSync.unlinkSync(tempFile);
      }
    } catch {}
  } finally {
    resolveLock();
  }
}

function getSessionSummaryFile(assistant?: string): string {
  const name = (assistant || "MYRAA").toLowerCase();
  if (name === "ria") return dataFile("recent_session_ria.json");
  if (name === "mike") return dataFile("recent_session_mike.json");
  return dataFile("recent_session.json");
}

export async function loadSessionSummary(assistant?: string): Promise<string> {
  const targetFile = getSessionSummaryFile(assistant);
  try {
    const data = await fs.readFile(targetFile, "utf-8");
    const parsed = JSON.parse(data);
    return parsed.summary || "";
  } catch {
    return "";
  }
}

export async function saveSessionSummary(summary: string, assistant?: string): Promise<void> {
  const targetFile = getSessionSummaryFile(assistant);
  try {
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, JSON.stringify({ summary, timestamp: new Date().toISOString() }, null, 2), "utf-8");
  } catch (e) {
    console.error("[Memory] Error saving session summary:", e);
  }
}

export interface DialogueTurn {
  role: "user" | "model" | "assistant";
  text: string;
  timestamp?: string;
}

function getRecentTurnsFile(assistant?: string): string {
  const name = (assistant || "MYRAA").toLowerCase();
  if (name === "ria") return dataFile("recent_turns_ria.json");
  if (name === "mike") return dataFile("recent_turns_mike.json");
  return dataFile("recent_turns.json");
}

export async function loadRecentTurns(assistant?: string): Promise<DialogueTurn[]> {
  const targetFile = getRecentTurnsFile(assistant);
  try {
    const data = await fs.readFile(targetFile, "utf-8");
    const list = JSON.parse(data);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveRecentTurns(turns: DialogueTurn[], assistant?: string): Promise<void> {
  const targetFile = getRecentTurnsFile(assistant);
  const cleanTurns = turns.slice(-12);
  try {
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, JSON.stringify(cleanTurns, null, 2), "utf-8");
  } catch (e) {
    console.error("[Memory] Error saving recent turns:", e);
  }
}

// Format memory core to system instruction injections
export function formatSystemInstructionsWithMemories(
  baseInstruction: string,
  memories: Memory[],
  recentSessionSummary?: string,
  recentTurns?: DialogueTurn[]
): string {
  const cleanMemories = deduplicateMemories(memories);

  let memoryBlock = "\n\n=== MYRAA PERSISTENT MEMORY & RECOLLECTION CORE ===\n";

  if (recentTurns && recentTurns.length > 0) {
    memoryBlock += "=== RECENT DIALOGUE HISTORY (LAST SPOKEN QUESTIONS & ANSWERS) ===\n";
    memoryBlock += "You MUST remember these recent exchanges from the current and previous conversation session. If the user asks 'what was my last question?', 'what did I just ask?', or 'what were we talking about?', reference these exact turns:\n";
    recentTurns.slice(-8).forEach((t) => {
      const speaker = t.role === "user" ? "User (Ayush)" : "Assistant";
      memoryBlock += `- ${speaker}: "${t.text}"\n`;
    });
    memoryBlock += "=========================================================\n\n";
  }

  if (recentSessionSummary && recentSessionSummary.trim()) {
    memoryBlock += `PREVIOUS SESSION CONTEXT SUMMARY:\n- ${recentSessionSummary.trim()}\n\n`;
  }

  if (cleanMemories.length === 0) {
    memoryBlock += 
      "You do not possess any historic recollections of this companion yet. " +
      "As you speak, pay deep attention to who they are, their projects, relationships, and habits so you naturally grow closer over time.\n" +
      "=========================\n";
  } else {
    memoryBlock += 
      "Below are your persistent recollections of who the user is.\n" +
      "CRITICAL BRAND AND COGNITIVE PRINCIPLES:\n" +
      "- INTEGRATE MEMORIES INSTINCTIVELY: Always make conversational references feel completely smooth, natural, and human. NEVER say 'According to my memory files...'. Instead, speak of these details casually and supportively as a true friend would.\n" +
      "- COMPANIONSHIP DEPTH: Allow your witty and responsive personality to adapt with empathy, based on their goals, life events, emotional milestones, and preferences.\n\n" +
      "CURRENT PERSISTENT KNOWLEDGE CARD:\n";

    const grouped: Record<string, string[]> = {};
    cleanMemories.forEach((m) => {
      grouped[m.category] = grouped[m.category] || [];
      grouped[m.category].push(m.text);
    });

    const categoriesOrdered = [
      { key: "identity", label: "Identity (Name, nick, profession, background)" },
      { key: "preference", label: "Preferences & Tastes (Likes, dislikes, games, movies)" },
      { key: "goal", label: "Active Goals & Aspirations" },
      { key: "project", label: "Ongoing Projects & Ecosystems" },
      { key: "relationship", label: "Key People & Relationships mentioned" },
      { key: "emotional", label: "Emotional Highlights & Core Milestones" },
      { key: "behavior", label: "Observed Traits & Behavioral Tendencies" },
    ];

    categoriesOrdered.forEach((cat) => {
      const list = grouped[cat.key] || [];
      if (list.length > 0) {
        memoryBlock += `* ${cat.label}:\n` + list.map(t => `  - ${t}`).join("\n") + "\n";
      }
    });

    memoryBlock += "====================================================\n";
  }

  return baseInstruction + memoryBlock;
}

// Background memory consolidation queue lock map per assistant
export const isConsolidatingMap: Record<string, boolean> = {};

export async function processConversationSlice(
  apiKey: string,
  dialogueHistory: { role: string; text: string }[],
  assistant: string = "MYRAA"
): Promise<Memory[] | null> {
  const assistantKey = (assistant || "MYRAA").toLowerCase();

  if (isConsolidatingMap[assistantKey]) {
    console.log(`[Memory] Consolidation loop busy for ${assistant}, skipping slice processing`);
    return null;
  }

  if (dialogueHistory.length < 2) {
    return null;
  }

  isConsolidatingMap[assistantKey] = true;
  console.log(`[Memory] Initiating pipeline for ${assistant} dialogue slice of length:`, dialogueHistory.length);

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const currentMemories = await loadMemories(assistant);
    
    // Format memory map to help Gemini understand what to edit
    const memoryContext = currentMemories.map(m => `ID: ${m.id} | Category: ${m.category} | Fact: ${m.text}`).join("\n");
    const dialogueContext = dialogueHistory.map(line => `${line.role === "user" ? "User" : "Assistant"}: ${line.text}`).join("\n");

    const prompt = `You are the deep cognitive recollection engine for ${assistant}. Your task is to analyze the recent conversation slice, extract persistent facts, and generate a concise 1-2 sentence summary of the ongoing topic.

### OBJECTIVE
1. Identify durable, important personal facts, preferences, aspirations, projects, relationships, or behavioral habits. Ignore small talk, greetings, or fleeting sentences.
2. Produce a short 1-2 sentence summary of what the user and assistant were discussing in this slice.

### CURRENT USER MEMORIES:
${memoryContext || "(No memory records exist)"}

### RECENT DIALOGUE SLICE:
${dialogueContext}

### RULES
- ACTIONS:
  - "ADD": If new material information is introduced.
  - "UPDATE": If previous information has evolved or is corrected. Provide the exact ID of the memory to replace.
  - "REMOVE": If a memory was disproven or explicitly requested to be forgotten.
- TEXT STYLE: Concise, third-person declarative statements. No conversational filler or timestamps.
- SESSION SUMMARY: Provide a 1-2 sentence summary of what the conversation was about.`;

    const memoryModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const response = await ai.models.generateContent({
      model: memoryModel,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sessionSummary: {
              type: Type.STRING,
              description: "1-2 sentence summary of what was discussed in this session slice."
            },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: {
                    type: Type.STRING,
                    description: "ADD, UPDATE, or REMOVE transaction.",
                    enum: ["ADD", "UPDATE", "REMOVE"]
                  },
                  id: {
                    type: Type.STRING,
                    description: "Specific ID of the existing memory being modified or deleted (leave blank/null for ADD)."
                  },
                  category: {
                    type: Type.STRING,
                    description: "The Memory category classification.",
                    enum: ["identity", "preference", "goal", "project", "relationship", "emotional", "behavior"]
                  },
                  text: {
                    type: Type.STRING,
                    description: "The memory summarized as a concise declarative statement in third-person."
                  }
                },
                required: ["action", "category", "text"]
              }
            }
          },
          required: ["transactions"]
        }
      }
    });

    const resultText = response.text?.trim() || "{}";
    const resultObj = JSON.parse(resultText);
    const transactions: MemoryTransaction[] = resultObj.transactions || [];
    const sessionSummary: string = resultObj.sessionSummary || "";

    if (sessionSummary.trim()) {
      await saveSessionSummary(sessionSummary.trim(), assistant);
    }

    if (transactions.length === 0) {
      console.log("[Memory] Zero memory transactions generated. Saved session summary.");
      return currentMemories;
    }

    console.log(`[Memory] Processing ${transactions.length} memory updates:`, JSON.stringify(transactions));

    let updatedMemories = [...currentMemories];
    const timestamp = new Date().toISOString();

    for (const trx of transactions) {
      if (trx.action === "ADD") {
        const newMemory: Memory = {
          id: Math.random().toString(36).substring(2, 11),
          category: trx.category,
          text: trx.text,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        updatedMemories.push(newMemory);
      } else if (trx.action === "UPDATE") {
        const tarIndex = updatedMemories.findIndex(m => m.id === trx.id);
        if (tarIndex !== -1) {
          updatedMemories[tarIndex] = {
            ...updatedMemories[tarIndex],
            category: trx.category,
            text: trx.text,
            updatedAt: timestamp
          };
        } else {
          // Fallback, treat as ADD if ID not matched
          const newMemory: Memory = {
            id: Math.random().toString(36).substring(2, 11),
            category: trx.category,
            text: trx.text,
            createdAt: timestamp,
            updatedAt: timestamp
          };
          updatedMemories.push(newMemory);
        }
      } else if (trx.action === "REMOVE") {
        updatedMemories = updatedMemories.filter(m => m.id !== trx.id);
      }
    }

    await saveMemories(updatedMemories, assistant);
    return updatedMemories;

  } catch (error) {
    console.error("[Memory] Consolidation failure:", error);
    return null;
  } finally {
    isConsolidatingMap[assistantKey] = false;
  }
}

// Helper to resolve knowledge base path across DATA_DIR and appRoot
export function resolveKnowledgePath(relativePath: string): string {
  const dataPath = dataFile(relativePath);
  if (fsSync.existsSync(dataPath)) {
    return dataPath;
  }
  const appPath = path.join(appRoot, relativePath);
  if (fsSync.existsSync(appPath)) {
    return appPath;
  }
  return dataPath;
}

// ---------------------------------------------------------------------------
// Local Knowledge Base Storage Lookup (Notion Atomic Dataset & Local Files)
// ---------------------------------------------------------------------------
export async function queryKnowledgeBase(searchTerm: string): Promise<string[]> {
  const results: string[] = [];
  const term = searchTerm.toLowerCase();

  // 1. Notion Atomic Facts Lookup
  try {
    const kbPath = resolveKnowledgePath("knowledge_base/notion_atomic_facts.json");
    const data = await fs.readFile(kbPath, "utf-8");
    const facts = JSON.parse(data) as { id: string; entity: string; category: string; fact: string }[];
    const matched = facts.filter(
      f => f.entity.toLowerCase().includes(term) || f.category.toLowerCase().includes(term) || f.fact.toLowerCase().includes(term)
    );
    results.push(...matched.slice(0, 8).map(m => m.fact));
  } catch {}

  // 2. Mike Educational Tutor Dataset Lookup
  try {
    const tutorKbPath = resolveKnowledgePath("knowledge_base/mike_tutor_atomic_facts.json");
    const dataTutor = await fs.readFile(tutorKbPath, "utf-8");
    const tutorFacts = JSON.parse(dataTutor) as string[];
    const matchedTutor = tutorFacts.filter(
      f => f.toLowerCase().includes(term) || 
           ["class", "learn", "teach", "student", "math", "science", "english", "hindi", "nursery", "lkg", "ukg", "tutor", "mike", "algebra", "fraction", "division", "equation", "physics", "chemistry", "biology"].some(k => term.includes(k))
    );
    results.push(...matchedTutor.slice(0, 5));
  } catch {}

  // 3. User Uploaded Vault Documents Knowledge Lookup
  try {
    const userKbPath = resolveKnowledgePath("knowledge_base/user_uploaded_facts.json");
    const dataUser = await fs.readFile(userKbPath, "utf-8");
    const userFacts = JSON.parse(dataUser) as string[];
    const matchedUser = userFacts.filter(f => f.toLowerCase().includes(term));
    results.push(...matchedUser.slice(0, 5));
  } catch {}

  return results.slice(0, 12);
}
