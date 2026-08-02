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
  Download
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Theme based on assistant
  const getThemeColors = () => {
    const name = assistantName.toLowerCase();
    if (name.includes('myraa')) return 'border-purple-500/20 shadow-[0_0_80px_rgba(168,85,247,0.15)]';
    if (name.includes('ria')) return 'border-cyan-500/20 shadow-[0_0_80px_rgba(6,182,212,0.15)]';
    if (name.includes('mike')) return 'border-amber-500/20 shadow-[0_0_80px_rgba(245,158,11,0.15)]';
    return 'border-purple-500/20 shadow-[0_0_80px_rgba(168,85,247,0.15)]';
  };

  const getAssistantAccent = () => {
    const name = assistantName.toLowerCase();
    if (name.includes('myraa')) return 'text-purple-400';
    if (name.includes('ria')) return 'text-cyan-400';
    if (name.includes('mike')) return 'text-amber-400';
    return 'text-purple-400';
  };

  // Data Fetching
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
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/private-room/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: userText }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
          fetchFiles();
        }
      }
    } catch (err) {
      console.error('Send error', err);
    }
  };

  const handleDeleteMessage = async () => {
    if (passwordInput !== 'BET') {
      setPasswordError('Invalid Password');
      return;
    }
    try {
      const res = await fetch('/api/private-room/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: messageToDelete, password: passwordInput }),
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageToDelete));
        setAuthModalOpen(false);
        setPasswordInput('');
        setPasswordError('');
      } else {
        setPasswordError('Failed to delete message');
      }
    } catch (err) {
      setPasswordError('Network error');
    }
  };

  const handleGenerateDoc = async () => {
    if (!docTitle || !docContent) return;
    setIsGeneratingDoc(true);
    try {
      const res = await fetch('/api/private-room/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: docTitle, format: docFormat, content: docContent }),
      });
      if (res.ok) {
        setDocCreatorOpen(false);
        setDocTitle('');
        setDocContent('');
        fetchFiles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleFileUpload = async (uploadedFiles: FileList | File[]) => {
    setIsUploading(true);
    const formData = new FormData();
    Array.from(uploadedFiles).forEach(f => formData.append('files', f));

    try {
      const res = await fetch('/api/private-room/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchFiles();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      setIsDragging(false);
    }
  };

  const handlePreviewFile = async (file: VaultFile) => {
    setSelectedFile(file);
    if (file.type === '.pdf') {
      setFilePreviewContent('PDF preview not fully supported in simple text viewer. Download to view.');
      return;
    }
    setIsPreviewLoading(true);
    try {
      const res = await fetch(`/api/private-room/file-content?path=${encodeURIComponent(file.path)}`);
      if (res.ok) {
        const data = await res.json();
        setFilePreviewContent(data.content || 'No content');
      } else {
        setFilePreviewContent('Failed to load content.');
      }
    } catch (err) {
      setFilePreviewContent('Network error while fetching content.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Drag and drop handlers
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Main Modal Shell */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-6xl h-[85vh] bg-[#04060f]/90 backdrop-blur-2xl rounded-2xl border ${getThemeColors()} flex flex-col overflow-hidden shadow-2xl`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <Lock className="w-4 h-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400 tracking-wider">END-TO-END ISOLATED VAULT</span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center shadow-inner`}>
                  <Shield className={`w-4 h-4 ${getAssistantAccent()}`} />
                </div>
                <span className="text-sm font-medium text-white/90 uppercase tracking-wide">
                  {assistantName} PRIVATE WORKSPACE
                </span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-transform hover:scale-105 active:scale-95 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Bar */}
          <div className="flex justify-center py-4 border-b border-white/5">
            <div className="flex items-center gap-2 p-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md">
              {[
                { id: 'chat', label: 'Private Chat', icon: MessageSquare, badge: messages.length },
                { id: 'board', label: 'Blackboard', icon: PenTool },
                { id: 'vault', label: 'Vault Explorer', icon: FolderLock, badge: files.length }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab.id ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-white/10 rounded-full border border-white/20"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <tab.icon size={14} className="relative z-10" />
                  <span className="relative z-10">{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="relative z-10 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-purple-500 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-hidden relative">
            
            {/* CHAT TAB */}
            {activeTab === 'chat' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  <div className="flex justify-center">
                    <span className="px-3 py-1 text-xs font-medium text-white/40 bg-white/5 rounded-full border border-white/5">
                      End-to-End Encrypted Tunnel Active
                    </span>
                  </div>
                  
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group`}
                    >
                      <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border ${
                          msg.sender === 'user' ? 'bg-indigo-500/20 border-indigo-400/30' : 'bg-[#0c0f20] border-white/10'
                        }`}>
                          {msg.sender === 'user' ? <span className="text-xs text-indigo-300">ME</span> : <Shield className={`w-4 h-4 ${getAssistantAccent()}`} />}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <div className={`relative p-4 rounded-2xl ${
                            msg.sender === 'user' 
                              ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/30 border border-purple-400/30 text-white rounded-tr-sm'
                              : 'bg-[#0c0f20] border border-white/10 shadow-lg text-white/90 rounded-tl-sm'
                          }`}>
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                            
                            {/* Attachments */}
                            {msg.attachment && (
                              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs cursor-pointer hover:bg-white/10 transition-colors">
                                <FileIcon size={12} className="text-amber-400" />
                                <span>{msg.attachment}</span>
                              </div>
                            )}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {msg.attachments.map((att, i) => (
                                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs cursor-pointer hover:bg-white/10 transition-colors">
                                    <FileIcon size={12} className={att.type === 'pdf' ? 'text-amber-400' : 'text-cyan-400'} />
                                    <span>{att.name}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Message Actions */}
                            <div className={`absolute top-2 ${msg.sender === 'user' ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                              {msg.id && (
                                <button
                                  onClick={() => { setMessageToDelete(msg.id!); setAuthModalOpen(true); }}
                                  className="p-1.5 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <span className={`text-[10px] text-white/30 px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                            {msg.time || (msg.timestamp ? (isNaN(Date.parse(msg.timestamp)) ? msg.timestamp : new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="relative flex items-center bg-[#0a0d1d] border border-white/15 rounded-xl focus-within:border-purple-400/60 focus-within:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all">
                    <button
                      onClick={() => setDocCreatorOpen(true)}
                      className="p-3 text-white/50 hover:text-white transition-colors ml-1"
                      title="Quick Document Creator"
                    >
                      <Plus size={20} />
                    </button>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a highly secure message..."
                      className="flex-1 bg-transparent text-white placeholder-white/30 px-2 py-4 outline-none text-sm"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim()}
                      className="p-3 mr-2 text-purple-400 hover:text-purple-300 disabled:text-white/20 transition-colors"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* BLACKBOARD TAB */}
            {activeTab === 'board' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full w-full min-h-0 flex flex-col overflow-hidden bg-black/20"
              >
                <InteractiveWhiteboard aiCommands={aiCommands} />
              </motion.div>
            )}

            {/* VAULT EXPLORER TAB */}
            {activeTab === 'vault' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex"
              >
                {/* Left Half: File Explorer */}
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
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
                          title="Upload Files"
                        >
                          <Upload size={14} />
                        </button>
                        <button
                          onClick={fetchFiles}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/10"
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

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {files.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-white/10 rounded-xl">
                        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                          <FileUp className="w-8 h-8 text-white/20" />
                        </div>
                        <p className="text-sm font-medium text-white/60">Vault is empty</p>
                        <p className="text-xs text-white/40 mt-1">Drag and drop files here or use the upload button.</p>
                      </div>
                    ) : (
                      files.filter(f => f.name.toLowerCase().includes(vaultSearch.toLowerCase())).map((file, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                            selectedFile?.path === file.path 
                              ? 'bg-purple-500/10 border-purple-500/30' 
                              : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15'
                          }`}
                          onClick={() => handlePreviewFile(file)}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                              <FileIcon size={16} className={
                                file.type === '.pdf' ? 'text-red-400' :
                                file.type === '.txt' ? 'text-cyan-400' : 'text-purple-400'
                              } />
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-medium text-white/90 truncate">{file.name}</span>
                              <span className="text-xs text-white/40">{file.size} • {new Date(file.mtime).toLocaleDateString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white" title="Preview">
                              <Eye size={14} />
                            </button>
                            <button className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white" title="Copy Path" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(file.path); }}>
                              <Copy size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right Half: Document Viewer */}
                <div className="w-1/2 flex flex-col bg-[#050711]">
                  {selectedFile ? (
                    <>
                      <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText size={16} className="text-white/50 flex-shrink-0" />
                          <h4 className="text-sm font-medium text-white/80 truncate">{selectedFile.name}</h4>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => navigator.clipboard.writeText(filePreviewContent)}
                            className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-xs text-white/70 transition-colors border border-white/10"
                          >
                            <Copy size={12} /> Copy Text
                          </button>
                          <button
                            onClick={() => setSelectedFile(null)}
                            className="p-1 rounded bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {isPreviewLoading ? (
                          <div className="flex flex-col items-center justify-center h-full text-white/40 gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-sm">Decrypting contents...</span>
                          </div>
                        ) : (
                          <div className="relative group h-full">
                            <pre className="text-[13px] text-white/70 font-mono leading-relaxed whitespace-pre-wrap break-words font-light">
                              {filePreviewContent}
                            </pre>
                          </div>
                        )}
                      </div>
                      <div className="p-2 border-t border-white/10 bg-black/40 flex justify-between text-[10px] text-white/30 uppercase tracking-widest font-semibold">
                        <span>{selectedFile.type.replace('.', '')} Document</span>
                        <span>{filePreviewContent.length} Chars</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-white/30 gap-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                        <Eye className="w-8 h-8 opacity-50" />
                      </div>
                      <span className="text-sm font-medium">Select a file to preview its decrypted contents</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Drag Drop Overlay */}
            <AnimatePresence>
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 bg-[#04060f]/90 backdrop-blur-md border-4 border-dashed border-purple-500/50 rounded-2xl flex flex-col items-center justify-center pointer-events-none"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(168,85,247,0.3)]"
                  >
                    <FileUp className="w-10 h-10 text-purple-400" />
                  </motion.div>
                  <h2 className="text-xl font-bold text-white mb-2">Drop files here to upload to Private Vault</h2>
                  <p className="text-purple-300/60 text-sm">(Auto-ingested to AI Knowledge Base)</p>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      </div>

      {/* Password Auth Modal */}
      <AnimatePresence>
        {authModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => { setAuthModalOpen(false); setPasswordError(''); setPasswordInput(''); }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0d1d] border border-red-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.15)] flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-red-400 border-b border-white/10 pb-4">
                <LockKeyhole size={24} />
                <h3 className="text-lg font-semibold text-white">Authorized Deletion Required</h3>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Access Password</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter passphrase..."
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-red-500/50 focus:outline-none transition-colors"
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                  <AlertCircle size={14} />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => { setAuthModalOpen(false); setPasswordError(''); setPasswordInput(''); }}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors border border-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteMessage}
                  className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Creator Overlay Modal */}
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
                      className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:border-purple-400/50 focus:outline-none transition-colors appearance-none"
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
                    className="px-5 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerateDoc}
                    disabled={isGeneratingDoc || !docTitle || !docContent}
                    className="flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)]"
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
