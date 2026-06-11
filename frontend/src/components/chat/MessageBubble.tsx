import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Copy, RefreshCw, Edit2, Share, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (id: string) => void;
}

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <div className={cn(
      "group px-4 sm:px-6 py-6 transition-colors",
      message.role === 'user' ? "" : message.role === 'system' ? "bg-neutral-800/10 py-2 border-y border-neutral-800/30" : "bg-neutral-800/20"
    )}>
      <div className="max-w-3xl mx-auto flex gap-4 md:gap-6">
        {/* Avatar */}
        {message.role !== 'system' && (
          <div className="shrink-0 mt-1">
            {isUser ? (
              <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-neutral-300">
                <User size={18} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full gemini-gradient-bg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                <span className="font-bold text-sm">S</span>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 overflow-hidden text-[#ececec]">
          {message.role === 'system' ? (
            <div className="whitespace-pre-wrap text-[13px] text-neutral-500 italic text-center">
              {message.content}
            </div>
          ) : isUser ? (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {message.content}
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-[15px] leading-relaxed break-words
              prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent
              prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:bg-neutral-800 prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    
                    if (!inline && match) {
                      return (
                        <div className="rounded-lg overflow-hidden my-4 border border-neutral-800 bg-[#1e1e1e]">
                          <div className="flex items-center justify-between px-4 py-2 bg-neutral-800/80 text-xs text-neutral-400">
                            <span>{match[1]}</span>
                            <button
                              onClick={() => handleCopy(codeString)}
                              className="flex items-center gap-1.5 hover:text-white transition-colors"
                            >
                              {copiedText === codeString ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                              <span>{copiedText === codeString ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, padding: '1rem', background: 'transparent' }}
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => handleCopy(message.content)}
              className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
              title="Copy message"
            >
              {copiedText === message.content ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
            
            {isUser ? (
              <button className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors" title="Edit message">
                <Edit2 size={16} />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => onRegenerate?.(message.id)}
                  className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors" 
                  title="Regenerate response"
                >
                  <RefreshCw size={16} />
                </button>
                <button className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors" title="Share message">
                  <Share size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
