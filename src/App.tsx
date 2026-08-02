import { useState, useEffect, useRef } from "react";
import { MyraaAudioSession, LiveState } from "./lib/audio";
import { MyraaCoreVisualizer, MyraaEmotion } from "./components/MyraaCoreVisualizer";
import { BrowserAgent } from "./components/BrowserAgent";
import { 
  Power, 
  Volume2, 
  Sparkles, 
  Globe, 
  Maximize2, 
  Compass, 
  CircleAlert,
  Mic,
  X,
  Brain,
  Monitor,
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings as SettingsIcon,
  Activity,
  FileCode,
  Command,
  Lock,
  Music,
  MoreHorizontal,
  Eye
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Memory, MemoryCategory } from "./lib/memoryTypes";
import { MemoryDashboard } from "./components/MemoryDashboard";
import { SettingsPanel } from "./components/SettingsPanel";
import { SystemTelemetry } from "./components/SystemTelemetry";
import { CodeDiffEditor } from "./components/CodeDiffEditor";
import { CommandLauncher } from "./components/CommandLauncher";
import { PrivateRoomModal } from "./components/PrivateRoomModal";
import { MusicHubModal } from "./components/MusicHubModal";
import { CharacterSelectorModal } from "./components/CharacterSelectorModal";
import { MyraaSettings, loadSettings, saveSettings } from "./lib/settingsStore";
import { MyraaWakeWordDetector } from "./lib/wakeWord";

