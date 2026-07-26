// Replicating exact logic from SystemTelemetry.tsx lines 160-182 and lines 86-117

export const renderSparklineTest = (data: number[], colorClass: string) => {
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

export const telemetryStateReducerTest = (prev: any) => {
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
