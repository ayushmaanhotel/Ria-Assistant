const renderSparklineTest = (data, colorClass) => {
  const min = 0;
  const max = 100;
  const width = 140;
  const height = 36;
  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * width;
    const y = height - ((val - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(" ");

  return points;
};

const telemetryStateReducerTest = (prev) => {
  const cpuNoise = (Math.random() - 0.5) * 8;
  const newCpu = Math.min(95, Math.max(8, Math.round(prev.cpuPercent + cpuNoise)));

  const ramNoise = (Math.random() - 0.5) * 2;
  const newRamPercent = Math.min(90, Math.max(20, parseFloat((prev.ramPercent + ramNoise).toFixed(1))));
  const newRamUsed = parseFloat(((newRamPercent / 100) * prev.ramTotalGB).toFixed(1));

  const gpuNoise = (Math.random() - 0.5) * 6;
  const newGpuPercent = Math.min(95, Math.max(5, Math.round(prev.gpuPercent + gpuNoise)));
  const newVramUsed = parseFloat(((newGpuPercent / 100) * prev.vramTotalGB).toFixed(1));

  const newCpuHist = [...(prev.cpuHistory || []).slice(1), newCpu];
  const newRamHist = [...(prev.ramHistory || []).slice(1), newRamPercent];
  const newGpuHist = [...(prev.gpuHistory || []).slice(1), newGpuPercent];

  return {
    ...prev,
    cpuPercent: newCpu,
    ramPercent: newRamPercent,
    ramUsedGB: newRamUsed,
    gpuPercent: newGpuPercent,
    vramUsedGB: newVramUsed,
    agentOnline: true,
    agentToolCount: 52,
    agentLatencyMs: 10,
    cpuHistory: newCpuHist,
    ramHistory: newRamHist,
    gpuHistory: newGpuHist,
  };
};

console.log("=== EMPIRICAL TEST: SystemTelemetry.tsx ===");

console.log("\n--- Testing renderSparkline ---");
const testCasesSparkline = [
  { name: "Normal array", data: [10, 20, 30, 40, 50] },
  { name: "Empty array", data: [] },
  { name: "Single item array", data: [50] },
  { name: "Array with NaN", data: [10, NaN, 30] },
  { name: "Array with undefined", data: [10, undefined, 30] },
  { name: "Array with null", data: [10, null, 30] },
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
  } catch (err) {
    console.log(`  ❌ CRASH: ${err.message}`);
  }
}

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
    prev: { cpuPercent: undefined, ramPercent: undefined, ramTotalGB: undefined, gpuPercent: undefined, vramTotalGB: undefined, cpuHistory: [25], ramHistory: [42], gpuHistory: [18] }
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
  } catch (err) {
    console.log(`  ❌ CRASH: ${err.message}`);
  }
}
