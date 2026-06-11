import React from 'react';
import { Sparkles } from 'lucide-react';

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-3 py-4 px-4 sm:px-6 animate-pulse">
      <div className="w-8 h-8 rounded-full gemini-gradient-bg flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/20">
        <Sparkles size={16} />
      </div>
      <div className="flex flex-col gap-2 w-full max-w-sm">
        <div className="h-4 rounded-md gemini-gradient-bg opacity-70 w-3/4"></div>
        <div className="h-4 rounded-md gemini-gradient-bg opacity-40 w-1/2"></div>
      </div>
    </div>
  );
}
