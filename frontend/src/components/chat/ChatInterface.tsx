"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "@/providers/ThemeProvider";
import { Upload, Send, Settings, Paperclip, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isTyping?: boolean;
  analysis?: any;
}

export default function ChatInterface() {
  const { theme, setTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Welcome to SceneSense AI Platform. Upload an Image, CSV, Excel, or PDF to begin the analysis.",
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    const container = document.getElementById("chat-scroll-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    
    // Add typing indicator
    const typingId = "typing-" + Date.now();
    setMessages(prev => [...prev, { id: typingId, role: "assistant", content: "", isTyping: true }]);
    
    try {
      const res = await axios.post("http://localhost:8000/api/v1/chat", [
        { role: "user", content: inputValue }
      ]);
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: res.data.content }]);
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: "Sorry, the AI engine is currently unreachable." }]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: `Uploaded file: ${file.name}` };
    setMessages(prev => [...prev, userMsg]);
    
    const formData = new FormData();
    formData.append("file", file);

    const typingId = "typing-" + Date.now();
    setMessages(prev => [...prev, { id: typingId, role: "assistant", content: "Analyzing file...", isTyping: true }]);

    try {
      const res = await axios.post("http://localhost:8000/api/v1/upload", formData);
      const analysis = res.data;
      let content = `\`\`\`text
${analysis.summary}
\`\`\``;
      
      setMessages(prev => prev.filter(m => m.id !== typingId));
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: "assistant", 
        content: content,
        analysis: analysis 
      }]);
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m.id !== typingId));
      const errMsg = err.response?.data?.detail || "Error processing file.";
      setMessages(prev => [...prev, { id: Date.now().toString(), role: "assistant", content: errMsg }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-5xl mx-auto p-4 z-10">
      <header className="flex justify-between items-center py-4 mb-4 border-b border-border">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          SceneSense AI
        </h1>
        <div className="flex items-center space-x-2">
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value as any)}
            className="bg-card text-card-foreground border border-border rounded-md px-3 py-1 text-sm outline-none cursor-pointer"
          >
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
            <option value="cyberpunk">Cyberpunk</option>
            <option value="nvidia">NVIDIA Green</option>
            <option value="midnight">Midnight Blue</option>
          </select>
        </div>
      </header>

      <div id="chat-scroll-container" className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2 scroll-smooth">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-card border border-border shadow-lg rounded-tl-none"
              }`}>
                {msg.isTyping ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                
                {msg.analysis && msg.analysis.heatmap_url && (
                  <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/10 glass-panel">
                    <h3 className="font-bold mb-2">Grad-CAM Visualization</h3>
                    <div className="w-full h-40 bg-gradient-to-r from-red-500/20 to-blue-500/20 rounded flex items-center justify-center border border-white/5">
                      <span className="text-xs text-muted-foreground">Heatmap Render (Mock)</span>
                    </div>
                  </div>
                )}
                
                {msg.analysis && msg.analysis.visualizations && msg.analysis.visualizations.chartType && (
                  <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/10 glass-panel">
                    <h3 className="font-bold mb-4">{msg.analysis.visualizations.title || "Feature Importance Chart"}</h3>
                    <div className="w-full h-56 bg-background/50 rounded flex items-center justify-center border border-border/50 p-4">
                       <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={msg.analysis.visualizations.xAxis.map((x: any, i: number) => ({
                           name: x,
                           value: msg.analysis.visualizations.series[0].data[i]
                         }))}>
                           <XAxis dataKey="name" stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} className="text-muted-foreground" />
                           <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} className="text-muted-foreground" />
                           <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }} />
                           <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                         </BarChart>
                       </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={endOfMessagesRef} />
      </div>

      <div className="w-full shrink-0 pt-4">
        <div className="relative glass-panel rounded-full flex items-center p-2 border border-border shadow-2xl bg-card/80 backdrop-blur-xl">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="p-3 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-primary/10"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type your message or upload a dataset/image..."
            className="flex-1 bg-transparent border-none outline-none px-4 text-foreground placeholder:text-muted-foreground"
          />
          <button 
            onClick={handleSendMessage}
            className="p-3 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
