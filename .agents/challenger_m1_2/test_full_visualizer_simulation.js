/**
 * Full Component Logic Simulator for MyraaCoreVisualizer (Extended)
 * Challenger 2 - Milestone 1
 */

import assert from 'assert';

console.log("=== EXTENDED COMPONENT RENDER SIMULATION & EDGE CASE HARNESS ===");

// Mock Canvas 2D Context
class MockCanvasContext {
  constructor() {
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 1;
    this.savedState = [];
  }

  clearRect(x, y, w, h) {}
  save() { this.savedState.push({}); }
  restore() { this.savedState.pop(); }
  beginPath() {}
  closePath() {}
  moveTo(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Canvas moveTo received non-finite values: (${x}, ${y})`);
    }
  }
  lineTo(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Canvas lineTo received non-finite values: (${x}, ${y})`);
    }
  }
  arc(x, y, radius, startAngle, endAngle) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius)) {
      throw new Error(`Canvas arc received non-finite values: (${x}, ${y}, radius: ${radius})`);
    }
    if (radius < 0) {
      throw new Error(`Canvas arc received negative radius: ${radius}`);
    }
  }
  fill() {
    this.verifyColor(this.fillStyle);
  }
  stroke() {
    this.verifyColor(this.strokeStyle);
  }
  createLinearGradient(x0, y0, x1, y1) {
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
      throw new Error(`createLinearGradient received non-finite coordinates: (${x0},${y0}) -> (${x1},${y1})`);
    }
    return {
      addColorStop: (offset, color) => {
        if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
          throw new Error(`addColorStop invalid offset: ${offset}`);
        }
        this.verifyColor(color);
      }
    };
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) {
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(r0) ||
        !Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(r1)) {
      throw new Error(`createRadialGradient received non-finite parameters: r0=${r0}, r1=${r1}`);
    }
    if (r0 < 0 || r1 < 0) {
      throw new Error(`createRadialGradient received negative radius: r0=${r0}, r1=${r1}`);
    }
    return {
      addColorStop: (offset, color) => {
        if (!Number.isFinite(offset) || offset < 0 || offset > 1) {
          throw new Error(`addColorStop invalid offset: ${offset}`);
        }
        this.verifyColor(color);
      }
    };
  }
  fillRect(x, y, w, h) {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(h)) {
      throw new Error(`fillRect non-finite dimensions: (${x},${y},${w},${h})`);
    }
  }
  translate(x, y) {}
  
  verifyColor(colorStr) {
    if (typeof colorStr !== 'string' && typeof colorStr !== 'object') {
      throw new Error(`Invalid fillStyle/strokeStyle type: ${typeof colorStr}`);
    }
    if (typeof colorStr === 'string') {
      if (colorStr.includes('NaN') || colorStr.includes('undefined') || colorStr.includes('null') || colorStr.includes('Infinity')) {
        throw new Error(`Invalid CSS color string: "${colorStr}"`);
      }
    }
  }
}