export default function App() {
  const [state, setState] = useState<LiveState>("disconnected");

  // Real-time Screen Sharing states
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [isScreenSharingPaused, setIsScreenSharingPaused] = useState<boolean>(false);
  const [screenVisionMode, setScreenVisionMode] = useState<boolean>(true);

  // References to preserve state across intervals
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenIntervalRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  const isPausedRef = useRef<boolean>(false);
  const screenVisionRef = useRef<boolean>(true);
  const stateRef = useRef<LiveState>("disconnected");

  // Sync state changes with refs to totally prevent stale closures in callbacks
  useEffect(() => {
    isPausedRef.current = isScreenSharingPaused;
  }, [isScreenSharingPaused]);

  useEffect(() => {
    screenVisionRef.current = screenVisionMode;
  }, [screenVisionMode]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Clean up streaming intervals on unmount
  useEffect(() => {
    return () => {
      if (screenIntervalRef.current) {
        clearInterval(screenIntervalRef.current);
      }
    };
  }, []);

  const captureFrameAndSend = () => {
    const video = screenVideoRef.current;
    if (!video || isPausedRef.current || !screenVisionRef.current) {
      return;
    }

    if (stateRef.current === "disconnected") {
      return;
    }

    try {
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      if (!screenCanvasRef.current) {
        screenCanvasRef.current = document.createElement("canvas");
      }
      const canvas = screenCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Restrict maximum resolution size to keep payload light for Gemini Live
      const maxDim = 960;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(video, 0, 0, width, height);

      // Highly compressed JPEG standard is optimized and preserves details perfectly
      const dataUrl = canvas.toDataURL("image/jpeg", 0.55);
      const base64 = dataUrl.split(",")[1];

      if (sessionRef.current && stateRef.current !== "disconnected") {
        sessionRef.current.sendVideoFrame(base64);
      }
    } catch (err) {
      console.error("[Screen Capture] Failed drawing frame to canvas:", err);
    }
  };

  const startScreenSharing = async () => {
    setErrorText(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 5 }
        },
        audio: false
      });

      screenStreamRef.current = stream;

      const video = document.createElement("video");
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.play().catch(e => console.error("Video play warning:", e));
      screenVideoRef.current = video;

      setIsScreenSharing(true);
      setIsScreenSharingPaused(false);

      // Stop handling when native stop sharing bar button ends
      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing();
      };

      // Set up frame capture interval (one frame every 2 seconds is highly robust, preventing overload)
      if (screenIntervalRef.current) {
        clearInterval(screenIntervalRef.current);
      }
      screenIntervalRef.current = setInterval(() => {
        captureFrameAndSend();
      }, 2000);

      // Promptly capture first frame immediately
      setTimeout(() => {
        captureFrameAndSend();
      }, 500);

    } catch (e: any) {
      console.error("Screen sharing permission declined or missing API:", e);
      if (e.name !== "NotAllowedError") {
        setErrorText(`Could not capture screen: ${e.message || e}`);
      }
    }
  };

  const stopScreenSharing = () => {
    if (screenIntervalRef.current) {
      clearInterval(screenIntervalRef.current);
      screenIntervalRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      screenStreamRef.current = null;
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.pause();
      screenVideoRef.current = null;
    }

    setIsScreenSharing(false);
    setIsScreenSharingPaused(false);
  };

  const pauseScreenSharing = () => {
    setIsScreenSharingPaused(true);
  };

  const resumeScreenSharing = () => {
    setIsScreenSharingPaused(false);
    // Refresh first frame immediately
    setTimeout(() => {
      captureFrameAndSend();
    }, 100);
  };

  const switchScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
    }
    await startScreenSharing();
  };

  const [activeEmotion, setActiveEmotion] = useState<MyraaEmotion>("idle");
  const [themeColor, setThemeColor] = useState<string>("charcoal");
  const [userCaption, setUserCaption] = useState<string>("");
  const [characterState, setCharacterState] = useState<"idle" | "thinking" | "talking">("idle");

  const detectEmotionFromText = (text: string): MyraaEmotion => {
    const lower = text.toLowerCase();
    if (lower.includes("haha") || lower.includes("lol") || lower.includes("funny") || lower.includes("joke") || lower.includes("hehe") || lower.includes("wink")) return "playful";
    if (lower.includes("happy") || lower.includes("harmony") || lower.includes("glad") || lower.includes("joy") || lower.includes("wonderful") || lower.includes("love") || lower.includes("smile")) return "happy";
    if (lower.includes("wow") || lower.includes("awesome") || lower.includes("excited") || lower.includes("amazing") || lower.includes("yay") || lower.includes("incredible") || lower.includes("hype")) return "excited";
    if (lower.includes("really?") || lower.includes("curious") || lower.includes("interest") || lower.includes("tell me more") || lower.includes("why") || lower.includes("how") || lower.includes("wonder")) return "curious";
    if (lower.includes("think") || lower.includes("calculat") || lower.includes("analyz") || lower.includes("hmmm") || lower.includes("process") || lower.includes("let me see") || lower.includes("conclude")) return "thinking";
    if (lower.includes("proud") || lower.includes("achieved") || lower.includes("expert") || lower.includes("skill") || lower.includes("confidence") || lower.includes("succeed")) return "proud";
    if (lower.includes("sad") || lower.includes("sorry") || lower.includes("unfortunate") || lower.includes("grief") || lower.includes("bad") || lower.includes("regret") || lower.includes("alas") || lower.includes("cry")) return "sad";
    if (lower.includes("shock") || lower.includes("surprise") || lower.includes("gasp") || lower.includes("unexpected") || lower.includes("seriously") || lower.includes("oh my")) return "surprised";
    if (lower.includes("blush") || lower.includes("shy") || lower.includes("embarrass") || lower.includes("nervous") || lower.includes("oops") || lower.includes("sorry about")) return "embarrassed";
    if (lower.includes("what?") || lower.includes("confus") || lower.includes("puzzled") || lower.includes("dont know") || lower.includes("not sure") || lower.includes("wait")) return "confused";
    return "idle";
  };
  const [modelCaption, setModelCaption] = useState<string>("");
  const [activeProjectorUrl, setActiveProjectorUrl] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Myraa Autopilot system controller state
  const [browserTrigger, setBrowserTrigger] = useState<{
    type: string;
    args: any;
    id: string;
    callback: (res: any) => void;
  } | null>(null);

  // Myraa recollections database core state
  const [memories, setMemories] = useState<Memory[]>([]);
  const [showMemoryDashboard, setShowMemoryDashboard] = useState<boolean>(false);

  // V2: Settings + wake word state
  const [settings, setSettings] = useState<MyraaSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const showSettingsRef = useRef<boolean>(false);
  useEffect(() => { showSettingsRef.current = showSettings; }, [showSettings]);

  // Milestone 3 (R3) Interactive Panels state
  const [showTelemetry, setShowTelemetry] = useState<boolean>(false);
  const [showCodeDiff, setShowCodeDiff] = useState<boolean>(false);
  const [showCommandLauncher, setShowCommandLauncher] = useState<boolean>(false);
  const [showPrivateRoom, setShowPrivateRoom] = useState<boolean>(false);
  const [aiWhiteboardCommands, setAiWhiteboardCommands] = useState<any[]>([]);
  const [showMusicHub, setShowMusicHub] = useState<boolean>(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);

  // Global Ctrl+K / Cmd+K listener for Quick Action Command Launcher
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandLauncher((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelectLauncherAction = async (actionId: string) => {
    if (actionId.startsWith("launch:app:")) {
      const appName = actionId.replace("launch:app:", "");
      try {
        await fetch("/api/call-tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "openApplication", args: { name: appName } })
        });
      } catch (err) {
        console.error("Failed to launch app:", err);
      }
    } else if (actionId.startsWith("launch:custom:")) {
      const appName = actionId.replace("launch:custom:", "");
      try {
        await fetch("/api/call-tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "openApplication", args: { name: appName } })
        });
      } catch (err) {
        console.error("Failed to launch custom app:", err);
      }
    } else if (actionId === "open:privateroom") {
      setShowPrivateRoom(true);
    } else if (actionId === "open:music") {
      setShowMusicHub(true);
    } else if (actionId === "persona:myraa") {
      handleAssistantSwitch("MYRAA");
    } else if (actionId === "persona:ria") {
      handleAssistantSwitch("Ria");
    } else if (actionId.startsWith("theme:")) {
      const color = actionId.replace("theme:", "");
      setThemeColor(color);
    } else if (actionId === "open:telemetry") {
      setShowTelemetry(true);
    } else if (actionId === "open:codediff") {
      setShowCodeDiff(true);
    } else if (actionId === "open:memories") {
      setShowMemoryDashboard(true);
    } else if (actionId === "toggle:vision") {
      setScreenVisionMode((prev) => !prev);
    } else if (actionId === "open:audio_settings") {
      setShowSettings(true);
    }
  };

  // V2: Wake word detector instance (Web Speech API, lives for the app lifetime)
  const wakeDetectorRef = useRef<MyraaWakeWordDetector | null>(null);
  // Ref indirection so the wake-word callback always calls the latest connect
  // handler, regardless of where it's declared in the component body.
  const connectHandlerRef = useRef<() => void>(() => {});

  // Initialize wake detector once on mount.
  useEffect(() => {
    const det = new MyraaWakeWordDetector();
    wakeDetectorRef.current = det;
    return () => {
      det.stop();
    };
  }, []);

  // Start / stop wake word detection when the setting changes.
  useEffect(() => {
    const det = wakeDetectorRef.current;
    if (!det) return;
    if (settings.wakeWordEnabled && state === "disconnected") {
      det.start({
        phrase: settings.wakePhrase,
        sensitivity: settings.sensitivity,
        onTriggered: () => {
          // When wake word fires, stop detector and connect MYRAA.
          det.stop();
          connectHandlerRef.current();
        },
      });
    } else {
      det.stop();
    }
  }, [settings.wakeWordEnabled, settings.wakePhrase, settings.sensitivity, state]);

  // Handle settings changes: persist to localStorage + update state.
  const handleSettingsChange = (patch: Partial<MyraaSettings>) => {
    const next = saveSettings(patch);
    setSettings(next);
  };

  const sessionRef = useRef<MyraaAudioSession | null>(null);

  // Fetch recollections for active assistant from backend database
  useEffect(() => {
    fetch(`/api/memories?assistant=${settings.activeAssistant || "MYRAA"}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMemories(data);
        }
      })
      .catch(err => console.error("Initial persistent recollections load failure:", err));
  }, [settings.activeAssistant]);

  const handleAddManualMemory = async (category: MemoryCategory, text: string) => {
    try {
      const resp = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, text, assistant: settings.activeAssistant || "MYRAA" })
      });
      const saved = await resp.json();
      if (saved && saved.id) {
        setMemories((prev) => [...prev, saved]);
      }
    } catch (err) {
      console.error("Manual database recollect upload error:", err);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
      const resp = await fetch(`/api/memories/${id}?assistant=${settings.activeAssistant || "MYRAA"}`, {
        method: "DELETE"
      });
      const resObj = await resp.json();
      if (resObj && resObj.success) {
        setMemories((prev) => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error("Manual memory delete execution failed:", err);
    }
  };

  // Initialize the audio session handlers once on mount
  useEffect(() => {
    sessionRef.current = new MyraaAudioSession({
      onStateChange: (newState) => {
        setState(newState);
        if (newState === "disconnected") {
          // Reset captions on disconnect
          setUserCaption("");
          setModelCaption("");
          setActiveEmotion("idle");
          setCharacterState("idle");
        } else if (newState === "listening") {
          // Return to receptive resting state
          setActiveEmotion("idle");
          setCharacterState("idle");
        } else if (newState === "speaking") {
          setCharacterState("talking");
        }
      },
      onTranscription: (role, text) => {
        if (role === "user") {
          setUserCaption(text);
          // Auto-clear the other caption when user starts talking
          setModelCaption("");
          setCharacterState("thinking");
        } else if (role === "model") {
          setModelCaption((prev) => {
            const next = prev + text;
            const newEmotion = detectEmotionFromText(next);
            setActiveEmotion(newEmotion);
            return next;
          });
          // Clear user caption when model replies
          setUserCaption("");
        }
      },
      onToolCall: (name, args, callback) => {
        console.log(`[App] Tool call triggered: ${name}`, args);
        
        const browserTools = [
          "browserOpen",
          "browserSearch",
          "browserClick",
          "browserMediaControl",
          "browserScroll",
          "browserType",
          "browserGoBack",
          "browserTabAction",
          "openWebsite"
        ];

        if (browserTools.includes(name)) {
          // Bring up the Holographic Browser Controller if it is not active
          if (!activeProjectorUrl) {
            let startingUrl = "https://youtube.com";
            if ((name === "browserOpen" || name === "openWebsite") && args.url) {
              startingUrl = args.url;
            }
            setActiveProjectorUrl(startingUrl);
          }

          // Map instructions directly onto Browser Agent
          setBrowserTrigger({
            type: name === "openWebsite" ? "browserOpen" : name,
            args,
            id: Math.random().toString(),
            callback: (res) => {
              callback(res);
              setBrowserTrigger(null);
            }
          });
        } else if (name === "changeBackground") {
          const colorName = args.color?.toLowerCase();
          const validColors = ["violet", "crimson", "emerald", "celestial", "gold", "rose", "charcoal"];
          
          if (colorName && validColors.includes(colorName)) {
            setThemeColor(colorName);
            callback({ result: `Successfully shifted aesthetic atmosphere to ${colorName}.` });
          } else {
            callback({ error: `Unsupported color '${colorName}'. Supported themes are: ${validColors.join(", ")}` });
          }
        } else {
          callback({ error: `Tool ${name} is not implemented.` });
        }
      },
      onError: (err) => {
        setErrorText(err);
      },
      onMemorySync: (updatedMemories) => {
        console.log("[App] WebSocket memories sync triggered:", updatedMemories);
        if (Array.isArray(updatedMemories)) {
          setMemories(updatedMemories);
        }
      },
      onWhiteboardCommand: (command) => {
        console.log("[App] Whiteboard command received from AI:", command);
        setAiWhiteboardCommands((prev) => [...prev, command]);
        // Auto-open Private Room whiteboard tab when AI writes on it
        if (!showPrivateRoom) {
          setShowPrivateRoom(true);
        }
      }
    });

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current as any);
        reconnectTimeoutRef.current = null;
      }
      if (sessionRef.current) {
        sessionRef.current.disconnect();
      }
    };
  }, []);

  const handleToggleConnection = async () => {
    setErrorText(null);
    if (!sessionRef.current) return;

    if (state === "disconnected") {
      await sessionRef.current.connect();
    } else {
      sessionRef.current.disconnect();
    }
  };
  // V2: keep the ref in sync so the wake-word callback calls this exact handler.
  connectHandlerRef.current = handleToggleConnection;

  // Maps theme colors to CSS ambient light spots
  const handleAssistantSwitch = async (newAssistant: "MYRAA" | "Ria" | "Mike") => {
    if (settings.activeAssistant === newAssistant) return;

    // 1. Update settings store
    handleSettingsChange({ activeAssistant: newAssistant });

    // 2. Shift visual background atmosphere
    if (newAssistant === "Ria") {
      setThemeColor("violet");
    } else if (newAssistant === "Mike") {
      setThemeColor("gold");
    } else {
      setThemeColor("charcoal");
    }

    // 3. Audio session parameter update / reconnect sequence if connected
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current as any);
      reconnectTimeoutRef.current = null;
    }
    if (sessionRef.current && state !== "disconnected") {
      console.log(`[App] Switching active assistant session to ${newAssistant}...`);
      sessionRef.current.disconnect();
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        if (sessionRef.current) {
          sessionRef.current.connect();
        }
      }, 250);
    }
  };

  const renderGlowingStatusIndicator = () => {
    const activeAssistant = settings.activeAssistant || "MYRAA";
    const isRia = activeAssistant === "Ria";

    let statusKey: "idle" | "listening" | "speaking" | "processing" = "idle";
    if (state === "connecting" || characterState === "thinking") {
      statusKey = "processing";
    } else if (state === "speaking") {
      statusKey = "speaking";
    } else if (state === "listening") {
      statusKey = "listening";
    }

    const configs = {
      idle: {
        label: `${activeAssistant.toUpperCase()} IDLE`,
        badgeClass: isRia
          ? "border-purple-500/30 bg-purple-500/10 text-purple-300/80 shadow-[0_0_10px_rgba(168,85,247,0.15)]"
          : "border-cyan-500/30 bg-cyan-500/10 text-cyan-300/80 shadow-[0_0_10px_rgba(6,182,212,0.15)]",
        dotClass: isRia ? "bg-purple-400/60" : "bg-cyan-400/60",
      },
      listening: {
        label: "LISTENING",
        badgeClass: isRia
          ? "border-purple-400 bg-purple-500/25 text-purple-200 shadow-[0_0_20px_rgba(168,85,247,0.5)] animate-pulse"
          : "border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.5)] animate-pulse",
        dotClass: isRia ? "bg-purple-400 animate-ping" : "bg-cyan-400 animate-ping",
      },
      speaking: {
        label: "SPEAKING",
        badgeClass: isRia
          ? "border-purple-300 bg-purple-500/30 text-white shadow-[0_0_25px_rgba(168,85,247,0.6)] ring-1 ring-purple-400/50"
          : "border-cyan-300 bg-cyan-500/30 text-white shadow-[0_0_25px_rgba(6,182,212,0.6)] ring-1 ring-cyan-400/50",
        dotClass: isRia ? "bg-purple-300 animate-pulse" : "bg-cyan-300 animate-pulse",
      },
      processing: {
        label: "PROCESSING",
        badgeClass: "border-amber-400/80 bg-amber-500/20 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.5)]",
        dotClass: "bg-amber-400",
      },
    };

    const current = configs[statusKey];

    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono font-bold tracking-widest transition-all duration-300 ${current.badgeClass}`}>
        {statusKey === "processing" ? (
          <RefreshCw size={11} className="animate-spin text-amber-300" />
        ) : (
          <span className={`w-2 h-2 rounded-full ${current.dotClass}`} />
        )}
        <span>{current.label}</span>
      </div>
    );
  };

  const getAmbientStyles = () => {
    switch (themeColor) {
      case "violet":
        return "from-purple-950/40 via-violet-950/20 to-slate-950";
      case "crimson":
        return "from-red-950/40 via-orange-950/20 to-slate-950";
      case "emerald":
        return "from-emerald-950/40 via-teal-950/20 to-slate-950";
      case "celestial":
        return "from-sky-950/45 via-indigo-950/25 to-slate-950";
      case "gold":
        return "from-amber-950/30 via-yellow-950/15 to-slate-950";
      case "rose":
        return "from-rose-950/40 via-pink-950/20 to-slate-950";
      case "charcoal":
      default:
        return "from-slate-900/50 via-slate-950/30 to-slate-950";
    }
  };


  return (
    <div
      id="myraa-holographic-desktop"
      data-theme={settings.activeAssistant === "Ria" ? "ria" : "myraa"}
      className={`relative w-full h-screen overflow-hidden bg-[#020205] text-white ${getAmbientStyles()} theme-transition flex flex-col select-none`}
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ZONE 1: COMPACT TOP BAR                                    */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Ultra-Fast Hardware-Accelerated Radial Ambient Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.12),transparent_70%)] pointer-events-none transform-gpu" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.12),transparent_70%)] pointer-events-none transform-gpu" />
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none transform-gpu" />

      {/* Decorative grid pattern background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />

      {/* FULL VIEWPORT HOLOGRAPHIC STAGE: Character fills the entire screen behind everything */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <MyraaCoreVisualizer
          session={sessionRef.current}
          state={state}
          themeColor={themeColor}
          activeEmotion={activeEmotion}
          characterState={characterState}
          activeAssistant={settings.activeAssistant || "MYRAA"}
          characterZoom={settings.characterZoom ?? 85}
          characterFit={settings.characterFit ?? "contain"}
        />
      </div>

      <header className="relative z-30 w-full px-3 pt-2 sm:px-5 sm:pt-3 shrink-0">
        <div className="relative flex items-center justify-between px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 bg-slate-950/80 backdrop-blur-sm shadow-[0_4px_20px_0_rgba(0,0,0,0.4)] transition-colors duration-300 transform-gpu">
          
          {/* Specular Top Border Highlight */}
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent rounded-t-xl pointer-events-none" />

          {/* Brand + Status (Left) */}
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 uppercase">
              MYRAA AI
            </span>
            <span className="text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/10 text-slate-400 border border-white/10">
              v2.0
            </span>
            <div className="h-3 w-[1px] bg-white/10" />
            {renderGlowingStatusIndicator()}
          </div>

          {/* Character Matrix Selector Button (Center) */}
          <button
            onClick={() => setShowCharacterSelector(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg border border-white/15 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-amber-500/10 hover:border-cyan-400/40 backdrop-blur-sm transition-all duration-300 cursor-pointer shadow-md group"
            title="Open Character Selection Matrix"
          >
            <Sparkles size={12} className="text-cyan-400 animate-pulse group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-white uppercase flex items-center gap-1.5">
              <span className="text-cyan-300 font-extrabold">{settings.activeAssistant || "MYRAA"}</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
          </button>

          {/* More Menu (Right) */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer text-xs font-mono tracking-widest ${
                showMoreMenu 
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" 
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20"
              }`}
              title="More Actions"
            >
              <MoreHorizontal size={14} />
              <span className="hidden sm:inline text-[10px]">MORE</span>
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-52 py-2 rounded-xl border border-white/15 bg-slate-950/95 backdrop-blur-sm shadow-2xl z-50"
                >
                  {[
                    { icon: <Compass size={13} />, label: "Topics & Suggestions", action: () => setShowGuide(!showGuide) },
                    { icon: <Brain size={13} />, label: "Memory Recalls", action: () => setShowMemoryDashboard(!showMemoryDashboard) },
                    { icon: <Activity size={13} className="text-cyan-400" />, label: "System Telemetry", action: () => setShowTelemetry(true) },
                    { icon: <FileCode size={13} className="text-emerald-400" />, label: "Code Diff Editor", action: () => setShowCodeDiff(true) },
                    { icon: <Command size={13} className="text-purple-400" />, label: "Command Launcher", action: () => setShowCommandLauncher(true) },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => { item.action(); setShowMoreMenu(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs font-mono text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Click-away overlay for More menu */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowMoreMenu(false)} />
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ZONE 2: FULL-SCREEN CHARACTER + CONTENT ZONE               */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <main className="relative z-10 flex-1 w-full flex flex-col items-center justify-end overflow-hidden">
        
        {/* Floating Live Screen Vision Broadcast Banner */}
        <AnimatePresence>
          {isScreenSharing && (
            <div className="absolute inset-x-0 top-2 z-40 flex justify-center px-4">
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border border-cyan-500/30 bg-slate-950/85 backdrop-blur-sm shadow-xl shadow-cyan-500/10 w-full max-w-lg transform-gpu"
              >
                <div className="flex items-center gap-2.5 overflow-hidden text-left">
                  <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 animate-pulse">
                    <Monitor size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold font-mono tracking-wide text-cyan-200 uppercase">
                      SCREEN VISION {isScreenSharingPaused ? "PAUSED" : "ACTIVE"}
                    </h4>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {settings.activeAssistant || "MYRAA"} watching your screen
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={isScreenSharingPaused ? resumeScreenSharing : pauseScreenSharing}
                    className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-mono transition cursor-pointer"
                  >
                    {isScreenSharingPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    onClick={switchScreenShare}
                    className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-mono transition cursor-pointer"
                  >
                    Switch
                  </button>
                  <button
                    onClick={stopScreenSharing}
                    className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-[10px] font-mono transition cursor-pointer"
                  >
                    Stop
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* Holographic Projection Screen Widget (if website opened) */}
        <AnimatePresence>
          {activeProjectorUrl && (
            <div className="absolute inset-x-0 top-2 z-30 flex justify-center px-4">
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-950/45 backdrop-blur-sm shadow-lg w-full max-w-md transform-gpu"
              >
                <div className="flex items-center gap-2.5 overflow-hidden text-left">
                  <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300">
                    <Globe size={16} />
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-[10px] font-bold font-mono tracking-wide text-indigo-200 uppercase">Holographic Projection</h4>
                    <p className="text-[9px] text-indigo-400 truncate max-w-[200px]">{activeProjectorUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveProjectorUrl(activeProjectorUrl)}
                    className="p-1.5 rounded-lg bg-indigo-500 text-white hover:bg-indigo-400 transition"
                    title="View Frame"
                  >
                    <Maximize2 size={12} />
                  </button>
                  <button
                    onClick={() => setActiveProjectorUrl(null)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Cinematic dialogue layer — floats above character near the bottom */}
        <div id="cinematic-subtitles" className="w-full max-w-3xl flex flex-col items-center justify-center text-center px-6 relative z-25 mb-4 pointer-events-none min-h-[5rem] max-h-[7rem] overflow-y-auto glass-scrollbar">
          <AnimatePresence mode="wait">
            {(() => {
              const textType = modelCaption 
                ? "model" 
                : userCaption 
                  ? "user" 
                  : "status";

              const activeText = modelCaption 
                ? modelCaption 
                : userCaption 
                  ? userCaption 
                  : state === "listening" 
                    ? "I am listening. Speak freely..." 
                    : state === "connecting" 
                      ? "Materializing presence links..." 
                      : `Connect memory core to awaken ${(settings.activeAssistant || "MYRAA").toUpperCase()} voice.`;

              return (
                <motion.div
                  key={textType}
                  initial={{ opacity: 0, y: 15, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -15, filter: "blur(6px)" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center justify-center w-full"
                >
                  {textType === "model" && (
                    <h2 className="text-xl sm:text-2xl font-light text-white leading-relaxed tracking-wide font-display max-w-2xl drop-shadow-[0_2px_20px_rgba(0,0,0,0.9)]">
                      {activeText}
                    </h2>
                  )}

                  {textType === "user" && (
                    <p className="text-cyan-300 font-mono text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 drop-shadow-[0_1px_10px_rgba(0,0,0,0.85)] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <span>&ldquo;{activeText}&rdquo;</span>
                    </p>
                  )}

                  {textType === "status" && (
                    <span className="text-xs sm:text-sm uppercase tracking-[0.3em] font-medium text-white/30 font-sans tracking-widest drop-shadow-[0_1px_4px_rgba(0, 0, 0, 0.5)]">
                      {activeText}
                    </span>
                  )}
                </motion.div>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* Interactive suggestions prompt guide */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="p-4 rounded-xl border border-white/10 bg-slate-900/90 backdrop-blur-sm max-w-sm text-left w-full absolute bottom-24 z-40 shadow-2xl mx-4"
            >
              <div className="flex items-center justify-between mb-2 text-white">
                <div className="flex items-center gap-1.5 font-display text-xs font-bold tracking-wide">
                  <Compass size={14} className="text-indigo-400" />
                  <span>SUGGESTIONS</span>
                </div>
                <button 
                  onClick={() => setShowGuide(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X size={12} />
                </button>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer text-slate-200">
                  ⚡ &quot;Myraa, change atmosphere to crimson&quot;
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer text-slate-200">
                  ⚡ &quot;Open youtube.com on my screen&quot;
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition cursor-pointer text-slate-200">
                  ⚡ &quot;Tell me a joke and change background to gold&quot;
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Error Banner */}
        <AnimatePresence>
          {errorText && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="flex items-start gap-2.5 p-3 rounded-xl border border-rose-500/20 bg-rose-950/40 backdrop-blur-sm max-w-sm w-full text-left mb-4 mx-4"
            >
              <CircleAlert className="text-rose-400 shrink-0 mt-0.5" size={16} />
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-rose-300 font-mono">Error</h4>
                <p className="text-[10px] text-rose-200 mt-0.5 leading-relaxed">{errorText}</p>
                <button
                  onClick={() => setErrorText(null)}
                  className="mt-1 text-[9px] font-bold text-rose-400 underline font-mono uppercase"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Holographic Projection Spotlight Light Cone Beam (Bottom Dock -> Character) */}
      <div 
        className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[700px] h-[480px] pointer-events-none z-10 opacity-30 transform-gpu"
        style={{
          backgroundImage: 'linear-gradient(to top, rgba(147, 51, 234, 0.4), rgba(6, 182, 212, 0.15), transparent 90%)',
          clipPath: 'polygon(35% 100%, 65% 100%, 95% 0%, 5% 0%)'
        }}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ZONE 3: FIXED BOTTOM CONTROL DOCK                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <footer className="relative z-30 w-full px-3 pb-3 sm:px-5 sm:pb-4 shrink-0">
        <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-3">
          
          {/* Minimalist Waveform Visualizer */}
          <div className="flex items-center justify-center gap-1 h-5 w-32">
            {[12, 28, 16, 32, 20, 8].map((baseHeight, idx) => {
              let heightFactor = 0.35;
              if (state === "speaking") {
                heightFactor = 0.35 + Math.sin(Date.now() * 0.02 + idx * 0.9) * 0.65;
              } else if (state === "listening") {
                heightFactor = 0.2 + Math.sin(Date.now() * 0.01 + idx * 0.5) * 0.4;
              } else {
                heightFactor = idx % 2 === 0 ? 0.25 : 0.12;
              }
              const calculatedHeight = Math.max(2, baseHeight * heightFactor * 0.7);

              return (
                <div
                  key={idx}
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    state === "speaking" ? "bg-purple-400" : state === "listening" ? "bg-cyan-400" : "bg-white/10"
                  }`}
                  style={{ height: `${calculatedHeight}px` }}
                />
              );
            })}
          </div>

          {/* Control Dock — Glass Bar */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-sm shadow-[0_-4px_20px_0_rgba(0,0,0,0.4)] transform-gpu">
            
            {/* Left Group: Private Room & Music Hub */}
            <button
              onClick={() => setShowPrivateRoom(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 hover:text-white hover:bg-purple-500/20 text-[10px] font-mono font-bold tracking-widest transition cursor-pointer shadow-md shadow-purple-500/5 hover:shadow-purple-500/15"
              title="Private Conversation Room & Secure Document Vault"
            >
              <Lock size={13} className="text-purple-400" />
              <span className="hidden sm:inline">PRIVATE</span>
            </button>

            <button
              onClick={() => setShowMusicHub(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 hover:text-white hover:bg-cyan-500/20 text-[10px] font-mono font-bold tracking-widest transition cursor-pointer shadow-md shadow-cyan-500/5 hover:shadow-cyan-500/15"
              title="Music & Audio Hub"
            >
              <Music size={13} className="text-cyan-400" />
              <span className="hidden sm:inline">MUSIC</span>
            </button>

            <button
              onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-mono font-bold tracking-widest transition cursor-pointer ${
                isScreenSharing 
                  ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-300 shadow-md shadow-cyan-500/10" 
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20"
              }`}
              title="Share Screen with Assistant"
            >
              <Monitor size={13} className={isScreenSharing && !isScreenSharingPaused ? "animate-pulse text-cyan-400" : ""} />
              <span className="hidden sm:inline">{isScreenSharing ? "SHARING" : "SCREEN"}</span>
            </button>

            {isScreenSharing && (
              <button
                onClick={() => {
                  captureFrameAndSend();
                  setTimeout(() => captureFrameAndSend(), 300);
                }}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-mono font-bold tracking-widest transition cursor-pointer"
                title="Instant Screen Analysis — Send high-res screen frame to AI"
              >
                <Eye size={13} className="text-emerald-400" />
                <span className="hidden sm:inline">EXPLAIN</span>
              </button>
            )}

            <div className="h-6 w-[1px] bg-white/10 mx-1" />

            {/* Center: Power Button */}
            <button 
              onClick={handleToggleConnection}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer shrink-0 ${
                state === "disconnected"
                  ? "bg-white/10 hover:bg-white/15 border border-white/15 text-white shadow-[0_0_20px_rgba(255,255,255,0.02)] hover:scale-105 active:scale-95"
                  : state === "listening"
                  ? "bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/80 text-cyan-200 shadow-[0_0_30px_rgba(34,211,238,0.3)] animate-pulse scale-105"
                  : state === "speaking"
                  ? "bg-purple-500/90 hover:bg-purple-600 border border-purple-400/95 text-white shadow-[0_0_30px_rgba(168,85,247,0.4)] scale-105"
                  : "bg-amber-600 border border-amber-300 text-white animate-spin"
              }`}
              title={state === "disconnected" ? "Awake Myraa" : "Sleep core"}
            >
              {state === "disconnected" ? (
                <Power className="opacity-80" size={20} />
              ) : state === "connecting" ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : state === "listening" ? (
                <Mic size={20} className="text-cyan-200" />
              ) : (
                <Volume2 size={20} className="text-white" />
              )}
            </button>

            <div className="h-6 w-[1px] bg-white/10 mx-1" />

            {/* Right Group: Settings */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition cursor-pointer text-[10px] font-mono font-bold tracking-widest ${
                showSettings
                  ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:text-white hover:border-white/20"
              }`}
              title="Settings"
            >
              <SettingsIcon size={13} className={showSettings ? "animate-spin [animation-duration:6s]" : ""} />
              <span className="hidden sm:inline">SETTINGS</span>
            </button>

            {/* Reset Projection Anchor */}
            {(activeProjectorUrl || errorText) && (
              <button 
                onClick={() => {
                  if (activeProjectorUrl) setActiveProjectorUrl(null);
                  setErrorText(null);
                }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition duration-150 cursor-pointer"
                title="Reset Screen Broadcasts"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Wan Watermark Logo (Bottom Right) */}
        <div className="absolute bottom-4 right-6 z-30 hidden sm:flex items-center gap-1.5 text-white/50 hover:text-white/80 transition-opacity font-display font-semibold text-xs tracking-wider select-none pointer-events-none">
          <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <span className="font-mono text-white/60 font-bold">Wan</span>
        </div>
      </footer>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* FLOATING OVERLAYS & MODALS                                 */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {/* Holographic Website frame projections */}
      <AnimatePresence>
        {activeProjectorUrl && (
          <BrowserAgent
            url={activeProjectorUrl}
            onClose={() => {
              setActiveProjectorUrl(null);
              setBrowserTrigger(null);
            }}
            actionTrigger={browserTrigger}
          />
        )}
      </AnimatePresence>

      {/* Dynamic Floating Glassmorphic Screen Sharing Control Hub */}
      <AnimatePresence>
        {isScreenSharing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, x: 50 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: 50 }}
            className={`fixed top-16 right-4 z-50 w-64 p-3 rounded-xl border ${
              isScreenSharingPaused 
                ? "border-amber-500/20 bg-slate-950/80" 
                : "border-cyan-500/20 bg-slate-950/80"
            } backdrop-blur-sm shadow-2xl overflow-hidden transform-gpu`}
          >
            {/* Header / Indicator */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isScreenSharingPaused ? "bg-amber-400" : "bg-cyan-400 animate-pulse"}`} />
                <span className="text-[9px] font-bold font-mono tracking-widest text-slate-200">
                  {isScreenSharingPaused ? "PAUSED" : "LIVE"}
                </span>
              </div>
              <button 
                onClick={stopScreenSharing}
                className="text-slate-400 hover:text-white transition-colors duration-150 p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                title="Stop Sharing"
              >
                <X size={12} />
              </button>
            </div>

            {/* Smart Video PIP Preview */}
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-900 border border-white/5 mb-2 flex items-center justify-center select-none">
              <video
                ref={(el) => {
                  if (el && screenStreamRef.current && el.srcObject !== screenStreamRef.current) {
                    el.srcObject = screenStreamRef.current;
                    el.muted = true;
                    el.play().catch(err => console.log("Mini preview stream play issue:", err));
                  }
                }}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isScreenSharingPaused ? "opacity-30 blur-sm" : "opacity-90"
                }`}
                autoPlay
                playsInline
                muted
              />

              {isScreenSharingPaused && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] uppercase tracking-widest font-mono text-amber-400 font-bold px-2 py-0.5 bg-amber-950/40 border border-amber-500/20 rounded">
                    Paused
                  </span>
                </div>
              )}
              
              {!isScreenSharingPaused && screenVisionMode && (
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/50 border border-cyan-400/20 text-[8px] font-mono text-cyan-300">
                  <span className="w-1 h-1 bg-cyan-400 rounded-full animate-ping" />
                  <span>0.5 FPS</span>
                </div>
              )}
            </div>

            {/* Quick Action Control Strip */}
            <div className="flex items-center justify-between gap-1 mb-2">
              {isScreenSharingPaused ? (
                <button
                  onClick={resumeScreenSharing}
                  className="flex-1 py-1 px-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-[10px] font-mono font-medium text-cyan-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Play size={9} /> Resume
                </button>
              ) : (
                <button
                  onClick={pauseScreenSharing}
                  className="flex-1 py-1 px-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg text-[10px] font-mono font-medium text-amber-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
                >
                  <Pause size={9} /> Pause
                </button>
              )}

              <button
                onClick={switchScreenShare}
                className="py-1 px-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-mono text-slate-300 hover:text-white flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw size={9} /> Switch
              </button>

              <button
                onClick={stopScreenSharing}
                className="py-1 px-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg text-[10px] font-mono text-rose-400 flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Square size={8} /> Stop
              </button>
            </div>

            {/* Core Mode Toggle */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-left">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold font-mono text-slate-200">VISION MODE</span>
                <span className="text-[7px] text-slate-400 uppercase font-mono">Auto-Analysis</span>
              </div>
              <button
                onClick={() => setScreenVisionMode(!screenVisionMode)}
                className={`w-9 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                  screenVisionMode ? "bg-cyan-500" : "bg-white/10"
                }`}
              >
                <div
                  className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform duration-200 ease-in-out ${
                    screenVisionMode ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recollections sliding core panel */}
      <MemoryDashboard
        isOpen={showMemoryDashboard}
        onClose={() => setShowMemoryDashboard(false)}
        memories={memories}
        onAddMemory={handleAddManualMemory}
        onDeleteMemory={handleDeleteMemory}
        themeColor={themeColor}
      />

      {/* V2: Settings sliding core panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={handleSettingsChange}
        themeColor={themeColor}
      />

      {/* System Telemetry Modal */}
      <SystemTelemetry
        isOpen={showTelemetry}
        onClose={() => setShowTelemetry(false)}
        themeColor={themeColor}
      />

      {/* Code Diff Editor Modal */}
      <CodeDiffEditor
        isOpen={showCodeDiff}
        onClose={() => setShowCodeDiff(false)}
        themeColor={themeColor}
      />

      {/* Quick Action Command Launcher */}
      <CommandLauncher
        isOpen={showCommandLauncher}
        onClose={() => setShowCommandLauncher(false)}
        onSelectAction={handleSelectLauncherAction}
        themeColor={themeColor}
      />

      {/* Private Room & Secure Document Vault Modal */}
      <PrivateRoomModal
        isOpen={showPrivateRoom}
        onClose={() => setShowPrivateRoom(false)}
        assistantName={settings.activeAssistant || "MYRAA"}
        aiCommands={aiWhiteboardCommands}
      />

      {/* Music & Audio Hub Modal */}
      <MusicHubModal
        isOpen={showMusicHub}
        onClose={() => setShowMusicHub(false)}
        themeColor={themeColor}
      />

      {/* Character Matrix Selector Modal */}
      <CharacterSelectorModal
        isOpen={showCharacterSelector}
        onClose={() => setShowCharacterSelector(false)}
        settings={settings}
        onUpdateSettings={handleSettingsChange}
        onSelectCharacter={handleAssistantSwitch}
      />
    </div>
  );
}

