"use client";

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { Mountain, Waves, Building2, Snowflake, Trees, Navigation } from 'lucide-react';
import { SceneDecision, ChartData } from '@/context/ChatContext';

interface SceneDecisionCardProps {
  scene_decision: SceneDecision;
  confidence_score?: number;
  charts?: ChartData[];
  filename?: string;
}

const SCENE_ICONS: Record<string, React.ReactNode> = {
  MOUNTAIN:  <Mountain size={28} className="text-blue-300" />,
  BEACH:     <Waves size={28} className="text-cyan-300" />,
  SEA:       <Waves size={28} className="text-cyan-300" />,
  BUILDINGS: <Building2 size={28} className="text-yellow-300" />,
  GLACIER:   <Snowflake size={28} className="text-sky-300" />,
  FOREST:    <Trees size={28} className="text-green-300" />,
  STREET:    <Navigation size={28} className="text-orange-300" />,
};

const SCENE_COLORS: Record<string, string> = {
  MOUNTAIN:  '#60a5fa',
  BEACH:     '#22d3ee',
  SEA:       '#22d3ee',
  BUILDINGS: '#fbbf24',
  GLACIER:   '#7dd3fc',
  FOREST:    '#4ade80',
  STREET:    '#fb923c',
};

const CHART_COLORS = ['#1d7af3', '#2ecc71', '#e74c3c'];

// Custom bar label
const CustomLabel = (props: any) => {
  const { x, y, width, value } = props;
  return (
    <text x={x + width / 2} y={y - 6} fill="#e5e7eb" textAnchor="middle" fontSize={12} fontWeight={600}>
      {value}%
    </text>
  );
};

export function SceneDecisionCard({ scene_decision, confidence_score, charts, filename }: SceneDecisionCardProps) {
  const scene = scene_decision.detected_scene;
  const color = SCENE_COLORS[scene] || '#60a5fa';
  const icon = SCENE_ICONS[scene] || <Mountain size={28} />;

  // Find the model performance chart
  const perfChart = charts?.find(c => c.title.toLowerCase().includes("model performance"));

  const perfData = perfChart
    ? perfChart.labels.map((label, i) => ({
        model: label,
        accuracy: perfChart.datasets[0]?.data[i] ?? 0,
      }))
    : [];

  return (
    <div className="rounded-2xl overflow-hidden border border-neutral-700/60 bg-[#0d0d0d] shadow-2xl mb-4">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border-b border-neutral-800">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <span className="ml-3 text-xs text-neutral-500 font-mono">SceneSense AI — Scene Classifier</span>
        {filename && <span className="ml-auto text-xs text-neutral-600 font-mono">{filename}</span>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Left: Terminal-style output */}
        <div className="p-6 font-mono text-sm">
          {/* Title bar */}
          <div className="text-center mb-5">
            <span className="text-neutral-400">{'='}</span>
            <span className="text-neutral-200 font-bold px-2">{'========== SceneSense AI =========='}</span>
          </div>

          {/* Scene icon + name */}
          <div className="flex items-center gap-3 mb-5 pl-2">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: `${color}20`, border: `1px solid ${color}40` }}
            >
              {icon}
            </div>
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Detected Scene</div>
              <div className="text-2xl font-bold" style={{ color }}>{scene}</div>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="mb-5 px-2">
            <div className="flex justify-between text-xs text-neutral-400 mb-1">
              <span>Confidence</span>
              <span className="font-bold" style={{ color }}>{scene_decision.confidence.toFixed(2)}%</span>
            </div>
            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(scene_decision.confidence, 100)}%`,
                  background: `linear-gradient(90deg, ${color}80, ${color})`
                }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-800 mb-4" />

          {/* Travel info */}
          <div className="space-y-3 text-sm">
            <div className="text-neutral-300 font-semibold mb-2">Travel Recommendations</div>
            <div className="flex gap-2">
              <span className="text-neutral-500 min-w-[110px]">Best Season:</span>
              <span className="text-neutral-200">{scene_decision.best_season}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-neutral-500 min-w-[110px]">Activities:</span>
              <span className="text-neutral-200">{scene_decision.activities}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-neutral-500 min-w-[110px]">Safety:</span>
              <span className="text-yellow-300">{scene_decision.safety}</span>
            </div>
            {scene_decision.recommendation_text && (
              <div className="mt-3 p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50">
                <span className="text-neutral-400 text-xs">AI Insight: </span>
                <span className="text-neutral-300 text-xs">{scene_decision.recommendation_text}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Model performance chart */}
        {perfData.length > 0 && (
          <div className="p-6 border-l border-neutral-800">
            <div className="text-sm font-semibold text-neutral-300 mb-1">{perfChart?.title}</div>
            <div className="text-xs text-neutral-500 mb-4">Platform model benchmarks on scene classification</div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                  <XAxis
                    dataKey="model"
                    stroke="#555"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#555"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#9ca3af' }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={{
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: any) => [`${value}%`, 'Accuracy']}
                  />
                  <Bar dataKey="accuracy" radius={[4, 4, 0, 0]} maxBarSize={60}>
                    <LabelList content={<CustomLabel />} />
                    {perfData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 justify-center">
              {perfData.map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-neutral-400">
                  <div className="w-2 h-2 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span>{item.model}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
