# 🤖 Ria & MYRAA AI Assistant

> **Created, Designed & Developed by Ayush Upadhyay**  
> *A Next-Generation Multimodal Desktop AI Companion with Real-Time Voice, Live Screen Vision, Windows Application Automation, YouTube Music Streaming, and Encrypted Private Vault.*

---

## 💡 What is Ria & MYRAA? (Explained Simply for Beginners)

Imagine having a **smart, warm, and friendly assistant living right inside your computer**—just like **Jarvis from Iron Man**, but with a human-like voice, personality, and emotions! 

**MYRAA** and **Ria** are your two personal AI companions. They don't just type text; they can:
1. 🗣️ **Talk with you in real-time** over a smooth voice call without annoying delays.
2. 👁️ **Look at your screen** while you work or code to guide you step-by-step.
3. 🎵 **Play music on command** (Lofi beats, study music, or any YouTube song).
4. 💻 **Control your computer** (Open apps like Notepad, Chrome, VS Code, Calculator, search Google, and adjust volume).
5. 🔒 **Private Room & Vault**: A password-protected secret space (passcode: `BET`) where you can have 100% private chats and automatically create text/PDF files saved directly to your computer.

---

## 🧠 Non-Technical Analogy: How Does It Work?

Think of your computer as a **house**:
* **The AI Brain (Gemini 3.1 Live)** is like the assistant's mind listening and thinking.
* **The Voice System (Web Audio API & WebSockets)** is like a direct phone line between your microphone and the AI.
* **The Screen Vision (Display Media Capture & Native Windows OCR)** acts as the assistant's eyes looking at your monitor.
* **The Desktop Agent (Python & Windows SDK)** acts as the assistant's hands, allowing her to press keys, click buttons, open applications, and change volume settings for you.

---

## 🚀 Key Capabilities (What It CAN Do)

| Feature | Description |
| :--- | :--- |
| **🗣️ Real-Time Voice Calls** | Speak naturally with no wake-word friction. Includes noise cancellation and speaker echo suppression. |
| **👁️ Live Screen Vision** | Share your screen with a single click (`SCREEN`). The AI watches your active window, documents, or code and guides you live. |
| **🔍 Native Windows OCR** | Reads text directly off your screen using Microsoft's native `Windows.Media.Ocr` engine. |
| **🎵 Music & Audio Hub** | Single-click streaming for Lofi beats, focus music, synthwave, or custom YouTube search. |
| **💻 Desktop App Execution** | Open Notepad, Chrome, VS Code, Calculator, File Explorer, Task Manager, Settings, PowerShell, and Command Prompt. |
| **🔒 Private Room & Vault** | Protected by passcode `BET`. Chat privately and generate `.txt`, `.md`, or `.pdf` documents directly to `%UserProfile%\Desktop\MYRAA_Private_Room`. |
| **🚀 Spotlight Command Launcher** | Press `Ctrl + K` (or click `LAUNCH`) for a quick action search palette. |

---

## 🚫 Limitations (What It CANNOT Do)

* ❌ **No Physical Hardware Actions**: Cannot touch physical objects, move physical cables, or press physical power buttons on your desk.
* ❌ **No UAC Administrator Bypass**: Cannot bypass Windows Administrator (UAC) prompts without your explicit manual mouse click.
* ❌ **Requires Internet**: Requires an active internet connection to communicate with Google's Gemini Multimodal AI servers.
* ❌ **Requires Gemini API Key**: Requires a free API Key from Google AI Studio to power the AI brain.

---

## 🏗️ Difficulty Rating: Building This From Scratch

### **Difficulty Score: 9.5 / 10 (Advanced Software Architecture)**

Building an application like **MYRAA** from scratch is extremely challenging because it requires uniting **5 complex software engineering layers**:

1. **Low-Latency PCM Audio Streaming**: Processing raw 16kHz Float32 mic data and converting it to 16-bit Int16 PCM Little-Endian in real-time inside the browser without causing memory leaks or audio stutters.
2. **Bi-Directional WebSockets Bridge**: Bridging browser WebSockets to Google's Gemini Live API with non-blocking tool calls, speech interruptions, and turn management.
3. **Native Desktop Automation**: Writing a Python backend using `pywin32` and PyInstaller to control native Windows processes, system volume, and window handles.
4. **Native Windows C++ COM Interop**: Interfacing Python with Microsoft's C++ Universal Windows Platform SDK (`winsdk`) to execute `Windows.Media.Ocr` without third-party installations.
5. **Electron Native Desktop Runtime**: Packaging Node.js, Python, and Vite React into an isolated Windows ARM64 executable container with automated process lifecycles.

