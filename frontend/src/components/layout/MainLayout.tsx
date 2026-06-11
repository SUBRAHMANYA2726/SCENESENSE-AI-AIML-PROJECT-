"use client";

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#212121] text-[#ececec] overflow-hidden theme-dark">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Toggle sidebar button when closed */}
        <div className="absolute top-3 left-3 z-30">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={cn(
              "p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-all",
              isSidebarOpen ? "opacity-0 pointer-events-none scale-95" : "opacity-100 scale-100"
            )}
            title={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <PanelLeftOpen size={20} />
          </button>
        </div>
        
        {children}
      </main>
    </div>
  );
}
