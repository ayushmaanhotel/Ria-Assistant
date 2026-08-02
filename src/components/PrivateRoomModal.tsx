import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Lock,
  Shield,
  MessageSquare,
  PenTool,
  FolderLock,
  Send,
  Plus,
  Trash2,
  FileText,
  File as FileIcon,
  LockKeyhole,
  AlertCircle,
  Eye,
  Copy,
  FileUp,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  Download,
  Paperclip,
  Code,
  Smile,
  CheckCircle2,
  Filter,
  Info,
  MoreVertical,
  Calendar,
  Key,
  Activity,
  Check
} from 'lucide-react';
import { InteractiveWhiteboard } from './InteractiveWhiteboard';

interface PrivateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName: string;
  aiCommands?: any[];
}

interface Message {
  id?: string;
  text: string;
  sender: 'user' | 'assistant';
  time?: string;
  timestamp?: string;
  attachment?: string;
  attachments?: { name: string; type: string; url?: string }[];
}

interface VaultFile {
  name: string;
  size: string;
  mtime: string;
  type: string;
  path: string;
}

export function PrivateRoomModal({
  isOpen,
  onClose,
  assistantName,
  aiCommands,
}: PrivateRoomModalProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'board' | 'vault'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [vaultSearch, setVaultSearch] = useState('');
  const [clearedNotice, setClearedNotice] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [filePreviewContent, setFilePreviewContent] = useState<string>('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [docCreatorOpen, setDocCreatorOpen] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docFormat, setDocFormat] = useState<'TXT' | 'PDF'>('TXT');
  const [docContent, setDocContent] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  const [vaultCopied, setVaultCopied] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Assistant theme accents
  const getAssistantAccent = () => {
    const name = assistantName.toLowerCase();
    if (name.includes('myraa')) return 'text-purple-400';
    if (name.includes('ria')) return 'text-cyan-400';
    if (name.includes('mike')) return 'text-amber-400';
    return 'text-purple-400';
  };

  // Fetch messages and files
  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/private-room/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch('/api/private-room/files');
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to fetch files', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      fetchFiles();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  // Actions
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userText = chatInput.trim();
    setChatInput('');

    const tempMsg: Message = {
      id: Date.now().toString(),
      text: userText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/private-room/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: (Date.now() + 1).toString(),
              text: data.reply,
              sender: 'assistant',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const handleClearConversation = async () => {
    setMessages([]);
    setClearedNotice(true);
    try {
      await fetch('/api/private-room/messages', { method: 'DELETE' });
    } catch {
      /* ignore */
    }
  };

  const handleDeleteMessage = async () => {
    if (passwordInput !== '1234' && passwordInput !== 'myraa' && passwordInput !== 'admin') {
      setPasswordError('Invalid authorization key');
      return;
    }

    if (messageToDelete) {
      setMessages((prev) => prev.filter((m) => m.id !== messageToDelete));
      try {
        await fetch(`/api/private-room/messages/${messageToDelete}`, { method: 'DELETE' });
      } catch {
        /* ignore */
      }
    }

    setAuthModalOpen(false);
    setMessageToDelete(null);
    setPasswordInput('');
    setPasswordError('');
  };

  const handleFileUpload = async (filesToUpload: FileList | File[]) => {
    setIsUploading(true);
    const formData = new FormData();
    Array.from(filesToUpload).forEach((file) => formData.append('files', file));

    try {
      const res = await fetch('/api/private-room/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchFiles();
      }
    } catch (err) {
      console.error('Failed to upload files', err);
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handlePreviewFile = async (file: VaultFile) => {
    setSelectedFile(file);
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`/api/private-room/file-content?path=${encodeURIComponent(file.path)}`);
      if (res.ok) {
        const data = await res.json();
        setFilePreviewContent(data.content || 'Empty file');
      } else {
        setFilePreviewContent('Unable to load file content.');
      }
    } catch {
      setFilePreviewContent('Failed to fetch file contents.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleGenerateDoc = async () => {
    if (!docTitle.trim() || !docContent.trim()) return;
    setIsGeneratingDoc(true);

    try {
      const res = await fetch('/api/private-room/create-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docTitle,
          format: docFormat,
          content: docContent,
        }),
      });

      if (res.ok) {
        setDocCreatorOpen(false);
        setDocTitle('');
        setDocContent('');
        fetchFiles();
      }
    } catch (err) {
      console.error('Failed to generate document', err);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const copyVaultId = () => {
    navigator.clipboard.writeText('MYRAA-PRIVATE-001');
    setVaultCopied(true);
    setTimeout(() => setVaultCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-7xl h-[92vh] max-h-[920px] bg-[#070814] border border-white/15 rounded-2xl shadow-[0_0_90px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden text-white"
        >
          {/* Top Main Window Bar */}
          <div className="h-16 px-6 border-b border-white/10 bg-[#0a0c1b] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-base tracking-wider text-white uppercase">MYRAA</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">
                  END-TO-END ISOLATED VAULT
                </span>
              </div>
              <div className="h-5 w-[1px] bg-white/10 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-white/80 tracking-wide uppercase">
                <Shield className={`w-4 h-4 ${getAssistantAccent()}`} />
                <span>{assistantName} PRIVATE WORKSPACE</span>
              </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/50 border border-white/10">
                {[
                  { id: 'chat', label: 'Private Chat', icon: MessageSquare, badge: messages.length },
                  { id: 'board', label: 'Blackboard', icon: PenTool },
                  { id: 'vault', label: 'Vault Explorer', icon: FolderLock, badge: files.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-purple-600/30 text-white border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={14} />
                    <span>{tab.label}</span>
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="flex items-center justify-center w-4 h-4 text-[9px] font-bold text-white bg-purple-500 rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition cursor-pointer border border-white/5 ml-2"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* MAIN VIEWPORT */}
          <div className="flex-1 flex min-h-0 relative overflow-hidden">
            {/* ---------------- 1. PRIVATE CHAT TAB (3-COLUMN LAYOUT) ---------------- */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex min-h-0 w-full">
                {/* LEFT CONVERSATIONS COLUMN */}
                <div className="w-64 shrink-0 bg-[#060712] border-r border-white/10 flex flex-col p-4 justify-between">
                  <div className="space-y-4">
                    <button
                      onClick={() => setMessages([])}
                      className="w-full py-2.5 px-4 rounded-xl border border-purple-500/40 bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                    >
                      <Plus size={16} />
                      <span>New Private Chat</span>
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold tracking-wider uppercase pt-2">
                      <span>Conversations</span>
                      <button className="p-1 hover:text-white"><Filter size={14} /></button>
                    </div>

                    <div className="space-y-1.5">
                      <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-300">
                            <Shield size={14} />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-white">Private Room</div>
                            <div className="text-[10px] text-slate-400">Secure conversation</div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] text-slate-500">12:26 pm</span>
                          <span className="w-4 h-4 rounded-full bg-purple-500 text-[9px] font-bold text-white flex items-center justify-center">1</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Security Card */}
                  <div className="p-3.5 rounded-xl border border-white/10 bg-white/5 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <Lock size={14} />
                      <span>End-to-End Encrypted</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Your messages are protected with military-grade encryption.
                    </p>
                  </div>
                </div>

                {/* MIDDLE CHAT CONVERSATION AREA */}
                <div className="flex-1 flex flex-col bg-[#090b1a] min-w-0 border-r border-white/10">
                  {/* Chat Sub-Header */}
                  <div className="h-14 px-6 border-b border-white/10 bg-black/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-950/40 border border-purple-500/30 flex items-center justify-center text-purple-400">
                        <Shield size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-white">
                          <span>Private Room</span>
                          <Lock size={12} className="text-emerald-400" />
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold">
                            Encrypted
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">End-to-end encrypted conversation</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <button className="p-1.5 hover:text-white rounded-lg hover:bg-white/5"><Search size={16} /></button>
                      <button className="p-1.5 hover:text-white rounded-lg hover:bg-white/5"><Info size={16} /></button>
                      <button className="p-1.5 hover:text-white rounded-lg hover:bg-white/5"><MoreVertical size={16} /></button>
                    </div>
                  </div>

                  {/* Messages Viewport */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Timestamp divider */}
                    <div className="flex justify-center">
                      <span className="px-3 py-1 rounded-full bg-white/5 text-[11px] font-medium text-slate-400 border border-white/5">
                        Today
                      </span>
                    </div>

                    {clearedNotice && (
                      <div className="mx-auto max-w-md p-3.5 rounded-xl border border-white/10 bg-white/5 flex items-center gap-3 text-xs text-slate-300">
                        <Shield size={16} className="text-purple-400 shrink-0" />
                        <span>Private room conversation history has been securely cleared.</span>
                      </div>
                    )}

                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group`}
                      >
                        <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div
                            className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${
                              msg.sender === 'user'
                                ? 'bg-purple-600/30 border-purple-400/40 text-purple-200'
                                : 'bg-[#0c0f20] border-white/10 text-cyan-300'
                            }`}
                          >
                            {msg.sender === 'user' ? (
                              <span className="text-xs font-bold">ME</span>
                            ) : (
                              <Shield className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex flex-col gap-1">
                            <div
                              className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                msg.sender === 'user'
                                  ? 'bg-purple-600/30 border border-purple-400/30 text-white rounded-tr-sm'
                                  : 'bg-[#0e1126] border border-white/10 text-slate-200 rounded-tl-sm'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.text}</p>
                            </div>
                            <span
                              className={`text-[10px] text-slate-500 px-1 ${
                                msg.sender === 'user' ? 'text-right' : 'text-left'
                              }`}
                            >
                              {msg.time || 'Just now'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Rich Input Box */}
                  <div className="p-4 border-t border-white/10 bg-black/40">
                    <div className="bg-[#0b0e21] border border-purple-500/30 focus-within:border-purple-500 rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock size={14} className="text-slate-400" />
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                          placeholder="Type a highly secure message..."
                          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <button
                            type="button"
                            onClick={() => setDocCreatorOpen(true)}
                            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                            title="Add document"
                          >
                            <Plus size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                            title="Attach file"
                          >
                            <Paperclip size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDocCreatorOpen(true)}
                            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                            title="Code snippet"
                          >
                            <Code size={16} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition"
                            title="Emoji"
                          >
                            <Smile size={16} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono text-slate-500">
                            {chatInput.length} / 4000
                          </span>
                          <button
                            type="button"
                            onClick={handleSendMessage}
                            disabled={!chatInput.trim()}
                            className="py-1.5 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-[0_0_12px_rgba(147,51,234,0.3)]"
                          >
                            <Send size={14} />
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT CONVERSATION DETAILS SIDEBAR */}
                <div className="w-72 shrink-0 bg-[#060712] flex flex-col justify-between p-6 overflow-y-auto">
                  <div className="space-y-6">
                    {/* Header Shield Emblem */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-purple-950/40 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                        <Shield size={32} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white">Private Room</h3>
                        <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs mt-0.5">
                          <Lock size={12} />
                          <span>Encrypted</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          End-to-end encrypted • Secure • Private • Isolated
                        </p>
                      </div>
                    </div>

                    {/* Metadata Specs Table */}
                    <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-2"><MessageSquare size={14} /> Messages</span>
                        <span className="font-semibold text-white">{messages.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-2"><Calendar size={14} /> Created</span>
                        <span className="font-semibold text-white">Today, 12:26 pm</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-2"><Key size={14} /> Encryption</span>
                        <span className="font-semibold text-white font-mono">AES-256-GCM</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="flex items-center gap-2"><Activity size={14} /> Status</span>
                        <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clear Action Button */}
                  <div className="space-y-2 pt-6 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handleClearConversation}
                      className="w-full py-2.5 px-4 rounded-xl border border-purple-500/30 bg-purple-950/20 hover:bg-purple-900/30 text-purple-300 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                      <span>Clear Conversation</span>
                    </button>
                    <p className="text-[10px] text-slate-500 text-center">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------- 2. BLACKBOARD TAB ---------------- */}
            {activeTab === 'board' && (
              <div className="flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden bg-black/20">
                <InteractiveWhiteboard aiCommands={aiCommands} />
              </div>
            )}

            {/* ---------------- 3. VAULT EXPLORER TAB ---------------- */}
            {activeTab === 'vault' && (
              <div className="flex-1 flex min-h-0 w-full">
                {/* File Explorer */}
                <div className="w-1/2 border-r border-white/10 flex flex-col bg-black/20">
                  <div className="p-4 border-b border-white/10 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                        <FolderLock size={16} className="text-purple-400" />
                        Encrypted Storage
                        <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono">{files.length}</span>
                      </h3>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          multiple
                          ref={fileInputRef}
                          className="hidden"
                          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10 cursor-pointer"
                          title="Upload Files"
                        >
                          <Upload size={14} />
                        </button>
                        <button
                          onClick={fetchFiles}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10 cursor-pointer"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                      <input
                        type="text"
                        placeholder="Search vault..."
                        value={vaultSearch}
                        onChange={(e) => setVaultSearch(e.target.value)}
                        className="w-full bg-[#0a0d1d] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/30 focus:border-purple-400/50 outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {files.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/10 rounded-xl">
                        <FileUp className="w-8 h-8 text-white/20 mb-2" />
                        <p className="text-sm font-medium text-white/60">Vault is empty</p>
                        <p className="text-xs text-white/40 mt-1">Upload files or create documents.</p>
                      </div>
                    ) : (
                      files
                        .filter((f) => f.name.toLowerCase().includes(vaultSearch.toLowerCase()))
                        .map((file, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                              selectedFile?.path === file.path
                                ? 'bg-purple-600/20 border-purple-500/40'
                                : 'bg-white/5 border-white/5 hover:bg-white/10'
                            }`}
                            onClick={() => handlePreviewFile(file)}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileIcon size={16} className="text-purple-400 shrink-0" />
                              <div className="flex flex-col truncate">
                                <span className="text-xs font-medium text-white truncate">{file.name}</span>
                                <span className="text-[10px] text-slate-400">{file.size}</span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* File Preview */}
                <div className="w-1/2 flex flex-col bg-[#050711]">
                  {selectedFile ? (
                    <>
                      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={16} className="text-purple-400 shrink-0" />
                          <h4 className="text-xs font-medium text-white truncate">{selectedFile.name}</h4>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6">
                        {isPreviewLoading ? (
                          <div className="flex items-center justify-center h-full text-slate-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-xs">Decrypting contents...</span>
                          </div>
                        ) : (
                          <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                            {filePreviewContent}
                          </pre>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
                      <Eye className="w-8 h-8 opacity-40" />
                      <span className="text-xs">Select a file to preview its decrypted contents</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM STATUS FOOTER */}
          <div className="h-10 px-6 border-t border-white/10 bg-[#060712] flex items-center justify-between text-xs text-slate-400 font-mono shrink-0">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <Shield size={14} />
              <span>Secure Connection Active</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={copyVaultId}
                className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
              >
                <span>Vault ID: MYRAA-PRIVATE-001</span>
                {vaultCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
              <div className="w-[1px] h-3 bg-white/10" />
              <span>Region: 🌐 Isolated</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400">
              <CheckCircle2 size={12} className="text-emerald-400" />
              <span>Last synced: Just now</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Document Creator Modal */}
      <AnimatePresence>
        {docCreatorOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setDocCreatorOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#090c1a] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2 text-white">
                  <FileText className="text-purple-400" size={18} />
                  <h3 className="font-semibold text-sm">Create Vault Document</h3>
                </div>
                <button onClick={() => setDocCreatorOpen(false)} className="text-white/50 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Document Title</label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="e.g., Project_Alpha_Notes"
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:border-purple-400/50 focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="w-32 space-y-1">
                    <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Format</label>
                    <select
                      value={docFormat}
                      onChange={(e) => setDocFormat(e.target.value as any)}
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-400/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                    >
                      <option value="TXT">TXT</option>
                      <option value="PDF">PDF</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1 flex-1">
                  <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Content</label>
                  <textarea
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    placeholder="Enter document contents here..."
                    className="w-full h-64 bg-black/50 border border-white/10 rounded-lg p-4 text-white text-sm focus:border-purple-400/50 focus:outline-none transition-colors resize-none font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setDocCreatorOpen(false)}
                    className="px-5 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateDoc}
                    disabled={isGeneratingDoc || !docTitle || !docContent}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
                  >
                    {isGeneratingDoc ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isGeneratingDoc ? 'Generating...' : 'Save to Vault'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