// Visualizer State Simulation Harness
function runRenderFrame({
  ctx,
  width,
  height,
  systemTime,
  state,
  characterState,
  activeAssistant,
  themeColor,
  session,
  particles,
  bassVolRef,
  midVolRef,
  trebleVolRef,
  speechVolRef,
  currentPrimaryRGB,
  currentSecondaryRGB,
  mouseRef,
  targetMouseRef
}) {
  ctx.clearRect(0, 0, width, height);

  const isRia = activeAssistant === "Ria" || themeColor === "violet";
  let targetColors;
  if (isRia) {
    targetColors = {
      primary: { r: 168, g: 85, b: 247 },
      secondary: { r: 244, g: 63, b: 94 },
    };
  } else {
    switch (themeColor) {
      case "crimson":
        targetColors = { primary: { r: 225, g: 29, b: 72 }, secondary: { r: 234, g: 88, b: 12 } }; break;
      case "emerald":
        targetColors = { primary: { r: 16, g: 185, b: 129 }, secondary: { r: 13, g: 148, b: 136 } }; break;
      case "celestial":
        targetColors = { primary: { r: 14, g: 165, b: 233 }, secondary: { r: 99, g: 102, b: 241 } }; break;
      case "gold":
        targetColors = { primary: { r: 234, g: 179, b: 8 }, secondary: { r: 245, g: 158, b: 11 } }; break;
      case "rose":
        targetColors = { primary: { r: 236, g: 72, b: 153 }, secondary: { r: 244, g: 63, b: 94 } }; break;
      default:
        targetColors = { primary: { r: 6, g: 182, b: 212 }, secondary: { r: 245, g: 158, b: 11 } }; break;
    }
  }

  const pRGB = currentPrimaryRGB;
  const sRGB = currentSecondaryRGB;

  pRGB.r += (targetColors.primary.r - pRGB.r) * 0.06;
  pRGB.g += (targetColors.primary.g - pRGB.g) * 0.06;
  pRGB.b += (targetColors.primary.b - pRGB.b) * 0.06;

  sRGB.r += (targetColors.secondary.r - sRGB.r) * 0.06;
  sRGB.g += (targetColors.secondary.g - sRGB.g) * 0.06;
  sRGB.b += (targetColors.secondary.b - sRGB.b) * 0.06;

  const primaryCSS = `rgba(${Math.round(pRGB.r)}, ${Math.round(pRGB.g)}, ${Math.round(pRGB.b)}`;
  const secondaryCSS = `rgba(${Math.round(sRGB.r)}, ${Math.round(sRGB.g)}, ${Math.round(sRGB.b)}`;

  let activeAnalyser = null;
  if (state === "speaking" && session?.outputAnalyser) {
    activeAnalyser = session.outputAnalyser;
  } else if (state === "listening" && session?.inputAnalyser) {
    activeAnalyser = session.inputAnalyser;
  }

  let rawBass = 0;
  let rawMid = 0;
  let rawTreble = 0;

  if (activeAnalyser) {
    try {
      const bufferLength = 128;
      const dataArray = new Uint8Array(bufferLength);
      activeAnalyser.getByteFrequencyData(dataArray);

      let bassSum = 0;
      for (let i = 0; i <= 12; i++) bassSum += dataArray[i];
      rawBass = bassSum / (13 * 255);

      let midSum = 0;
      for (let i = 13; i <= 45; i++) midSum += dataArray[i];
      rawMid = midSum / (33 * 255);

      let trebleSum = 0;
      for (let i = 46; i < bufferLength; i++) trebleSum += dataArray[i];
      rawTreble = trebleSum / ((bufferLength - 46) * 255);
    } catch (e) {}
  }

  bassVolRef.current += (rawBass - bassVolRef.current) * 0.15;
  midVolRef.current += (rawMid - midVolRef.current) * 0.15;
  trebleVolRef.current += (rawTreble - trebleVolRef.current) * 0.15;
  const combinedVolume = (bassVolRef.current + midVolRef.current + trebleVolRef.current) / 3;
  speechVolRef.current += (combinedVolume - speechVolRef.current) * 0.15;

  mouseRef.x += (targetMouseRef.x - mouseRef.x) * 0.05;
  mouseRef.y += (targetMouseRef.y - mouseRef.y) * 0.05;

  const mouseCanvasX = mouseRef.x * width;
  const mouseCanvasY = mouseRef.y * height;
  const parallaxOffsetX = (mouseRef.x - 0.5) * 2;
  const parallaxOffsetY = (mouseRef.y - 0.5) * 2;

  const baseScale = height / 440;
  const s = Math.max(0.95, Math.min(1.85, baseScale));
  const centerX = width / 2 + parallaxOffsetX * 25;

  // 1. STAGE VOLUMETRIC PROJECTOR BEAMS
  ctx.save();
  const projectorCenterY = height + 40;
  const baseDiameterX = (280 + bassVolRef.current * 110) * s;

  const conicalBeamGrad = ctx.createLinearGradient(centerX, height * 0.2, centerX, height);
  const beamOpacityBase = state === "speaking" ? 0.22 : state === "listening" ? 0.15 : 0.08;
  conicalBeamGrad.addColorStop(0, "rgba(0,0,0,0)");
  conicalBeamGrad.addColorStop(0.35, `${primaryCSS}, ${beamOpacityBase * 0.3})`);
  conicalBeamGrad.addColorStop(0.7, `${primaryCSS}, ${beamOpacityBase * 0.6})`);
  conicalBeamGrad.addColorStop(1, `${secondaryCSS}, ${beamOpacityBase * 1.0})`);

  ctx.fillStyle = conicalBeamGrad;
  ctx.beginPath();
  ctx.moveTo(centerX - baseDiameterX * 0.35, projectorCenterY - 145);
  ctx.lineTo(centerX + baseDiameterX * 0.35, projectorCenterY - 145);
  ctx.lineTo(centerX + baseDiameterX * 1.6, height);
  ctx.lineTo(centerX - baseDiameterX * 1.6, height);
  ctx.closePath();
  ctx.fill();

  const sideBeamAngle = Math.sin(systemTime * 0.0008) * 40;
  ctx.fillStyle = `${primaryCSS}, ${0.03 + trebleVolRef.current * 0.08})`;
  ctx.beginPath();
  ctx.moveTo(centerX - width * 0.3 + sideBeamAngle, height);
  ctx.lineTo(centerX, height * 0.3);
  ctx.lineTo(centerX + width * 0.3 + sideBeamAngle, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 2. GLITCH EFFECT
  const applyGlitch = (state === "connecting" && Math.random() < 0.12) || (Math.random() < 0.004);
  if (applyGlitch) {
    ctx.save();
    ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 3);
    ctx.fillStyle = Math.random() < 0.5 ? `${secondaryCSS}, 0.04)` : `${primaryCSS}, 0.04)`;
    ctx.fillRect(0, 0, width, height);
  }

  // 3. PARTICLE RENDER LOOP
  const isThinking = characterState === "thinking" || state === "connecting";
  const stateSpeedMult = isThinking ? 2.5 : state === "speaking" ? 1.6 : state === "listening" ? 1.2 : 0.6;

  particles.forEach((p) => {
    let riseSpeed = p.speed * stateSpeedMult;
    if (p.tier === 2) {
      riseSpeed *= (1 + midVolRef.current * 2.5);
    }

    p.y -= riseSpeed;
    p.x += Math.sin(p.y * 0.012 + p.phase + systemTime * 0.001) * (0.3 + p.tier * 0.2);

    let currentOpacity = p.opacity;

    if (p.tier === 1) {
      const shimmer = Math.sin(systemTime * 0.002 + p.phase) * 0.15 + trebleVolRef.current * 0.3;
      currentOpacity = Math.max(0.05, Math.min(0.6, p.opacity + shimmer));
      p.x += parallaxOffsetX * 0.1;
    } else if (p.tier === 2) {
      p.x += parallaxOffsetX * 0.35;
    } else if (p.tier === 3) {
      p.x += parallaxOffsetX * 0.7;
      const dx = p.x - mouseCanvasX;
      const dy = p.y - mouseCanvasY;
      const dist = Math.hypot(dx, dy);
      if (dist < 120 && dist > 0) {
        const force = (120 - dist) / 120;
        p.x += (dx / dist) * force * 3.5;
        p.y += (dy / dist) * force * 3.5;
      }
    }

    if (p.y < height * 0.08) {
      p.y = height + Math.random() * 20;
      p.x = Math.random() * width;
    }

    const fadeY = Math.max(0, Math.min(1, p.y / height));
    const finalAlpha = currentOpacity * fadeY;

    ctx.beginPath();
    if (p.tier === 2) {
      const rad = p.size * s * (1 + speechVolRef.current * 0.8);
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 2);
      grad.addColorStop(0, `${primaryCSS}, ${finalAlpha})`);
      grad.addColorStop(1, `${secondaryCSS}, 0)`);
      ctx.fillStyle = grad;
      ctx.arc(p.x, p.y, rad * 2, 0, Math.PI * 2);
    } else {
      ctx.fillStyle = p.tier === 3 
        ? `${secondaryCSS}, ${finalAlpha * 0.9})`
        : `${primaryCSS}, ${finalAlpha * 0.6})`;
      ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2);
    }
    ctx.fill();
  });

  if (isThinking) {
    const tier3Nodes = particles.filter((p) => p.tier === 3);
    ctx.lineWidth = 0.75;
    for (let i = 0; i < tier3Nodes.length; i++) {
      for (let j = i + 1; j < tier3Nodes.length; j++) {
        const n1 = tier3Nodes[i];
        const n2 = tier3Nodes[j];
        const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
        if (dist < 85) {
          const alpha = (1 - dist / 85) * 0.35;
          ctx.strokeStyle = `${primaryCSS}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(n1.x, n1.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }
    }
  }

  if (applyGlitch) {
    ctx.restore();
  }
}

// Scenario 4: Negative Volume Ref Spikes (e.g. speechVolRef = -2.0)
console.log("\n--- TEST SCENARIO 4: Negative Volume Ref (Negative Ember Radius) ---");
const ctx4 = new MockCanvasContext();
const particles4 = [
  { x: 100, y: 200, speed: 0.1, size: 2, opacity: 0.5, tier: 2, phase: 0 },
];
const bassVol4 = { current: 0 };
const midVol4 = { current: 0 };
const trebleVol4 = { current: 0 };
const speechVol4 = { current: -2.0 }; // Causes (1 + -2.0 * 0.8) = -0.6 radius!
const pRGB4 = { r: 6, g: 182, b: 212 };
const sRGB4 = { r: 245, g: 158, b: 11 };

let negativeRadiusErrors = [];
try {
  runRenderFrame({
    ctx: ctx4, width: 800, height: 600, systemTime: 100,
    state: "speaking", characterState: "talking", activeAssistant: "MYRAA", themeColor: "cyan",
    session: null, particles: particles4, bassVolRef: bassVol4, midVolRef: midVol4, trebleVolRef: trebleVol4, speechVolRef: speechVol4,
    currentPrimaryRGB: pRGB4, currentSecondaryRGB: sRGB4, mouseRef: {x:0.5, y:0.4}, targetMouseRef: {x:0.5, y:0.4}
  });
} catch (err) {
  negativeRadiusErrors.push(err.message);
}
console.log(`Negative volume ref completed. Errors: ${negativeRadiusErrors.length}`);
if (negativeRadiusErrors.length > 0) {
  console.log("Sample error from negative volume ref:", negativeRadiusErrors[0]);
}

// Scenario 5: Particle at y=0 when height=0
console.log("\n--- TEST SCENARIO 5: Particle at y=0 when Canvas Height=0 ---");
const ctx5 = new MockCanvasContext();
const particles5 = [
  { x: 0, y: 0, speed: 0.1, size: 1, opacity: 0.5, tier: 1, phase: 0 },
];
const bassVol5 = { current: 0 };
const midVol5 = { current: 0 };
const trebleVol5 = { current: 0 };
const speechVol5 = { current: 0 };

let nanAlphaErrors = [];
try {
  runRenderFrame({
    ctx: ctx5, width: 0, height: 0, systemTime: 100,
    state: "speaking", characterState: "talking", activeAssistant: "MYRAA", themeColor: "cyan",
    session: null, particles: particles5, bassVolRef: bassVol5, midVolRef: midVol5, trebleVolRef: trebleVol5, speechVolRef: speechVol5,
    currentPrimaryRGB: { r: 6, g: 182, b: 212 }, currentSecondaryRGB: { r: 245, g: 158, b: 11 }, mouseRef: {x:0.5, y:0.4}, targetMouseRef: {x:0.5, y:0.4}
  });
} catch (err) {
  nanAlphaErrors.push(err.message);
}
console.log(`y=0 when height=0 completed. Errors: ${nanAlphaErrors.length}`);
if (nanAlphaErrors.length > 0) {
  console.log("Sample error from NaN alpha:", nanAlphaErrors[0]);
}

console.log("\n=== EXTENDED SIMULATION COMPLETE ===");
