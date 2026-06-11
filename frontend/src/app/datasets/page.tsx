"use client";

import React from 'react';
import { DatasetStats } from '@/components/dataset/DatasetStats';
import { DataPreviewTable } from '@/components/dataset/DataPreviewTable';
import { FileDropzone } from '@/components/upload/FileDropzone';

export default function DatasetsPage() {
  const dummyStats = {
    rows: 15420,
    columns: 24,
    missingValues: 102,
    dataTypes: { 'string': 8, 'integer': 12, 'float': 2, 'boolean': 1, 'date': 1 }
  };

  const dummyColumns = ["id", "customer_name", "signup_date", "total_spend", "is_active", "segment"];
  const dummyData = [
    [1, "Alice Smith", "2023-01-15", 1250.50, true, "Premium"],
    [2, "Bob Jones", "2023-02-20", 450.00, false, "Standard"],
    [3, "Charlie Davis", "2023-03-05", null, true, "New"],
    [4, "Diana Prince", "2023-04-12", 3450.75, true, "VIP"],
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Dataset Management</h1>
          <p className="text-neutral-400">Upload, analyze, and manage your datasets.</p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          <section>
            <h2 className="text-lg font-medium mb-4 text-neutral-200">Upload New Dataset</h2>
            <FileDropzone onFilesSelected={() => {}} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium text-neutral-200">Recent Dataset Analysis: customer_data_q3.csv</h2>
            <DatasetStats stats={dummyStats} />
            <div className="mt-8">
              <h3 className="text-md font-medium text-neutral-300 mb-4">Data Preview</h3>
              <DataPreviewTable columns={dummyColumns} data={dummyData} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
