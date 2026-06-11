import React, { useRef, useEffect } from 'react';
import { Message, MessageBubble } from './MessageBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import { Sparkles } from 'lucide-react';

interface ChatAreaProps {
  messages: Message[];
  isLoading?: boolean;
  onRegenerate?: (id: string) => void;
}

export function ChatArea({ messages, isLoading, onRegenerate }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-16 h-16 rounded-2xl gemini-gradient-bg flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-6">
          <Sparkles size={32} />
        </div>
        <h1 className="text-3xl font-semibold mb-2 text-[#ececec]">How can I help you today?</h1>
        <p className="text-neutral-400 max-w-md text-center mb-8">
          I can analyze datasets, generate charts, write code, or help you understand complex topics.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl w-full">
          {[
            { title: "Analyze my Q3 dataset", desc: "Show trends and missing values" },
            { title: "Explain machine learning", desc: "In simple terms" },
            { title: "Write a Python script", desc: "To scrape web data" },
            { title: "Help me write", desc: "A professional email to my team" }
          ].map((suggestion, i) => (
            <button key={i} className="flex flex-col items-start p-4 bg-neutral-800/30 hover:bg-neutral-800 border border-neutral-700/50 rounded-xl transition-all text-left">
              <span className="text-sm font-medium text-neutral-200">{suggestion.title}</span>
              <span className="text-xs text-neutral-500 mt-1">{suggestion.desc}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="pb-4">
        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            onRegenerate={onRegenerate}
          />
        ))}
        {isLoading && <ThinkingIndicator />}
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}
