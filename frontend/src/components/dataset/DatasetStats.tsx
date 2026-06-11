import React from 'react';
import { Database, Hash, Type, AlertCircle } from 'lucide-react';

interface DatasetStatsProps {
  stats: {
    rows: number;
    columns: number;
    missingValues: number;
    dataTypes: Record<string, number>;
  };
}

export function DatasetStats({ stats }: DatasetStatsProps) {
  const statCards = [
    { label: 'Total Rows', value: stats.rows.toLocaleString(), icon: Hash, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Total Columns', value: stats.columns.toLocaleString(), icon: Database, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Missing Values', value: stats.missingValues.toLocaleString(), icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-neutral-500">{stat.label}</p>
              <p className="text-2xl font-semibold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <h4 className="text-sm font-medium text-neutral-300 mb-4 flex items-center gap-2">
          <Type size={16} /> Column Data Types
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.dataTypes).map(([type, count]) => (
            <div key={type} className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs font-medium text-neutral-300 flex items-center gap-2">
              <span>{type}</span>
              <span className="text-neutral-500 bg-neutral-900 px-1.5 py-0.5 rounded-md">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
