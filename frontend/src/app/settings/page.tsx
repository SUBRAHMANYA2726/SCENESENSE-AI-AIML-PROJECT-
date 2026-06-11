"use client";

import React, { useState } from 'react';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  const [model, setModel] = useState('scenesense-pro');
  const [theme, setTheme] = useState('dark');

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Settings</h1>
          <p className="text-neutral-400">Manage your workspace and AI preferences.</p>
        </div>

        <div className="space-y-6 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-medium border-b border-neutral-800 pb-2 mb-4">AI Model Settings</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Primary Model</label>
              <select 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full md:w-1/2 bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="scenesense-pro">SceneSense Pro (Recommended)</option>
                <option value="scenesense-flash">SceneSense Flash (Faster)</option>
                <option value="gpt-4o">GPT-4o (External)</option>
                <option value="claude-3-opus">Claude 3 Opus (External)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Temperature (Creativity)</label>
              <input type="range" min="0" max="100" defaultValue="70" className="w-full md:w-1/2 accent-blue-500" />
            </div>
          </div>
        </div>

        <div className="space-y-6 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-lg font-medium border-b border-neutral-800 pb-2 mb-4">Appearance</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">Theme</label>
              <select 
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full md:w-1/2 bg-neutral-800 border border-neutral-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="dark">Dark</option>
                <option value="midnight">Midnight</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="light">Light</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            <Save size={18} /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
