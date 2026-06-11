import React from 'react';

interface DataPreviewTableProps {
  columns: string[];
  data: any[][];
}

export function DataPreviewTable({ columns, data }: DataPreviewTableProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-sm text-left text-neutral-300">
          <thead className="text-xs text-neutral-400 bg-neutral-800/50 uppercase">
            <tr>
              {columns.map((col, i) => (
                <th key={i} scope="col" className="px-4 py-3 font-medium whitespace-nowrap border-b border-neutral-800">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr 
                key={rowIndex} 
                className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-2.5 whitespace-nowrap">
                    {cell === null ? (
                      <span className="text-neutral-600 italic">null</span>
                    ) : (
                      <span className="truncate max-w-[200px] inline-block align-bottom" title={String(cell)}>
                        {String(cell)}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-neutral-800/50 border-t border-neutral-800 text-xs text-neutral-500 text-right">
        Showing first {data.length} rows
      </div>
    </div>
  );
}
