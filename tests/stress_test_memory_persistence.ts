import fs from "fs";
import path from "path";
import crypto from "crypto";
import { saveMemories, loadMemories } from "../server_memory";
import { Memory } from "../src/lib/memoryTypes";

const rootDir = process.cwd();
const myraaPath = path.join(rootDir, "memories.json");
const riaPath = path.join(rootDir, "memories_ria.json");
const mikePath = path.join(rootDir, "memories_mike.json");

function getFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return "FILE_NOT_FOUND";
  const content = fs.readFileSync(filePath, "utf-8");
  return crypto.createHash("sha256").update(content).digest("hex");
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedTests++;
  }
}

async function runMemoryStressTest() {
  console.log("=========================================================================");
  console.log("CHALLENGER STRESS TEST: MEMORY PERSISTENCE & CONCURRENT ISOLATION");
  console.log("=========================================================================");

  // Step 1: Record baseline state & raw content
  const myraaInitialContent = fs.readFileSync(myraaPath, "utf-8");
  const riaInitialContent = fs.readFileSync(riaPath, "utf-8");
  const mikeInitialContent = fs.existsSync(mikePath) ? fs.readFileSync(mikePath, "utf-8") : "[]";

  const myraaInitialMemories = await loadMemories("MYRAA");
  const riaInitialMemories = await loadMemories("ria");
  const mikeInitialMemories = await loadMemories("mike");

  console.log("\n--- PHASE 1: Baseline File States Recorded ---");
  console.log(`  MYRAA initial length : ${myraaInitialContent.length} bytes (${myraaInitialMemories.length} entries)`);
  console.log(`  Ria initial length   : ${riaInitialContent.length} bytes (${riaInitialMemories.length} entries)`);
  console.log(`  Mike initial length  : ${mikeInitialContent.length} bytes (${mikeInitialMemories.length} entries)`);

  // Step 2: Rapid Sequence Execution (50 Rapid Sequential Writes)
  console.log("\n--- PHASE 2: Rapid Sequential Execution (50 Mike Memory Writes) ---");

  const createdMikeSeqIds: string[] = [];
  for (let i = 0; i < 50; i++) {
    const mikeId = `seq_mike_${Date.now()}_${i}`;
    createdMikeSeqIds.push(mikeId);

    const mikePayload: Memory[] = [
      ...mikeInitialMemories,
      {
        id: mikeId,
        category: "goal",
        text: `Rapid sequential memory item #${i} for Mike Tutor.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    await saveMemories(mikePayload, "mike");
  }

  // Verify MYRAA and Ria disk contents were UNTOUCHED during 50 rapid sequential Mike writes
  const myraaSeqContent = fs.readFileSync(myraaPath, "utf-8");
  const riaSeqContent = fs.readFileSync(riaPath, "utf-8");

  assert(
    myraaSeqContent === myraaInitialContent,
    "Strict Isolation: memories.json (MYRAA) raw file content 100% IDENTICAL during rapid Mike saves"
  );
  assert(
    riaSeqContent === riaInitialContent,
    "Strict Isolation: memories_ria.json (Ria) raw file content 100% IDENTICAL during rapid Mike saves"
  );

  // Step 3: Concurrent High-Throughput Load (50 Interleaved Async Promises)
  console.log("\n--- PHASE 3: Concurrent Interleaved Load (50 Async Promises) ---");

  const mikePromises: Promise<void>[] = [];
  const createdMikeAsyncIds: string[] = [];

  for (let i = 0; i < 50; i++) {
    const mikeId = `async_mike_${Date.now()}_${i}`;
    createdMikeAsyncIds.push(mikeId);

    const mikePayload: Memory[] = [
      ...mikeInitialMemories,
      {
        id: mikeId,
        category: "project",
        text: `Async concurrent memory item #${i} for Mike Tutor.`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    mikePromises.push(saveMemories(mikePayload, "mike"));
  }

  await Promise.all(mikePromises);

  // Verify MYRAA and Ria disk contents remain 100% UNTOUCHED
  const myraaAsyncContent = fs.readFileSync(myraaPath, "utf-8");
  const riaAsyncContent = fs.readFileSync(riaPath, "utf-8");

  assert(
    myraaAsyncContent === myraaInitialContent,
    "Strict Isolation: memories.json (MYRAA) raw file content 100% UNTOUCHED post-concurrent Mike load"
  );
  assert(
    riaAsyncContent === riaInitialContent,
    "Strict Isolation: memories_ria.json (Ria) raw file content 100% UNTOUCHED post-concurrent Mike load"
  );

  // Step 4: Verification of Mike Memory File Integrity & Zero Cross-Contamination
  console.log("\n--- PHASE 4: Memory Content & Bidirectional Isolation Assertions ---");

  const myraaMemoriesCheck = await loadMemories("MYRAA");
  const riaMemoriesCheck = await loadMemories("ria");
  const mikeMemoriesCheck = await loadMemories("mike");

  const allCreatedMikeIds = [...createdMikeSeqIds, ...createdMikeAsyncIds];

  const leakedToMyraa = allCreatedMikeIds.some(id =>
    myraaMemoriesCheck.some(m => m.id === id || m.text.includes("Mike Tutor"))
  );
  assert(!leakedToMyraa, "Zero Cross-Contamination: 0 Mike memory entries present in memories.json (MYRAA)");

  const leakedToRia = allCreatedMikeIds.some(id =>
    riaMemoriesCheck.some(m => m.id === id || m.text.includes("Mike Tutor"))
  );
  assert(!leakedToRia, "Zero Cross-Contamination: 0 Mike memory entries present in memories_ria.json (Ria)");

  let validJson = false;
  try {
    const rawMike = fs.readFileSync(mikePath, "utf-8");
    JSON.parse(rawMike);
    validJson = true;
  } catch (e) {}
  assert(validJson, "File Integrity Assertion: memories_mike.json valid JSON format");

  // Step 5: Restore Baseline Files
  console.log("\n--- PHASE 5: Restoring Baseline File Contents ---");
  fs.writeFileSync(myraaPath, myraaInitialContent, "utf-8");
  fs.writeFileSync(riaPath, riaInitialContent, "utf-8");
  fs.writeFileSync(mikePath, mikeInitialContent, "utf-8");

  const myraaFinalContent = fs.readFileSync(myraaPath, "utf-8");
  const riaFinalContent = fs.readFileSync(riaPath, "utf-8");
  const mikeFinalContent = fs.readFileSync(mikePath, "utf-8");

  assert(myraaFinalContent === myraaInitialContent, "Cleanup: memories.json cleanly restored to baseline");
  assert(riaFinalContent === riaInitialContent, "Cleanup: memories_ria.json cleanly restored to baseline");
  assert(mikeFinalContent === mikeInitialContent, "Cleanup: memories_mike.json cleanly restored to baseline");

  console.log("\n=========================================================================");
  console.log(`STRESS TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("=========================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMemoryStressTest().catch(err => {
  console.error("Fatal stress test error:", err);
  process.exit(1);
});