---

## 🛠️ Tech Stack & Architecture

```
                               ┌────────────────────────────────┐
                               │   Electron ARM64 App Wrapper   │
                               └───────────────┬────────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               │                                                               │
               ▼                                                               ▼
   ┌──────────────────────┐                                       ┌──────────────────────┐
   │ React 19 Frontend UI │ ◄─────── WebSockets (Port 3010) ──────► │ Node.js Express Server│
   │ (TypeScript & Vite)  │                                       │ (server.ts / cjs)    │
   └──────────────────────┘                                       └───────────┬──────────┘
               │                                                              │
               │ Screen Frames & PCM Mic Audio                                │ Gemini Live API
               ▼                                                              ▼
   ┌──────────────────────┐                                       ┌──────────────────────┐
   │ Python Desktop Agent │ ◄────── HTTP REST (Port 8765) ────────► │  Google Gemini 3.1   │
   │ (FastAPI & WinSDK)   │                                       │  Flash Live Preview  │
   └──────────────────────┘                                       └──────────────────────┘
```

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Framer Motion.
* **Desktop Runtime**: Electron 43, Node.js.
* **Server Bridge**: Express, WebSockets (`ws`), `@google/genai` SDK.
* **Desktop Agent**: Python 3.11, FastAPI, Uvicorn, PyInstaller, `winsdk` (Windows Media OCR), PyAutoGUI, PIL (Pillow).
* **AI Engine**: Google Gemini 3.1 Flash Live Preview & Gemini 2.5 Flash.

---

## 📥 How to Download, Install & Run (Beginner Step-by-Step)

### **1. Prerequisites**
Before you start, make sure you have the following installed on your Windows PC:
- [Node.js (v18 or higher)](https://nodejs.org/)
- [Python 3.11+](https://www.python.org/downloads/)
- [Git](https://git-scm.com/)
- **Gemini API Key**: Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

### **2. Download & Install**

Open **PowerShell** or **Command Prompt** and run the following commands:

```bash
# 1. Clone the GitHub repository created by Ayush Upadhyay
git clone https://github.com/ayushmaanhotel/Ria-Assistant.git

# 2. Navigate into the project folder
cd Ria-Assistant

# 3. Install Node.js dependencies
npm install

# 4. Install Python dependencies for the desktop agent
python -m pip install -r desktop_agent/requirements.txt
python -m pip install winsdk
```

---

### **3. How to Run the Assistant**

#### **Option A: Development Mode (Recommended for testing)**
Run the local dev server:
```bash
npm run dev
```
Open your browser at `http://127.0.0.1:3010`.

#### **Option B: Run Desktop App (Electron)**
Run the native desktop app window:
```bash
npm run app
```

---

### **4. Setting Up Your API Key**
1. When you open the application for the first time, click **SETTINGS** in the top right corner.
2. Paste your **Gemini API Key** into the API Key input box.
3. Click **Save Key**. You are now ready to talk to Ria & MYRAA!

---

## 🎮 How to Use (User Guide)

1. 🎙️ **Start Talking**: Click the central holographic orb or press **CONNECT** to start a live voice session.
2. 👁️ **Share Screen**: Click **`SCREEN`** in the top bar. A floating badge will appear: `[📹 LIVE SCREEN VISION ACTIVE]`. The assistant can now see your screen and guide your work.
3. 🎵 **Play Music**: Click **`MUSIC`** in the top bar. Select a station (Lofi, Focus, Synthwave) or search for any YouTube video.
4. 🔒 **Open Private Room**: Click **`PRIVATE ROOM`**. Enter password `BET` to enter the private chat or create encrypted PDF notes.
5. 🚀 **Quick Launcher**: Press `Ctrl + K` to open the Spotlight search bar to launch Windows apps (Notepad, Chrome, VS Code, Calculator, Settings).

---

## ✍️ Author & Credits

* **Architect & Developer**: **Ayush Upadhyay**
* **GitHub Repository**: [https://github.com/ayushmaanhotel/Ria-Assistant](https://github.com/ayushmaanhotel/Ria-Assistant)

---
*Created with ❤️ by Ayush Upadhyay.*
