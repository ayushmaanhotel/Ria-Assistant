import { renderSparklineTest, telemetryStateReducerTest } from "./telemetry_harness";

console.log("=== EMPIRICAL TEST: SystemTelemetry.tsx ===");

// 1. Test renderSparkline edge cases
console.log("\n--- Testing renderSparkline ---");
const testCasesSparkline = [
  { name: "Normal array", data: [10, 20, 30, 40, 50] },
  { name: "Empty array", data: [] },
  { name: "Single item array", data: [50] },
  { name: "Array with NaN", data: [10, NaN, 30] },
  { name: "Array with undefined", data: [10, undefined as any, 30] },
  { name: "Array with null", data: [10, null as any, 30] },
  { name: "Array with Infinity", data: [10, Infinity, 30] },
];

for (const tc of testCasesSparkline) {
  try {
    const result = renderSparklineTest(tc.data, "#22d3ee");
    console.log(`[${tc.name}] -> Output points: "${result}"`);
    if (result.includes("NaN") || result.includes("Infinity")) {
      console.log(`  ❌ FLAW DETECTED: Invalid SVG points produced: "${result}"`);
    } else {
      console.log(`  ✅ Passed without NaN/Infinity`);
    }
  } catch (err: any) {
    console.log(`  ❌ CRASH: ${err.message}`);
  }
}

// 2. Test Telemetry State Clamping & Updates
console.log("\n--- Testing Telemetry State Reducer / Updaters ---");
const stateCases = [
  {
    name: "Normal state",
    prev: { cpuPercent: 24, ramPercent: 42, ramTotalGB: 32.0, gpuPercent: 18, vramTotalGB: 8.0, cpuHistory: [25], ramHistory: [42], gpuHistory: [18] }
  },
  {
    name: "Corrupted NaN cpuPercent",
    prev: { cpuPercent: NaN, ramPercent: 42, ramTotalGB: 32.0, gpuPercent: 18, vramTotalGB: 8.0, cpuHistory: [25], ramHistory: [42], gpuHistory: [18] }
  },
  {
    name: "Undefined metrics in state",
    prev: { cpuPercent: undefined as any, ramPercent: undefined as any, ramTotalGB: undefined as any, gpuPercent: undefined as any, vramTotalGB: undefined as any, cpuHistory: [25], ramHistory: [42], gpuHistory: [18] }
  },
  {
    name: "Zero total RAM (division by zero)",
    prev: { cpuPercent: 50, ramPercent: 50, ramTotalGB: 0, gpuPercent: 50, vramTotalGB: 0, cpuHistory: [50], ramHistory: [50], gpuHistory: [50] }
  }
];

for (const sc of stateCases) {
  try {
    const nextState = telemetryStateReducerTest(sc.prev);
    console.log(`[${sc.name}] -> Next state:`, {
      cpuPercent: nextState.cpuPercent,
      ramPercent: nextState.ramPercent,
      ramUsedGB: nextState.ramUsedGB,
      gpuPercent: nextState.gpuPercent,
      vramUsedGB: nextState.vramUsedGB
    });
    if (
      Number.isNaN(nextState.cpuPercent) ||
      Number.isNaN(nextState.ramPercent) ||
      Number.isNaN(nextState.ramUsedGB) ||
      Number.isNaN(nextState.gpuPercent) ||
      Number.isNaN(nextState.vramUsedGB)
    ) {
      console.log(`  ❌ FLAW DETECTED: State contains NaN values!`);
    } else {
      console.log(`  ✅ Passed metric state update`);
    }
  } catch (err: any) {
    console.log(`  ❌ CRASH: ${err.message}`);
  }
}
