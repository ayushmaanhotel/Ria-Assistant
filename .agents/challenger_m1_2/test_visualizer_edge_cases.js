/**
 * Empirical Test Harness for MyraaCoreVisualizer logic
 * Challenger 2 - Milestone 1
 */

import assert from 'assert';

console.log("=== STARTING EMPIRICAL EDGE-CASE TESTS FOR VISUALIZER ===");

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${name}`);
  } catch (err) {
    failedTests++;
    console.error(`[FAIL] ${name}\n  Error: ${err.message}`);
    failures.push({ name, error: err.message, stack: err.stack });
  }
}

// -------------------------------------------------------------
// 1. Audio Volume Ref Handling Tests
// -------------------------------------------------------------
test("Audio FFT processing with null/undefined session", () => {
  const session = null;
  const state = "speaking";
  
  let activeAnalyser = null;
  if (state === "speaking" && session?.outputAnalyser) {
    activeAnalyser = session.outputAnalyser;
  }
  
  let rawBass = 0, rawMid = 0, rawTreble = 0;
  if (activeAnalyser) {
    rawBass = 1;
  }
  
  assert.strictEqual(rawBass, 0);
  assert.strictEqual(rawMid, 0);
  assert.strictEqual(rawTreble, 0);
});

test("Audio Volume lerp with Extreme Spikes (Infinity, NaN, -100, 10000)", () => {
  const bassVolumeRef = { current: 0 };
  const midVolumeRef = { current: 0 };
  const trebleVolumeRef = { current: 0 };
  const speechVolumeRef = { current: 0 };

  // Case A: Spike to NaN
  let rawBass = NaN;
  bassVolumeRef.current += (rawBass - bassVolumeRef.current) * 0.15;
  assert(Number.isNaN(bassVolumeRef.current), "bassVolumeRef should become NaN if rawBass is NaN");

  // Check downstream radial gradient calculations with NaN volume
  const speechVol = bassVolumeRef.current; // NaN
  const pSize = 2.0;
  const s = 1.0;
  const rad = pSize * s * (1 + speechVol * 0.8);
  assert(Number.isNaN(rad), "Radial gradient radius becomes NaN when audio volume is NaN");

  // Canvas createRadialGradient throws error when r is NaN or negative or infinite
  const isFiniteRad = Number.isFinite(rad) && rad >= 0;
  assert.strictEqual(isFiniteRad, false, "NaN radius is NOT finite - canvas createRadialGradient WILL crash!");
});

test("Audio Volume lerp with Negative Spikes", () => {
  const bassVolumeRef = { current: -5.0 };
  const pSize = 1.0;
  const s = 1.0;
  const rad = pSize * s * (1 + bassVolumeRef.current * 0.8); // 1.0 * (1 - 4.0) = -3.0
  assert(rad < 0, "Radius became negative!");
  const isCanvasValidRad = Number.isFinite(rad) && rad >= 0;
  assert.strictEqual(isCanvasValidRad, false, "Negative radius is INVALID for canvas createRadialGradient!");
});

test("Audio FFT with Analyser throwing error or invalid buffer length", () => {
  const mockAnalyser = {
    getByteFrequencyData: (arr) => {
      throw new Error("Context is closed");
    }
  };
  
  let rawBass = 0, rawMid = 0, rawTreble = 0;
  try {
    const bufferLength = 128;
    const dataArray = new Uint8Array(bufferLength);
    mockAnalyser.getByteFrequencyData(dataArray);
    
    let bassSum = 0;
    for (let i = 0; i <= 12; i++) bassSum += dataArray[i];
    rawBass = bassSum / (13 * 255);
  } catch (e) {
    // caught
  }
  
  assert.strictEqual(rawBass, 0, "rawBass should gracefully fallback to 0 when analyser throws");
});


// -------------------------------------------------------------
// 2. Canvas Resizing and Tab Switching Tests
// -------------------------------------------------------------
test("Canvas render calculation when container size is 0x0 (hidden/collapsed)", () => {
  const width = 0;
  const height = 0;

  // Particle update logic when height = 0
  const pY = 10;
  const fadeY = Math.max(0, Math.min(1, pY / height)); // 10 / 0 = Infinity -> Math.min(1, Infinity) = 1
  const pYZero = 0;
  const fadeYZero = Math.max(0, Math.min(1, pYZero / height)); // 0 / 0 = NaN -> Math.max(0, Math.min(1, NaN)) = NaN
  
  assert(Number.isNaN(fadeYZero), "fadeY becomes NaN when particle Y is 0 and canvas height is 0!");

  const opacity = 0.5;
  const finalAlpha = opacity * fadeYZero; // NaN
  const primaryCSS = "rgba(6, 182, 212";
  const cssString = `${primaryCSS}, ${finalAlpha * 0.6})`;

  assert.strictEqual(cssString, "rgba(6, 182, 212, NaN)", "Invalid CSS rgba color generated when height=0!");
});

test("Canvas particle scale calculation when height is very small or 0", () => {
  const height = 0;
  const baseScale = height / 440; // 0
  const s = Math.max(0.95, Math.min(1.85, baseScale)); // 0.95
  assert.strictEqual(s, 0.95, "Scale clamps to 0.95 min");
});

test("Canvas beam linear gradient when width or height is 0", () => {
  const width = 0;
  const height = 0;
  const centerX = width / 2; // 0
  
  assert.strictEqual(centerX, 0);
});

// -------------------------------------------------------------
// 3. Color Interpolation Bounds & RGB Clamping Tests
// -------------------------------------------------------------
function getTargetRGB(themeColor, activeAssistant) {
  const isRia = activeAssistant === "Ria" || themeColor === "violet";
  if (isRia) {
    return {
      primary: { r: 168, g: 85, b: 247 },   // Purple-500
      secondary: { r: 244, g: 63, b: 94 },  // Rose-500
    };
  }
  
  switch (themeColor) {
    case "crimson":
      return { primary: { r: 225, g: 29, b: 72 }, secondary: { r: 234, g: 88, b: 12 } };
    case "emerald":
      return { primary: { r: 16, g: 185, b: 129 }, secondary: { r: 13, g: 148, b: 136 } };
    case "celestial":
      return { primary: { r: 14, g: 165, b: 233 }, secondary: { r: 99, g: 102, b: 241 } };
    case "gold":
      return { primary: { r: 234, g: 179, b: 8 }, secondary: { r: 245, g: 158, b: 11 } };
    case "rose":
      return { primary: { r: 236, g: 72, b: 153 }, secondary: { r: 244, g: 63, b: 94 } };
    default: // MYRAA Cyan / Amber
      return { primary: { r: 6, g: 182, b: 212 }, secondary: { r: 245, g: 158, b: 11 } };
  }
}

test("Theme color mapping for all valid and invalid inputs", () => {
  const themes = ["violet", "crimson", "emerald", "celestial", "gold", "rose", "charcoal", "unknown", null, undefined];
  themes.forEach(theme => {
    const res = getTargetRGB(theme, "MYRAA");
    assert(res.primary && res.secondary, `Failed for theme: ${theme}`);
    assert(res.primary.r >= 0 && res.primary.r <= 255, `Primary R out of range for theme: ${theme}`);
    assert(res.primary.g >= 0 && res.primary.g <= 255, `Primary G out of range for theme: ${theme}`);
    assert(res.primary.b >= 0 && res.primary.b <= 255, `Primary B out of range for theme: ${theme}`);
  });
});

test("Color interpolation smooth transition step and bounds", () => {
  const pRGB = { r: 6, g: 182, b: 212 };
  const targetColors = getTargetRGB("crimson", "MYRAA");

  for (let step = 0; step < 100; step++) {
    pRGB.r += (targetColors.primary.r - pRGB.r) * 0.06;
    pRGB.g += (targetColors.primary.g - pRGB.g) * 0.06;
    pRGB.b += (targetColors.primary.b - pRGB.b) * 0.06;

    const roundedR = Math.round(pRGB.r);
    const roundedG = Math.round(pRGB.g);
    const roundedB = Math.round(pRGB.b);

    assert(roundedR >= 0 && roundedR <= 255, `R out of bounds at step ${step}: ${roundedR}`);
    assert(roundedG >= 0 && roundedG <= 255, `G out of bounds at step ${step}: ${roundedG}`);
    assert(roundedB >= 0 && roundedB <= 255, `B out of bounds at step ${step}: ${roundedB}`);
  }

  assert(Math.abs(pRGB.r - 225) < 1.0, `pRGB.r not close enough to 225: ${pRGB.r}`);
});

test("Color interpolation when current RGB contains NaN or out-of-bound values", () => {
  const pRGB = { r: NaN, g: 300, b: -50 };
  const targetColors = getTargetRGB("emerald", "MYRAA");

  pRGB.r += (targetColors.primary.r - pRGB.r) * 0.06;
  pRGB.g += (targetColors.primary.g - pRGB.g) * 0.06;
  pRGB.b += (targetColors.primary.b - pRGB.b) * 0.06;

  assert(Number.isNaN(pRGB.r), "pRGB.r remains NaN if initialized to NaN without clamping/fallback");

  const primaryCSS = `rgba(${Math.round(pRGB.r)}, ${Math.round(pRGB.g)}, ${Math.round(pRGB.b)}`;
  assert(primaryCSS.includes("NaN"), "Generated CSS contains invalid NaN string!");
});

console.log(`\n=== EMPIRICAL TEST SUMMARY ===`);
console.log(`Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);

if (failures.length > 0) {
  console.log("\nObserved Failures / Unclamped Edge Cases:");
  failures.forEach(f => console.log(` - ${f.name}: ${f.error}`));
}
