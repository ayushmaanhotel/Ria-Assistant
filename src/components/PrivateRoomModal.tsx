import React, { useState, useEffect } from "react";
import {
  Lock,
  X,
  FileText,
  Download,
  Send,
  Plus,
  Shield,
  Eye,
  RefreshCw,
  Sparkles,
  Folder,
  FileCode,
  CheckCircle2,
  LockKeyhole,
  Trash2,
  KeyRound,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName: string;
}

interface VaultFile {
  name: string;
  path: string;
  size: number;
  mtime: string;
  isPdf: boolean;
  isTxt: boolean;
}

export function PrivateRoomModal({ isOpen, onClose, assistantName }: PrivateRoomModalProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"chat" | "vault">("chat");

  // Private Messaging State
  const [messages, setMessages] = useState<
    { id?: string; sender: "user" | "assistant"; text: string; time: string; attachment?: string }[]
  >([
    {
      id: "msg_welcome",
      sender: "assistant",
      text: `Welcome to our Private Conversation Room, Ayush! This room is 100% private and end-to-end isolated. Here, I can share documents, PDF notes, and private files directly with you.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Password-Protected Message Deletion State (Password: BET)
  const [showDeleteAuthModal, setShowDeleteAuthModal] = useState(false);
  const [deletePasswordInput, setDeletePasswordInput] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Document Generator state
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [docFormat, setDocFormat] = useState<"pdf" | "txt">("pdf");
  const [showDocCreator, setShowDocCreator] = useState(false);

  // Preview state
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/private-room/messages");
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch {}
  };

  const fetchVaultFiles = async () => {
    setLoadingFiles(true);
    try {
      const res = await fetch("/api/private-room/files");
      const data = await res.json();
      if (data.ok && Array.isArray(data.files)) {
        setFiles(data.files);
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      fetchVaultFiles();
      const interval = setInterval(() => {
        fetchMessages();
        fetchVaultFiles();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const currentText = inputText.trim();
    setInputText("");

    try {
      const res = await fetch("/api/private-room/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText })
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
        fetchVaultFiles();
      }
    } catch {}
  };

  const handleCreateDocument = async () => {
    if (!docTitle.trim() || !docContent.trim()) return;
    setIsGeneratingDoc(true);
    try {
      const filename = `${docTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.${docFormat}`;
      const res = await fetch("/api/private-room/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          title: docTitle,
          content: docContent,
          format: docFormat
        })
      });
      const data = await res.json();
      if (data.ok) {
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        setDocTitle("");
        setDocContent("");
        setShowDocCreator(false);
        fetchVaultFiles();
      }
    } catch (e: any) {
      alert(`Document generation error: ${e.message}`);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handlePreviewFile = async (file: VaultFile) => {
    try {
      const res = await fetch(`/api/private-room/file-content?path=${encodeURIComponent(file.path)}`);
      const data = await res.json();
      if (data.ok) {
        setPreviewTitle(file.name);
        setPreviewContent(data.content);
      }
    } catch {
      alert("Failed to load file preview.");
    }
  };

  const handleExecuteDelete = async () => {
    if (deletePasswordInput.trim() !== "BET") {
      setDeleteError("Access Denied: Password 'BET' required to delete private history.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/private-room/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: deletePasswordInput.trim(),
          msgId: deleteTargetId || undefined
        })
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        setMessages(data.messages);
        setShowDeleteAuthModal(false);
        setDeletePasswordInput("");
        setDeleteTargetId(null);
      } else {
        setDeleteError(data.error || "Deletion failed.");
      }
    } catch (e: any) {
      setDeleteError(e.message || "Failed to reach server.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-4xl h-[650px] bg-slate-950/90 border border-purple-500/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl relative"
        >
          {/* Password Protection Authentication Modal */}
          {showDeleteAuthModal && (
            <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-slate-900 border border-red-500/40 rounded-3xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-sans">
                      {deleteTargetId ? "Delete Private Message" : "Clear Entire Private Chat"}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Password Protection Required
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-300">
                    Enter Passcode (Password: <span className="text-red-400 font-bold">BET</span>):
                  </label>
                  <input
                    type="password"
                    value={deletePasswordInput}
                    onChange={(e) => {
                      setDeletePasswordInput(e.target.value);
                      setDeleteError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleExecuteDelete();
                    }}
                    placeholder="Enter password to confirm..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-red-500/60"
                    autoFocus
                  />
                  {deleteError && (
                    <p className="text-xs text-red-400 font-mono flex items-center gap-1">
                      <ShieldAlert size={12} /> {deleteError}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setShowDeleteAuthModal(false);
                      setDeleteError(null);
                      setDeletePasswordInput("");
                    }}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-lg shadow-red-600/20"
                  >
                    {isDeleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Header Bar */}
          <div className="px-6 py-4 border-b border-purple-500/20 bg-purple-950/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/10">
                <LockKeyhole size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide font-sans">
                    Private Conversation Room &amp; Vault
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[9px] font-mono text-purple-300 flex items-center gap-1">
                    <Shield size={10} /> E2E SECURE
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  Direct private communication channel &amp; PDF/document hub with {assistantName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setDeleteTargetId(null);
                  setDeletePasswordInput("");
                  setDeleteError(null);
                  setShowDeleteAuthModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs font-mono flex items-center gap-1.5 transition shadow-lg shadow-red-500/5 cursor-pointer"
                title="Clear Entire Private Room Chat (Password Required: BET)"
              >
                <Trash2 size={13} className="text-red-400" />
                <span>Clear Chat</span>
              </button>

              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition ${
                    activeTab === "chat" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Private Chat
                </button>
                <button
                  onClick={() => {
                    setActiveTab("vault");
                    fetchVaultFiles();
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition flex items-center gap-1 ${
                    activeTab === "vault" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Folder size={12} /> Document Vault ({files.length})
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 flex overflow-hidden">
            {activeTab === "chat" ? (
              <div className="flex-1 flex flex-col h-full bg-slate-900/30">
                {/* Message Log */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col group ${m.sender === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-sans relative ${
                          m.sender === "user"
                            ? "bg-purple-600 text-white rounded-br-none shadow-lg shadow-purple-600/20"
                            : "bg-slate-800/80 border border-purple-500/20 text-slate-100 rounded-bl-none"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>

                        {m.attachment && (
                          <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between gap-3 text-xs bg-black/20 p-2 rounded-xl">
                            <div className="flex items-center gap-2">
                              <FileText size={16} className="text-purple-300" />
                              <span className="font-mono font-bold">{m.attachment}</span>
                            </div>
                            <button
                              onClick={() => {
                                setActiveTab("vault");
                                fetchVaultFiles();
                              }}
                              className="px-2 py-1 bg-purple-500/30 hover:bg-purple-500/50 text-white rounded-lg font-mono text-[10px]"
                            >
                              View in Vault
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[9px] font-mono text-slate-500">{m.time}</span>
                        {m.id && m.id !== "msg_welcome" && (
                          <button
                            onClick={() => {
                              setDeleteTargetId(m.id || null);
                              setDeletePasswordInput("");
                              setDeleteError(null);
                              setShowDeleteAuthModal(true);
                            }}
                            className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Delete message (Password: BET)"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Bar & Document Trigger */}
                <div className="p-4 border-t border-purple-500/20 bg-slate-950/60 space-y-3">
                  {showDocCreator && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs font-mono text-purple-300">
                        <span>Generate &amp; Share Private Document</span>
                        <button onClick={() => setShowDocCreator(false)} className="text-slate-400 hover:text-white">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Document Title (e.g. Project Strategy Report)"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400"
                        />
                        <select
                          value={docFormat}
                          onChange={(e) => setDocFormat(e.target.value as "pdf" | "txt")}
                          className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs text-purple-300 font-mono focus:outline-none"
                        >
                          <option value="pdf">PDF Document (.pdf)</option>
                          <option value="txt">Text File (.txt)</option>
                        </select>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Type document content here..."
                        value={docContent}
                        onChange={(e) => setDocContent(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-purple-400 resize-none font-mono"
                      />
                      <button
                        onClick={handleCreateDocument}
                        disabled={isGeneratingDoc}
                        className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-2"
                      >
                        {isGeneratingDoc ? (
                          <span>Generating Document...</span>
                        ) : (
                          <>
                            <Sparkles size={14} /> Generate &amp; Save to Private Vault
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowDocCreator(!showDocCreator)}
                      className="px-3 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 font-mono text-xs flex items-center gap-1.5 transition"
                    >
                      <Plus size={14} /> Share PDF/TXT
                    </button>
                    <input
                      type="text"
                      placeholder={`Send a private message to ${assistantName}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-purple-400 transition"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/30"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex h-full overflow-hidden bg-slate-900/40">
                <div className="w-1/2 border-r border-white/10 flex flex-col p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                      Vault Files ({files.length})
                    </span>
                    <button
                      onClick={fetchVaultFiles}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
                    >
                      <RefreshCw size={14} className={loadingFiles ? "animate-spin" : ""} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    {files.length === 0 ? (
                      <div className="text-center py-12 text-slate-500 text-xs font-mono">
                        No private documents generated yet. Use the chat tab to generate PDF or TXT reports!
                      </div>
                    ) : (
                      files.map((f, i) => (
                        <div
                          key={i}
                          onClick={() => handlePreviewFile(f)}
                          className="p-3 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/5 hover:border-purple-500/30 transition cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            <FileText size={18} className="text-purple-400 flex-shrink-0" />
                            <div className="truncate">
                              <div className="text-xs font-mono font-bold text-slate-200 truncate">{f.name}</div>
                              <div className="text-[9px] font-mono text-slate-400">
                                {(f.size / 1024).toFixed(1)} KB • {new Date(f.mtime).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <Eye size={14} className="text-slate-500 group-hover:text-purple-300 flex-shrink-0" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="w-1/2 p-4 flex flex-col overflow-hidden bg-black/40">
                  <span className="text-xs font-mono text-purple-400 uppercase tracking-wider mb-2">
                    {previewTitle ? `Preview: ${previewTitle}` : "Document Viewer"}
                  </span>
                  {previewContent ? (
                    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-white/10 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {previewContent}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-600 text-xs font-mono">
                      <FileCode size={32} className="mb-2 opacity-50" />
                      Select a file from the vault to read its content.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
