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
  Eye,
  Home,
  MessageSquare,
  FileText,
  CheckSquare,
  LayoutGrid,
  HelpCircle,
  Bell,
  Grid
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
      className={`relative w-full h-screen overflow-hidden bg-[#04050d] text-white ${getAmbientStyles()} theme-transition flex flex-col select-none`}
    >
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.15),transparent_70%)] pointer-events-none transform-gpu" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.15),transparent_70%)] pointer-events-none transform-gpu" />

      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:36px_36px] pointer-events-none opacity-40" />

      {/* FULL VIEWPORT HOLOGRAPHIC STAGE */}
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

      {/* TOP BAR */}
      <header className="relative z-30 w-full px-4 pt-3 shrink-0">
        <div className="flex items-center justify-between px-5 py-2.5 rounded-2xl border border-white/10 bg-[#090b1c]/80 backdrop-blur-md shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
          {/* Left Brand + Status */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
              <Sparkles size={16} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider text-white">MYRAA AI</span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/10 text-slate-400 border border-white/10">
                v2.0
              </span>
            </div>
            <div className="h-4 w-[1px] bg-white/10 mx-1" />
            {renderGlowingStatusIndicator()}
          </div>

          {/* Center Persona Selector */}
          <button
            onClick={() => setShowCharacterSelector(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 backdrop-blur-md transition cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)]"
          >
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-semibold text-white uppercase tracking-wider">{settings.activeAssistant || "MYRAA"}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          </button>

          {/* Right Header Icons */}
          <div className="flex items-center gap-2 text-slate-400">
            <button onClick={() => setShowGuide(!showGuide)} className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition cursor-pointer" title="Help / Guide">
              <HelpCircle size={18} />
            </button>
            <div className="relative">
              <button onClick={() => setShowMemoryDashboard(true)} className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition cursor-pointer" title="Notifications & Recalls">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500" />
              </button>
            </div>
            <button onClick={() => setShowSettings(!showSettings)} className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition cursor-pointer" title="Settings">
              <SettingsIcon size={18} />
            </button>
            <button onClick={() => setShowMoreMenu(!showMoreMenu)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-mono text-slate-300 transition cursor-pointer">
              <MoreHorizontal size={14} />
              <span>MORE</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN VIEWPORT BODY WITH LEFT SIDEBAR */}
      <div className="flex-1 flex min-h-0 relative z-20 px-4 py-3 gap-4">
        {/* LEFT VERTICAL SIDEBAR */}
        <aside className="w-20 shrink-0 bg-[#090b1c]/80 border border-white/10 rounded-2xl flex flex-col items-center justify-between py-5 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col items-center gap-3 w-full px-2">
            {[
              { id: 'home', label: 'HOME', icon: Home, active: true, action: () => {} },
              { id: 'chat', label: 'CHAT', icon: MessageSquare, action: () => setShowPrivateRoom(true) },
              { id: 'notes', label: 'NOTES', icon: FileText, action: () => setShowPrivateRoom(true) },
              { id: 'tasks', label: 'TASKS', icon: CheckSquare, action: () => setShowCommandLauncher(true) },
              { id: 'memory', label: 'MEMORY', icon: Brain, action: () => setShowMemoryDashboard(true) },
              { id: 'tools', label: 'TOOLS', icon: LayoutGrid, action: () => setShowTelemetry(true) },
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.id}
                  onClick={nav.action}
                  className={`w-full py-3 rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
                    nav.active
                      ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[9px] font-bold tracking-wider">{nav.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bottom Avatar Widget */}
          <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => setShowCharacterSelector(true)}>
            <div className="relative w-10 h-10 rounded-full border border-purple-500/40 p-0.5 bg-gradient-to-tr from-purple-900 to-indigo-900 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <img src="/assets/avatar_thumb.png" onError={(e) => (e.currentTarget.src = "/assets/icon.png")} className="w-full h-full rounded-full object-cover" />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#090b1c]" />
            </div>
            <span className="text-[8px] font-bold text-emerald-400 tracking-wider">ONLINE</span>
          </div>
        </aside>

        {/* CENTER MAIN STAGE */}
        <main className="flex-1 relative flex flex-col items-center justify-end min-w-0 overflow-hidden">
          {/* Holographic Projection Light Beam Cone */}
          <div 
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none z-10 opacity-30 transform-gpu"
            style={{
              backgroundImage: 'linear-gradient(to top, rgba(147, 51, 234, 0.4), rgba(6, 182, 212, 0.15), transparent 90%)',
              clipPath: 'polygon(35% 100%, 65% 100%, 95% 0%, 5% 0%)'
            }}
          />

          {/* Right Floating Assistant Speech Card */}
          <div className="absolute right-8 top-12 z-30 w-80 p-5 rounded-2xl border border-purple-500/30 bg-[#0a0d24]/90 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.15)] space-y-3">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Sparkles size={16} />
              <span>{settings.activeAssistant || "MYRAA"}</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              &quot;I&apos;m your AI companion. How can I assist you today?&quot;
            </p>
            {/* Audio Waveform */}
            <div className="flex items-center gap-1 pt-1 h-6">
              {[16, 24, 32, 18, 28, 40, 22, 30, 18, 25, 35, 20, 15, 28, 18].map((h, i) => (
                <div key={i} className="flex-1 bg-purple-500/60 rounded-full animate-pulse" style={{ height: `${h * 0.6}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>

          {/* Subtitle & Awaken Voice Action Button */}
          <div className="relative z-30 flex flex-col items-center mb-6 space-y-3">
            <span className="text-xs uppercase tracking-[0.25em] font-medium text-white/50 font-sans drop-shadow-md">
              CONNECT MEMORY CORE TO AWAKEN MYRAA VOICE
            </span>

            <button
              onClick={handleToggleConnection}
              className="py-3 px-8 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-bold text-xs tracking-widest uppercase flex items-center gap-2.5 transition cursor-pointer shadow-[0_0_25px_rgba(168,85,247,0.4)] hover:scale-105 active:scale-95 border border-purple-400/40"
            >
              <Mic size={16} className={state === "listening" ? "animate-pulse text-cyan-300" : ""} />
              <span>{state === "disconnected" ? "AWAKEN VOICE" : state === "listening" ? "LISTENING..." : "SLEEP CORE"}</span>
            </button>
          </div>
        </main>
      </div>

      {/* BOTTOM FLOATING CONTROL DOCK */}
      <footer className="relative z-30 w-full px-4 pb-4 shrink-0">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between px-6 py-3 rounded-2xl border border-white/10 bg-[#090b1c]/90 backdrop-blur-md shadow-[0_-4px_25px_rgba(0,0,0,0.5)]">
          {/* 1. Private Mode */}
          <button
            onClick={() => setShowPrivateRoom(true)}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer group text-left"
          >
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 group-hover:scale-105 transition-transform">
              <Lock size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">PRIVATE MODE</div>
              <div className="text-[10px] text-slate-400">Secure &amp; Confidential</div>
            </div>
          </button>

          {/* 2. Music Mode */}
          <button
            onClick={() => setShowMusicHub(true)}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer group text-left"
          >
            <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 group-hover:scale-105 transition-transform">
              <Music size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">MUSIC MODE</div>
              <div className="text-[10px] text-slate-400">Relax &amp; Focus</div>
            </div>
          </button>

          {/* 3. Screen Share */}
          <button
            onClick={isScreenSharing ? stopScreenSharing : startScreenSharing}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer group text-left"
          >
            <div className={`p-2 rounded-xl border transition-transform ${isScreenSharing ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200' : 'bg-white/10 border-white/10 text-slate-300'}`}>
              <Monitor size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                {isScreenSharing ? "SHARING" : "SCREEN SHARE"}
              </div>
              <div className="text-[10px] text-slate-400">Visual Assistance</div>
            </div>
          </button>

          {/* 4. Center Power Button */}
          <button
            onClick={handleToggleConnection}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shrink-0 border shadow-lg ${
              state === "disconnected"
                ? "bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:scale-105"
                : state === "listening"
                ? "bg-purple-600 border-purple-400 text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] animate-pulse scale-105"
                : "bg-amber-600 border-amber-300 text-white"
            }`}
            title="Toggle Core Connection"
          >
            <Power size={22} />
          </button>

          {/* 5. Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer group text-left"
          >
            <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-slate-300 group-hover:text-white group-hover:scale-105 transition-transform">
              <SettingsIcon size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">SETTINGS</div>
              <div className="text-[10px] text-slate-400">Preferences</div>
            </div>
          </button>

          {/* 6. Shortcuts */}
          <button
            onClick={() => setShowCommandLauncher(true)}
            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition cursor-pointer group text-left"
          >
            <div className="p-2 rounded-xl bg-white/10 border border-white/10 text-slate-300 group-hover:text-white group-hover:scale-105 transition-transform">
              <Grid size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">SHORTCUTS</div>
              <div className="text-[10px] text-slate-400">Quick Access</div>
            </div>
          </button>
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

