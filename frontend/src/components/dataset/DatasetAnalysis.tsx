"use client";

import React, { useState } from 'react';
import {
  Table2, BarChart2, Brain, Info, ChevronDown, ChevronUp,
  AlertTriangle, TrendingUp, Lightbulb, CheckCircle2, Target
} from 'lucide-react';
import { FileAnalysis } from '@/context/ChatContext';
import { AnalysisCharts } from './AnalysisCharts';
import { cn } from '@/lib/utils';

interface DatasetAnalysisProps {
  file: FileAnalysis;
}

type Tab = 'overview' | 'charts' | 'statistics' | 'ml';

export function DatasetAnalysis({ file }: DatasetAnalysisProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { stats, analysis, charts } = file;

  if (!stats && !analysis) return null;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview',    icon: <Info size={14} /> },
    { id: 'charts',   label: 'Charts',      icon: <BarChart2 size={14} /> },
    { id: 'statistics',label: 'Statistics', icon: <Table2 size={14} /> },
    { id: 'ml',       label: 'ML Results',  icon: <Brain size={14} /> },
  ];

  const taskColors: Record<string, string> = {
    classification: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    regression:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    clustering:     'text-purple-400 bg-purple-400/10 border-purple-400/30',
    time_series:    'text-orange-400 bg-orange-400/10 border-orange-400/30',
    statistical:    'text-neutral-400 bg-neutral-400/10 border-neutral-400/30',
  };
  const taskLabel = analysis?.task_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Analysis';
  const taskColor = taskColors[analysis?.task_type || ''] || taskColors.statistical;

  return (
    <div className="bg-[#141414] border border-neutral-800 rounded-2xl overflow-hidden mb-4 shadow-xl">
      {/* Header / Toggle */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-neutral-800/40 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
            <Table2 size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-100">Dataset Analysis: {file.filename}</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {stats?.rows.toLocaleString()} rows · {stats?.columns} columns · {stats?.missingValues} missing values
            </p>
          </div>
          {analysis && (
            <span className={cn('text-xs font-medium px-2 py-0.5 rounded border ml-2', taskColor)}>
              {taskLabel}
            </span>
          )}
        </div>
        {isExpanded
          ? <ChevronUp size={18} className="text-neutral-500 shrink-0" />
          : <ChevronDown size={18} className="text-neutral-500 shrink-0" />
        }
      </div>

      {isExpanded && (
        <div className="border-t border-neutral-800">
          {/* Tab bar */}
          <div className="flex border-b border-neutral-800 px-4 gap-1 bg-neutral-900/40">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* Stat cards */}
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Rows', value: stats.rows.toLocaleString(), color: 'text-blue-400' },
                      { label: 'Columns', value: stats.columns, color: 'text-purple-400' },
                      { label: 'Missing Values', value: stats.missingValues.toLocaleString(), color: 'text-red-400' },
                      { label: 'Task Type', value: taskLabel, color: 'text-emerald-400' },
                    ].map((card) => (
                      <div key={card.label} className="bg-neutral-800/40 rounded-xl p-3 border border-neutral-700/50">
                        <div className="text-xs text-neutral-500 mb-1">{card.label}</div>
                        <div className={cn('text-lg font-bold', card.color)}>{card.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Task reason */}
                {analysis?.task_reason && (
                  <div className="flex gap-3 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl text-sm">
                    <Target size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-blue-300 font-medium mb-0.5">Why {taskLabel}?</div>
                      <div className="text-neutral-400 text-xs">{analysis.task_reason}</div>
                    </div>
                  </div>
                )}

                {/* Executive Summary */}
                {analysis?.executive_summary && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Executive Summary
                    </div>
                    <div className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap bg-neutral-800/30 rounded-xl p-4 border border-neutral-700/30">
                      {analysis.executive_summary}
                    </div>
                  </div>
                )}

                {/* Key insights */}
                {analysis?.key_insights && analysis.key_insights.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Lightbulb size={12} /> Key Insights
                    </div>
                    <ul className="space-y-2">
                      {analysis.key_insights.map((insight, i) => (
                        <li key={i} className="flex gap-2 text-sm text-neutral-300">
                          <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {analysis?.recommendations && analysis.recommendations.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <TrendingUp size={12} /> Recommendations
                    </div>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-2 text-sm text-neutral-300">
                          <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Trend analysis */}
                {analysis?.trend_analysis && (
                  <div className="flex gap-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl text-sm">
                    <TrendingUp size={16} className="text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-orange-300 font-medium mb-0.5">Trend Analysis</div>
                      <div className="text-neutral-400 text-xs">{analysis.trend_analysis}</div>
                    </div>
                  </div>
                )}

                {/* Forecast */}
                {analysis?.forecast && analysis.forecast.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      5-Step Ahead Forecast
                    </div>
                    <div className="flex gap-3">
                      {analysis.forecast.map((f) => (
                        <div key={f.step} className="flex-1 bg-neutral-800/50 rounded-lg p-3 text-center border border-neutral-700/40">
                          <div className="text-xs text-neutral-500">Step {f.step}</div>
                          <div className="text-sm font-bold text-emerald-400 mt-1">{f.forecast.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── CHARTS TAB ── */}
            {activeTab === 'charts' && (
              <div>
                {charts && charts.length > 0
                  ? <AnalysisCharts charts={charts} />
                  : <div className="text-center text-neutral-500 py-12">No chart data available.</div>
                }
              </div>
            )}

            {/* ── STATISTICS TAB ── */}
            {activeTab === 'statistics' && stats && (
              <div className="space-y-5">
                {/* Numeric summary table */}
                {stats.numeric_summary && Object.keys(stats.numeric_summary).length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Numeric Feature Statistics
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-neutral-800">
                      <table className="w-full text-xs text-left">
                        <thead className="text-neutral-400 bg-neutral-800/50 uppercase">
                          <tr>
                            {['Feature', 'Count', 'Mean', 'Std', 'Min', '25%', '50%', '75%', 'Max'].map(h => (
                              <th key={h} className="px-3 py-2 font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(stats.numeric_summary).map(([col, vals]) => (
                            <tr key={col} className="border-t border-neutral-800/50 hover:bg-neutral-800/20">
                              <td className="px-3 py-2 text-blue-300 font-medium">{col}</td>
                              {['count', 'mean', 'std', 'min', '25%', '50%', '75%', 'max'].map(k => (
                                <td key={k} className="px-3 py-2 text-neutral-300 font-mono">
                                  {vals[k] !== null && vals[k] !== undefined ? Number(vals[k]).toFixed(2) : '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Missing values */}
                {stats.missing_per_column && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-red-400" /> Missing Values per Column
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(stats.missing_per_column).map(([col, count]) => (
                        <div key={col} className="flex items-center justify-between bg-neutral-800/40 rounded-lg px-3 py-2 border border-neutral-700/40">
                          <span className="text-xs text-neutral-400 truncate">{col}</span>
                          <span className={cn('text-xs font-bold ml-2', count > 0 ? 'text-red-400' : 'text-emerald-400')}>
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outlier counts */}
                {stats.outlier_counts && Object.values(stats.outlier_counts).some(v => v > 0) && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-yellow-400" /> Outliers (IQR Method)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(stats.outlier_counts).filter(([, v]) => v > 0).map(([col, count]) => (
                        <div key={col} className="flex items-center justify-between bg-neutral-800/40 rounded-lg px-3 py-2 border border-neutral-700/40">
                          <span className="text-xs text-neutral-400 truncate">{col}</span>
                          <span className="text-xs font-bold text-yellow-400 ml-2">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data preview */}
                {stats.previewData && stats.previewColumns && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Data Preview (First 5 Rows)
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-neutral-800">
                      <table className="w-full text-xs text-left">
                        <thead className="text-neutral-400 bg-neutral-800/50 uppercase">
                          <tr>
                            {stats.previewColumns.map((col, i) => (
                              <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {stats.previewData.map((row, i) => (
                            <tr key={i} className="border-t border-neutral-800/50 hover:bg-neutral-800/20">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-2 text-neutral-300 truncate max-w-[120px]" title={String(cell)}>
                                  {cell === null ? <span className="text-red-400 italic">null</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── ML RESULTS TAB ── */}
            {activeTab === 'ml' && analysis && (
              <div className="space-y-5">
                {/* Model results */}
                {analysis.model_results && analysis.model_results.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Model Performance
                    </div>
                    <div className="space-y-2">
                      {analysis.model_results.map((m, i) => {
                        const scoreDisplay = m.value <= 1.0
                          ? `${(m.value * 100).toFixed(1)}%`
                          : m.value.toFixed(4);
                        const pct = Math.min(m.value <= 1.0 ? m.value * 100 : Math.min(m.value * 10, 100), 100);
                        return (
                          <div key={i} className="bg-neutral-800/40 rounded-xl p-3 border border-neutral-700/40">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm font-medium text-neutral-200">{m.model_name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500">{m.metric_name}</span>
                                <span className="text-sm font-bold text-emerald-400">{scoreDisplay}</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            {m.extra && (
                              <div className="flex gap-4 mt-2">
                                {Object.entries(m.extra).filter(([k]) => k !== 'error').map(([k, v]) => (
                                  <span key={k} className="text-xs text-neutral-500">
                                    {k}: <span className="text-neutral-300">{typeof v === 'number' ? v.toFixed(4) : String(v)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Feature importance */}
                {analysis.feature_importance && analysis.feature_importance.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                      Feature Importance
                    </div>
                    <div className="space-y-1.5">
                      {analysis.feature_importance.map((fi, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-neutral-400 w-36 truncate text-right" title={fi.feature}>{fi.feature}</span>
                          <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
                              style={{ width: `${Math.min(fi.importance * 100 / (analysis.feature_importance![0]?.importance || 1) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-neutral-300 w-14 text-right">{fi.importance.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Anomalies */}
                {analysis.anomalies && analysis.anomalies.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-yellow-400" /> Detected Anomalies
                    </div>
                    <ul className="space-y-1.5">
                      {analysis.anomalies.map((anomaly, i) => (
                        <li key={i} className="flex gap-2 text-xs text-yellow-300">
                          <span className="text-yellow-500">⚠</span> {anomaly}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
