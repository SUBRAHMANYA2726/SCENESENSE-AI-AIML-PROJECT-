import React, { useCallback, useState } from 'react';
import { UploadCloud, File, Image as ImageIcon, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
}

export function FileDropzone({ onFilesSelected }: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  }, [onFilesSelected]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200",
        isDragActive 
          ? "border-blue-500 bg-blue-500/5" 
          : "border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800/30"
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        multiple
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleChange}
      />
      
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
          <UploadCloud size={24} />
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-200">
            Click or drag files here to upload
          </p>
          <p className="text-xs text-neutral-500 mt-1">
            Support for PDF, CSV, XLSX, DOCX, TXT, images, and ZIP.
          </p>
        </div>
      </div>
    </div>
  );
}
