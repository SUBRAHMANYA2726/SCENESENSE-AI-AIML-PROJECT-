"use client";

import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell, Legend, LabelList
} from 'recharts';
import { ChartData } from '@/context/ChatContext';

interface AnalysisChartsProps {
  charts: ChartData[];
}

const PALETTE = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7',
  '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'
];

const CustomTooltipStyle = {
  backgroundColor: '#1a1a1a',
  border: '1px solid #333',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#e5e7eb'
};

// Heatmap chart for correlation matrices
function HeatmapChart({ chart }: { chart: ChartData }) {
  const matrix = chart.meta?.matrix as Record<string, Record<string, number>> | undefined;
  if (!matrix) return null;

  const keys = Object.keys(matrix);
  if (keys.length === 0) return null;

  const allValues = keys.flatMap(r => keys.map(c => matrix[r]?.[c] ?? 0));
  const absMax = Math.max(...allValues.map(Math.abs), 0.001);

  const getColor = (val: number) => {
    const norm = val / absMax; // -1 to 1
    if (norm >= 0) {
      const intensity = Math.round(norm * 255);
      return `rgb(30, ${intensity}, ${Math.round(intensity * 0.5)})`;
    } else {
      const intensity = Math.round(-norm * 255);
      return `rgb(${intensity}, 30, 30)`;
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="p-1 text-neutral-500" />
            {keys.map(k => (
              <th key={k} className="p-1 text-neutral-400 font-normal text-center max-w-[60px] truncate">
                {k.substring(0, 8)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map(row => (
            <tr key={row}>
              <td className="p-1 text-neutral-400 pr-2 text-right max-w-[60px] truncate">{row.substring(0, 8)}</td>
              {keys.map(col => {
                const val = matrix[row]?.[col] ?? 0;
                return (
                  <td
                    key={col}
                    title={`${row} ↔ ${col}: ${val.toFixed(3)}`}
                    className="w-8 h-8 text-center text-[10px] font-medium transition-all"
                    style={{ backgroundColor: getColor(val), color: Math.abs(val) > 0.5 ? '#fff' : '#aaa' }}
                  >
                    {val.toFixed(2)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SingleChart({ chart }: { chart: ChartData }) {
  const data = chart.labels.map((label, i) => {
    const entry: Record<string, any> = { label };
    chart.datasets.forEach(ds => {
      entry[ds.name] = ds.data[i] ?? 0;
    });
    return entry;
  });

  const yDomain = chart.meta?.y_domain as [number, number] | undefined;

  const commonAxisProps = {
    stroke: '#444',
    fontSize: 11,
    tickLine: false as const,
    axisLine: false as const,
    tick: { fill: '#9ca3af' }
  };

  const commonGridProps = {
    strokeDasharray: '3 3',
    stroke: '#2a2a2a',
    vertical: false as const
  };

  if (chart.chart_type === 'heatmap') {
    return <HeatmapChart chart={chart} />;
  }

  if (chart.chart_type === 'pie') {
    const total = chart.datasets[0]?.data.reduce((a, b) => a + b, 0) || 1;
    const pieData = chart.labels.map((label, i) => ({
      name: label,
      value: chart.datasets[0]?.data[i] ?? 0,
    }));
    return (
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
            {pieData.map((_, index) => (
              <Cell key={index} fill={PALETTE[index % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={CustomTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart.chart_type === 'scatter') {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart>
          <CartesianGrid {...commonGridProps} />
          <XAxis dataKey="label" {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={CustomTooltipStyle} />
          {chart.datasets.map((ds, i) => (
            <Scatter key={ds.name} name={ds.name} data={data} fill={ds.color || PALETTE[i]} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (chart.chart_type === 'line') {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid {...commonGridProps} />
          <XAxis dataKey="label" {...commonAxisProps} />
          <YAxis {...commonAxisProps} domain={yDomain} />
          <Tooltip contentStyle={CustomTooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
          {chart.datasets.map((ds, i) => (
            <Line
              key={ds.name}
              type="monotone"
              dataKey={ds.name}
              stroke={ds.color || PALETTE[i]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chart.chart_type === 'area') {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data}>
          <CartesianGrid {...commonGridProps} />
          <XAxis dataKey="label" {...commonAxisProps} />
          <YAxis {...commonAxisProps} />
          <Tooltip contentStyle={CustomTooltipStyle} />
          {chart.datasets.map((ds, i) => (
            <Area
              key={ds.name}
              type="monotone"
              dataKey={ds.name}
              stroke={ds.color || PALETTE[i]}
              fill={`${ds.color || PALETTE[i]}30`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default: bar chart
  const showLabel = chart.meta?.show_label;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: showLabel ? 20 : 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid {...commonGridProps} />
        <XAxis dataKey="label" {...commonAxisProps} />
        <YAxis {...commonAxisProps} domain={yDomain} tickFormatter={yDomain ? (v) => `${v}%` : undefined} />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          contentStyle={CustomTooltipStyle}
        />
        {chart.datasets.length > 1 && (
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af' }} />
        )}
        {chart.datasets.map((ds, i) => (
          <Bar key={ds.name} dataKey={ds.name} fill={ds.color || PALETTE[i]} radius={[4, 4, 0, 0]} maxBarSize={60}>
            {showLabel && <LabelList dataKey={ds.name} position="top" style={{ fill: '#e5e7eb', fontSize: 11 }} formatter={(v: any) => `${v}%`} />}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AnalysisCharts({ charts }: AnalysisChartsProps) {
  if (!charts || charts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {charts.map((chart, idx) => (
        <div key={idx} className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-4">
          <div className="mb-1 font-semibold text-sm text-neutral-200">{chart.title}</div>
          {chart.x_label && (
            <div className="text-xs text-neutral-500 mb-3">
              {chart.x_label}{chart.y_label ? ` vs ${chart.y_label}` : ''}
            </div>
          )}
          <SingleChart chart={chart} />
        </div>
      ))}
    </div>
  );
}
