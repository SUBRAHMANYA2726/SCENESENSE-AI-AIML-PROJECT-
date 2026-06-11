"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, ArrowUp, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFilesSelected?: (files: File[]) => void;
  isLoading?: boolean;
  onStopLoading?: () => void;
}

export function ChatInput({ onSendMessage, onFilesSelected, isLoading, onStopLoading }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isLoading) {
      if (pendingFiles.length > 0) {
        onFilesSelected?.(pendingFiles);
        setPendingFiles([]);
      }
      if (input.trim()) {
        onSendMessage(input.trim());
        setInput('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = Array.from(e.target.files);
      setPendingFiles(prev => [...prev, ...selected]);
      // Reset so the same file can be re-selected
      e.target.value = '';
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const canSend = (input.trim() || pendingFiles.length > 0) && !isLoading;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pb-6 pt-2">
      {/* Pending file chips */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-300"
            >
              <Paperclip size={11} className="text-blue-400" />
              <span className="max-w-[140px] truncate">{file.name}</span>
              <button
                onClick={() => removePendingFile(i)}
                className="text-neutral-500 hover:text-red-400 transition-colors ml-1"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        {/* Animated border when loading */}
        <div className={cn(
          "absolute -inset-0.5 rounded-2xl opacity-0 transition-opacity duration-300",
          isLoading ? "opacity-100 gemini-gradient-bg" : ""
        )} />

        <div className="relative flex items-end gap-2 bg-[#2f2f2f] rounded-2xl border border-neutral-700/50 p-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600 transition-all">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".csv,.xlsx,.xls,.pdf,.docx,.txt,.json,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
          />

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-neutral-400 hover:text-blue-400 rounded-xl hover:bg-neutral-800 transition-colors shrink-0 mb-0.5"
            title="Attach file (CSV, Excel, PDF, DOCX, image)"
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={pendingFiles.length > 0 ? "Add a message (optional) and press Enter…" : "Message SceneSense… or attach a file"}
            className="w-full max-h-[200px] bg-transparent text-white placeholder:text-neutral-500 resize-none outline-none py-3 px-2 overflow-y-auto custom-scrollbar"
            rows={1}
          />

          <div className="shrink-0 mb-0.5 ml-1 mr-0.5">
            {isLoading ? (
              <button
                onClick={onStopLoading}
                className="p-2.5 text-white bg-neutral-700 hover:bg-neutral-600 rounded-xl transition-colors shadow-sm"
                title="Stop generating"
              >
                <Square size={20} className="fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canSend}
                className={cn(
                  "p-2.5 text-white rounded-xl transition-all shadow-sm",
                  canSend
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                )}
                title="Send message"
              >
                <ArrowUp size={20} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="text-center mt-3 text-xs text-neutral-500">
        SceneSense AI · Attach CSV, Excel, PDF, DOCX, or images for AI analysis
      </div>
    </div>
  );
}
