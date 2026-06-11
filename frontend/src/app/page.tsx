"use client";

import React, { useState, useCallback } from 'react';
import { ChatArea } from '@/components/chat/ChatArea';
import { ChatInput } from '@/components/chat/ChatInput';
import { FileDropzone } from '@/components/upload/FileDropzone';
import { FileCard, FileStatus } from '@/components/upload/FileCard';
import { useChat } from '@/context/ChatContext';
import { DatasetAnalysis } from '@/components/dataset/DatasetAnalysis';
import { SceneDecisionCard } from '@/components/dataset/SceneDecisionCard';
import { ChevronDown, ChevronUp, Upload } from 'lucide-react';

const DATASET_EXTS = new Set(['.csv', '.xlsx', '.xls']);
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export default function Home() {
  const { messages, files, isLoading, sendMessage, uploadFile } = useChat();
  const [localUploads, setLocalUploads] = useState<{ file: File; status: FileStatus; progress: number }[]>([]);
  const [showDropzone, setShowDropzone] = useState(false);

  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map(f => ({ file: f, status: 'uploading' as FileStatus, progress: 0 }));
    setLocalUploads(prev => [...prev, ...newFiles]);
    setShowDropzone(false);

    for (const f of newFiles) {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setLocalUploads(prev =>
          prev.map(pf => pf.file.name === f.file.name ? { ...pf, progress: Math.min(progress, 90) } : pf)
        );
      }, 400);

      try {
        await uploadFile(f.file);
        clearInterval(interval);
        setLocalUploads(prev =>
          prev.map(pf => pf.file.name === f.file.name ? { ...pf, progress: 100, status: 'completed' } : pf)
        );
        setTimeout(() => {
          setLocalUploads(prev => prev.filter(pf => pf.file.name !== f.file.name));
        }, 2500);
      } catch {
        clearInterval(interval);
        setLocalUploads(prev =>
          prev.map(pf => pf.file.name === f.file.name ? { ...pf, status: 'error' } : pf)
        );
      }
    }
  }, [uploadFile]);

  const datasetFiles = files.filter(f => DATASET_EXTS.has(f.file_type));
  const imageFiles = files.filter(f => IMAGE_EXTS.has(f.file_type));
  const hasAnalysisCards = datasetFiles.length > 0 || imageFiles.length > 0;

  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto">
      <div className="flex-1 flex flex-col min-h-0">
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onRegenerate={() => {}}
        />

        {/* Upload progress chips */}
        {localUploads.length > 0 && (
          <div className="px-4 sm:px-6 mt-1 mb-1 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {localUploads.map((f, i) => (
              <div key={i} className="w-56 shrink-0">
                <FileCard
                  name={f.file.name}
                  size={f.file.size}
                  type={f.file.type}
                  status={f.status}
                  progress={f.progress}
                  onRemove={() => setLocalUploads(prev => prev.filter((_, idx) => idx !== i))}
                />
              </div>
            ))}
          </div>
        )}

        {/* Completed file chips (non-dataset/image) */}
        {files.filter(f => !DATASET_EXTS.has(f.file_type) && !IMAGE_EXTS.has(f.file_type)).length > 0 && (
          <div className="px-4 sm:px-6 mb-2 flex gap-2 overflow-x-auto custom-scrollbar pb-1">
            {files
              .filter(f => !DATASET_EXTS.has(f.file_type) && !IMAGE_EXTS.has(f.file_type))
              .map(f => (
                <div key={f.id} className="w-56 shrink-0">
                  <FileCard name={f.filename} size={f.size} type={f.file_type} status="completed" progress={100} />
                </div>
              ))}
          </div>
        )}

        {/* Analysis cards */}
        {hasAnalysisCards && (
          <div className="px-4 sm:px-6 space-y-3 mb-2">
            {/* Scene Decision Cards (images) */}
            {imageFiles.map(f =>
              f.scene_decision ? (
                <SceneDecisionCard
                  key={f.id}
                  scene_decision={f.scene_decision}
                  confidence_score={f.confidence_score}
                  charts={f.charts}
                  filename={f.filename}
                />
              ) : null
            )}

            {/* Dataset Analysis dashboards */}
            {datasetFiles.map(f => (
              <DatasetAnalysis key={f.id} file={f} />
            ))}
          </div>
        )}

        {/* Upload panel toggle */}
        <div className="px-4 sm:px-6 mb-2">
          {messages.length > 0 || files.length > 0 ? (
            <>
              <button
                onClick={() => setShowDropzone(!showDropzone)}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-colors mb-2"
              >
                <Upload size={12} />
                <span>Upload a file</span>
                {showDropzone ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showDropzone && (
                <div className="mb-2">
                  <FileDropzone onFilesSelected={handleFilesSelected} />
                </div>
              )}
            </>
          ) : (
            <FileDropzone onFilesSelected={handleFilesSelected} />
          )}
        </div>

        <ChatInput
          onSendMessage={sendMessage}
          onFilesSelected={handleFilesSelected}
          isLoading={isLoading}
          onStopLoading={() => {}}
        />
      </div>
    </div>
  );
}
