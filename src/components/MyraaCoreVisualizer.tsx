import React, { useEffect, useRef, useState } from "react";
import { MyraaAudioSession, LiveState } from "../lib/audio";
import { Sparkles } from "lucide-react";

export type MyraaEmotion = 
  | "idle" 
  | "happy" 
  | "excited" 
  | "curious" 
  | "thinking" 
  | "proud" 
  | "sad" 
  | "confused" 
  | "surprised" 
  | "embarrassed" 
  | "playful";

interface MyraaCoreVisualizerProps {
  session: MyraaAudioSession | null;
  state: LiveState;
  themeColor: string; // Violet, crimson, emerald, celestial, gold, rose, charcoal
  activeEmotion?: MyraaEmotion;
  characterState: "idle" | "thinking" | "talking";
  activeAssistant?: "MYRAA" | "Ria";
  characterZoom?: number;
  characterFit?: "contain" | "cover";
}

interface TieredParticle {
  x: number;
  y: number;
  speed: number;
  size: number;
  opacity: number;
  tier: 1 | 2 | 3;
  phase: number;
  vx: number;
  vy: number;
}

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export const MyraaCoreVisualizer: React.FC<MyraaCoreVisualizerProps> = ({
  session,
  state,
  themeColor,
  activeEmotion = "idle",
  characterState,
  activeAssistant = "MYRAA",
  characterZoom = 85,
  characterFit = "contain",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Video element refs for character state machine
  const idleVideoRef = useRef<HTMLVideoElement | null>(null);
  const thinkingVideoRef = useRef<HTMLVideoElement | null>(null);
  const talkingVideoRef = useRef<HTMLVideoElement | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);

  const handleVideoError = (videoName: string) => {
    console.warn(`[Myraa Web Video] Failed to load video source for: ${videoName}`);
    setHasError(true);
  };

  // Interaction and tracking references
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.4 });
  const targetMouseRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.4 });
  
  // Physics & Animation states
  const speechVolumeRef = useRef<number>(0);
  const bassVolumeRef = useRef<number>(0);
  const midVolumeRef = useRef<number>(0);
  const trebleVolumeRef = useRef<number>(0);

  // Smooth color interpolation state
  const currentPrimaryRGB = useRef<RGBColor>({ r: 6, g: 182, b: 212 });
  const currentSecondaryRGB = useRef<RGBColor>({ r: 245, g: 158, b: 11 });

  // Floating sci-fi background particle arrays
  const particlesRef = useRef<TieredParticle[]>([]);

  // Synchronized video playback state manager
  useEffect(() => {
    const playVideo = (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      try {
        videoEl.currentTime = 0;
        const playPromise = videoEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            console.warn("Autoplay block detected, retrying muted play:", error);
          });
        }
      } catch (err) {}
    };

    const pauseVideo = (videoEl: HTMLVideoElement | null) => {
      if (!videoEl) return;
      try {
        videoEl.pause();
      } catch (err) {}
    };

    if (characterState === "idle") {
      playVideo(idleVideoRef.current);
      pauseVideo(thinkingVideoRef.current);
      pauseVideo(talkingVideoRef.current);
    } else if (characterState === "thinking") {
      playVideo(thinkingVideoRef.current);
      pauseVideo(idleVideoRef.current);
      pauseVideo(talkingVideoRef.current);
    } else if (characterState === "talking") {
      playVideo(talkingVideoRef.current);
      pauseVideo(idleVideoRef.current);
      pauseVideo(thinkingVideoRef.current);
    }
  }, [characterState]);

  // Cursor position tracking hook
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetMouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  // Determine target colors based on assistant persona & themeColor
  const getTargetRGB = (): { primary: RGBColor; secondary: RGBColor } => {
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
  };

  // Main high speed Canvas graphics rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Generate 3-tiered responsive stardust particle field
    const generateParticles = () => {
      const particles: TieredParticle[] = [];
      
      // Tier 1: Micro-stardust background field (80-100 particles)
      const t1Count = Math.min(90, Math.floor(width / 16));
      for (let i = 0; i < t1Count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: Math.random() * 0.12 + 0.05,
          size: Math.random() * 0.8 + 0.4,
          opacity: Math.random() * 0.35 + 0.15,
          tier: 1,
          phase: Math.random() * Math.PI * 2,
          vx: 0,
          vy: 0,
        });
      }

      // Tier 2: Midground core embers (25 particles)
      const t2Count = 25;
      for (let i = 0; i < t2Count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: Math.random() * 0.4 + 0.2,
          size: Math.random() * 1.7 + 1.5,
          opacity: Math.random() * 0.6 + 0.3,
          tier: 2,
          phase: Math.random() * Math.PI * 2,
          vx: 0,
          vy: 0,
        });
      }

      // Tier 3: Foreground cursor-reactive nodes (15 particles)
      const t3Count = 15;
      for (let i = 0; i < t3Count; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: Math.random() * 0.6 + 0.3,
          size: Math.random() * 2.0 + 2.0,
          opacity: Math.random() * 0.7 + 0.3,
          tier: 3,
          phase: Math.random() * Math.PI * 2,
          vx: 0,
          vy: 0,
        });
      }

      particlesRef.current = particles;
    };

    if (particlesRef.current.length === 0) {
      generateParticles();
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
      generateParticles();
    };

    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const systemTime = performance.now();

      // Smooth color interpolation between active assistant themes
      const targetColors = getTargetRGB();
      const pRGB = currentPrimaryRGB.current;
      const sRGB = currentSecondaryRGB.current;

      const lerpChannel = (current: number, target: number, rate: number = 0.06) => {
        const c = isFinite(current) ? current : target;
        const t = isFinite(target) ? target : c;
        const val = c + (t - c) * rate;
        return Math.max(0, Math.min(255, Math.round(isFinite(val) ? val : t)));
      };

      const safeAlpha = (a: number) => Math.max(0, Math.min(1, isFinite(a) ? a : 0));

      pRGB.r = lerpChannel(pRGB.r, targetColors.primary.r);
      pRGB.g = lerpChannel(pRGB.g, targetColors.primary.g);
      pRGB.b = lerpChannel(pRGB.b, targetColors.primary.b);

      sRGB.r = lerpChannel(sRGB.r, targetColors.secondary.r);
      sRGB.g = lerpChannel(sRGB.g, targetColors.secondary.g);
      sRGB.b = lerpChannel(sRGB.b, targetColors.secondary.b);

      const primaryCSS = `rgba(${pRGB.r}, ${pRGB.g}, ${pRGB.b}`;
      const secondaryCSS = `rgba(${sRGB.r}, ${sRGB.g}, ${sRGB.b}`;

      // Multi-band Audio FFT Data Processing (256 FFT -> 128 bins)
      let activeAnalyser: AnalyserNode | null = null;
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

      // Smooth multi-band volume tracking
      const safeBass = isFinite(rawBass) ? rawBass : 0;
      const safeMid = isFinite(rawMid) ? rawMid : 0;
      const safeTreble = isFinite(rawTreble) ? rawTreble : 0;

      const currentBass = isFinite(bassVolumeRef.current) ? bassVolumeRef.current : 0;
      const currentMid = isFinite(midVolumeRef.current) ? midVolumeRef.current : 0;
      const currentTreble = isFinite(trebleVolumeRef.current) ? trebleVolumeRef.current : 0;
      const currentSpeech = isFinite(speechVolumeRef.current) ? speechVolumeRef.current : 0;

      bassVolumeRef.current = Math.max(0, isFinite(currentBass + (safeBass - currentBass) * 0.15) ? currentBass + (safeBass - currentBass) * 0.15 : 0);
      midVolumeRef.current = Math.max(0, isFinite(currentMid + (safeMid - currentMid) * 0.15) ? currentMid + (safeMid - currentMid) * 0.15 : 0);
      trebleVolumeRef.current = Math.max(0, isFinite(currentTreble + (safeTreble - currentTreble) * 0.15) ? currentTreble + (safeTreble - currentTreble) * 0.15 : 0);

      const combinedVolume = (bassVolumeRef.current + midVolumeRef.current + trebleVolumeRef.current) / 3;
      const safeCombined = isFinite(combinedVolume) ? combinedVolume : 0;
      speechVolumeRef.current = Math.max(0, isFinite(currentSpeech + (safeCombined - currentSpeech) * 0.15) ? currentSpeech + (safeCombined - currentSpeech) * 0.15 : 0);

      // Parallax Mouse Lag
      mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.05;

      const mouseCanvasX = mouseRef.current.x * width;
      const mouseCanvasY = mouseRef.current.y * height;
      const parallaxOffsetX = (mouseRef.current.x - 0.5) * 2;
      const parallaxOffsetY = (mouseRef.current.y - 0.5) * 2;

      const baseScale = height / 440;
      const s = Math.max(0.95, Math.min(1.85, baseScale));
      const centerX = width / 2 + parallaxOffsetX * 25;

      // ==========================================
      // 1. STAGE VOLUMETRIC PROJECTOR BEAMS
      // ==========================================
      ctx.save();
      const projectorCenterY = height + 40;
      const baseDiameterX = (280 + bassVolumeRef.current * 110) * s;

      const conicalBeamGrad = ctx.createLinearGradient(centerX, height * 0.2, centerX, height);
      const beamOpacityBase = state === "speaking" ? 0.22 : state === "listening" ? 0.15 : 0.08;
      conicalBeamGrad.addColorStop(0, "rgba(0,0,0,0)");
      conicalBeamGrad.addColorStop(0.35, `${primaryCSS}, ${safeAlpha(beamOpacityBase * 0.3)})`);
      conicalBeamGrad.addColorStop(0.7, `${primaryCSS}, ${safeAlpha(beamOpacityBase * 0.6)})`);
      conicalBeamGrad.addColorStop(1, `${secondaryCSS}, ${safeAlpha(beamOpacityBase * 1.0)})`);

      ctx.fillStyle = conicalBeamGrad;
      ctx.beginPath();
      ctx.moveTo(centerX - baseDiameterX * 0.35, projectorCenterY - 145);
      ctx.lineTo(centerX + baseDiameterX * 0.35, projectorCenterY - 145);
      ctx.lineTo(centerX + baseDiameterX * 1.6, height);
      ctx.lineTo(centerX - baseDiameterX * 1.6, height);
      ctx.closePath();
      ctx.fill();

      // Side scanning beams
      const sideBeamAngle = Math.sin(systemTime * 0.0008) * 40;
      ctx.fillStyle = `${primaryCSS}, ${safeAlpha(0.03 + trebleVolumeRef.current * 0.08)})`;
      ctx.beginPath();
      ctx.moveTo(centerX - width * 0.3 + sideBeamAngle, height);
      ctx.lineTo(centerX, height * 0.3);
      ctx.lineTo(centerX + width * 0.3 + sideBeamAngle, height);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // ==========================================
      // 2. ATMOSPHERIC NEURAL FIELD GLITCH
      // ==========================================
      const applyGlitch = (state === "connecting" && Math.random() < 0.12) || (Math.random() < 0.004);
      if (applyGlitch) {
        ctx.save();
        ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 3);
        ctx.fillStyle = Math.random() < 0.5 ? `${secondaryCSS}, 0.04)` : `${primaryCSS}, 0.04)`;
        ctx.fillRect(0, 0, width, height);
      }

      // ==========================================
      // 3. 3-TIERED STARDUST PARTICLE RENDER LOOP
      // ==========================================
      const isThinking = characterState === "thinking" || state === "connecting";
      const stateSpeedMult = isThinking ? 2.5 : state === "speaking" ? 1.6 : state === "listening" ? 1.2 : 0.6;

      particlesRef.current.forEach((p) => {
        let riseSpeed = p.speed * stateSpeedMult;
        if (p.tier === 2) {
          riseSpeed *= (1 + midVolumeRef.current * 2.5);
        }

        p.y -= riseSpeed;
        
        // Horizontal sinusoidal sway
        p.x += Math.sin(p.y * 0.012 + p.phase + systemTime * 0.001) * (0.3 + p.tier * 0.2);

        // Tier-specific behavior
        let currentOpacity = p.opacity;

        if (p.tier === 1) {
          // Tier 1: Micro-stardust shimmer
          const shimmer = Math.sin(systemTime * 0.002 + p.phase) * 0.15 + trebleVolumeRef.current * 0.3;
          currentOpacity = Math.max(0.05, Math.min(0.6, p.opacity + shimmer));
          p.x += parallaxOffsetX * 0.1;
        } else if (p.tier === 2) {
          // Tier 2: Midground embers with radial glow
          p.x += parallaxOffsetX * 0.35;
        } else if (p.tier === 3) {
          // Tier 3: Foreground cursor repulsion force field
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

        // Recirculate top-overflowing particles
        if (p.y < height * 0.08) {
          p.y = height + Math.random() * 20;
          p.x = Math.random() * width;
        }

        // Render particle
        const fadeY = Math.max(0, Math.min(1, p.y / height));
        const finalAlpha = currentOpacity * fadeY;

        ctx.beginPath();
        if (p.tier === 2) {
          // Dual stop radial glow for embers
          const vol = Math.max(0, isFinite(speechVolumeRef.current) ? speechVolumeRef.current : 0);
          const rad = p.size * s * (1 + vol * 0.8);
          const outerRad = Math.max(0.1, isFinite(rad * 2) ? rad * 2 : 0.1);
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, outerRad);
          grad.addColorStop(0, `${primaryCSS}, ${safeAlpha(finalAlpha)})`);
          grad.addColorStop(1, `${secondaryCSS}, 0)`);
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, outerRad, 0, Math.PI * 2);
        } else {
          ctx.fillStyle = p.tier === 3 
            ? `${secondaryCSS}, ${safeAlpha(finalAlpha * 0.9)})`
            : `${primaryCSS}, ${safeAlpha(finalAlpha * 0.6)})`;
          ctx.arc(p.x, p.y, p.size * s, 0, Math.PI * 2);
        }
        ctx.fill();
      });

      // Neural connection lines between nearby Tier 3 nodes when thinking
      if (isThinking) {
        const tier3Nodes = particlesRef.current.filter((p) => p.tier === 3);
        ctx.lineWidth = 0.75;
        for (let i = 0; i < tier3Nodes.length; i++) {
          for (let j = i + 1; j < tier3Nodes.length; j++) {
            const n1 = tier3Nodes[i];
            const n2 = tier3Nodes[j];
            const dist = Math.hypot(n1.x - n2.x, n1.y - n2.y);
            if (dist < 85) {
              const alpha = (1 - dist / 85) * 0.35;
              ctx.strokeStyle = `${primaryCSS}, ${safeAlpha(alpha)})`;
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

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [session, state, themeColor, activeEmotion, characterState, activeAssistant]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
      {/* 1. Behind Overlay / Atmospheric Backlight Glow (Z-index 0) */}
      <div className="absolute inset-0 bg-transparent flex items-center justify-center pointer-events-none z-0">
        <div className={`w-[520px] h-[520px] rounded-full blur-[140px] opacity-30 bg-gradient-to-tr transition-all duration-1000 ${
          activeAssistant === "Ria" || themeColor === "violet" ? "from-purple-600/40 to-pink-600/10" :
          themeColor === "crimson" ? "from-rose-600/40 to-orange-600/10" :
          themeColor === "emerald" ? "from-emerald-600/40 to-teal-600/10" :
          themeColor === "celestial" ? "from-sky-600/40 to-cyan-600/10" :
          themeColor === "gold" ? "from-amber-600/40 to-yellow-600/10" :
          themeColor === "rose" ? "from-rose-600/40 to-pink-600/10" :
          "from-cyan-600/40 to-indigo-600/10"
        }`} />
      </div>

      {/* 2. Character Videos state crossfade manager (Z-index 10) */}
      <div 
        id="myraa-animated-presence"
        className="absolute z-10 w-full h-full flex items-center justify-center pointer-events-auto transition-all duration-700 p-4"
      >
        <div 
          className="relative w-full max-w-5xl h-full max-h-[78vh] flex items-center justify-center select-none pointer-events-none transition-transform duration-300 ease-out"
          style={{ transform: `scale(${characterZoom / 100})` }}
        >
          {/* Subtle Outer Ambient Shadow Cast */}
          <div className="absolute inset-0 rounded-3xl blur-[30px] opacity-15 bg-cyan-600/15 pointer-events-none mix-blend-screen" />

          {/* IDLE VIDEO */}
          <video
            key={`idle-${activeAssistant}`}
            ref={idleVideoRef}
            src={activeAssistant === "Ria" ? "/assets/ria_idle.mp4" : "/assets/idle.mp4"}
            loop
            muted
            playsInline
            autoPlay
            className={`absolute inset-0 w-full h-full object-contain rounded-3xl transition-opacity duration-700 ease-in-out ${
              characterState === "idle" ? "opacity-100 z-10 animate-fade-in" : "opacity-0 z-0"
            }`}
            style={{
              objectPosition: "center center"
            }}
            onError={() => handleVideoError("idle")}
          />

          {/* THINKING VIDEO */}
          <video
            key={`thinking-${activeAssistant}`}
            ref={thinkingVideoRef}
            src={activeAssistant === "Ria" ? "/assets/ria_thinking.mp4" : "/assets/thinking.mp4"}
            loop
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-contain rounded-3xl transition-opacity duration-700 ease-in-out ${
              characterState === "thinking" ? "opacity-100 z-10 animate-fade-in" : "opacity-0 z-0"
            }`}
            style={{
              objectPosition: "center center"
            }}
            onError={() => handleVideoError("thinking")}
          />

          {/* TALKING VIDEO */}
          <video
            key={`talking-${activeAssistant}`}
            ref={talkingVideoRef}
            src={activeAssistant === "Ria" ? "/assets/ria_talking.mp4" : "/assets/talking.mp4"}
            loop
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-contain rounded-3xl transition-opacity duration-700 ease-in-out ${
              characterState === "talking" ? "opacity-100 z-10 animate-fade-in" : "opacity-0 z-0"
            }`}
            style={{
              objectPosition: "center center"
            }}
            onError={() => handleVideoError("talking")}
          />

          {/* Faint cybernetic visual edge grid guard */}
          <div className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none bg-radial-gradient from-transparent to-black/35" />

          {/* Video Placeholder/Fallback Tutorial Overlay if asset files are absent */}
          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05060f]/90 backdrop-blur-md rounded-3xl p-6 text-center z-50 pointer-events-auto border border-white/5 shadow-2xl animate-fade-in">
              <Sparkles className="text-cyan-400 mb-2 animate-pulse" size={32} />
              <h3 className="text-sm font-bold tracking-widest font-mono text-white select-none">AWAITING VIDEOS CORES</h3>
              <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed font-sans">
                Please place your character video assets inside the <code className="text-cyan-300 font-mono">/assets</code> directory of your workspace named exactly:
              </p>
              <div className="mt-3 space-y-1.5 text-left font-mono text-[10px] text-cyan-200 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
                <div>• idle.mp4 (State: Idle)</div>
                <div>• thinking.mp4 (State: Thinking)</div>
                <div>• talking.mp4 (State: Talking)</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Foreground Hover-Responsive Canvas for glowing particles (Holographic Overlay Z-index 20) */}
      <canvas
        id="myraa-hologram-living-canvas"
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-20"
      />
    </div>
  );
};

