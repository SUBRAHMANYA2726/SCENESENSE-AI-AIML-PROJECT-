"use client";

import React from 'react';
import { BarChart3, LineChart, PieChart, TrendingUp } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Analytics Dashboard</h1>
          <p className="text-neutral-400">View performance metrics and usage statistics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Queries", value: "1,248", icon: BarChart3, color: "text-blue-400" },
            { label: "Datasets Processed", value: "32", icon: PieChart, color: "text-purple-400" },
            { label: "Avg Response Time", value: "1.2s", icon: LineChart, color: "text-green-400" },
            { label: "User Satisfaction", value: "98%", icon: TrendingUp, color: "text-red-400" },
          ].map((stat, i) => (
            <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <stat.icon size={48} className={stat.color} />
              </div>
              <h3 className="text-sm text-neutral-400 mb-1">{stat.label}</h3>
              <p className="text-3xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <BarChart3 size={48} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-lg font-medium text-neutral-300">Detailed Charts Comming Soon</h3>
            <p className="text-sm text-neutral-500 mt-2">Integrate Recharts here for beautiful visualizations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
