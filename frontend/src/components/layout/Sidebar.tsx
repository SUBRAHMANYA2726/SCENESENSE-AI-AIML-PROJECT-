import React, { useState } from 'react';
import {
  MessageSquarePlus,
  Search,
  MessageSquare,
  Settings,
  User,
  PanelLeftClose,
  FolderKanban,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChat } from '@/context/ChatContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const { sessions, currentSessionId, setCurrentSessionId, createNewSession } = useChat();

  const menuItems = [
    { icon: MessageSquare, label: 'Chat', href: '/' },
    { icon: Database, label: 'Datasets', href: '/datasets' },
    { icon: FolderKanban, label: 'Analytics', href: '/analytics' },
  ];

  const bottomItems = [
    { icon: User, label: 'Profile', href: '/profile' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#171717] md:bg-[#171717] text-[#ececec] w-64 transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
          !isOpen && "-translate-x-full md:w-0 md:opacity-0 overflow-hidden"
        )}
      >
        <div className="flex items-center justify-between p-3 h-14">
          <Link href="/" className="flex items-center gap-2 px-2 font-semibold hover:text-white transition-colors w-full group">
            <div className="w-8 h-8 rounded-full gemini-gradient-bg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20 group-hover:shadow-purple-500/40 transition-all">
              S
            </div>
            <span className="text-lg tracking-tight">SceneSense</span>
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg md:hidden"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        <div className="px-3 pb-3">
          <button 
            onClick={createNewSession}
            className="flex items-center justify-between w-full p-2 bg-neutral-800/50 hover:bg-neutral-800 rounded-lg text-sm font-medium transition-colors border border-neutral-700/50 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <MessageSquarePlus size={16} />
              <span>New chat</span>
            </div>
          </button>
        </div>

        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 text-neutral-500" size={14} />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-700 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
          <div className="text-xs font-semibold text-neutral-500 px-2 pb-2 mt-4">Main Menu</div>
          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === item.href 
                    ? "bg-neutral-800 text-white" 
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                )}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="text-xs font-semibold text-neutral-500 px-2 pb-2 mt-6">Recent Chats</div>
          <div className="space-y-0.5">
            {filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm transition-colors text-left",
                  currentSessionId === session.id
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                )}
              >
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate">{session.title}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-3 mt-auto border-t border-neutral-800">
          {bottomItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-2 py-2 w-full rounded-lg text-sm font-medium text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200 transition-colors"
            >
              <item.icon size={16} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
