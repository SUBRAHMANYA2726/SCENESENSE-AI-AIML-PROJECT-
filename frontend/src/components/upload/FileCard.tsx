import React from 'react';
import { File, FileText, Image as ImageIcon, CheckCircle, X, Loader2, Database, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export type FileStatus = 'uploading' | 'processing' | 'completed' | 'error';

interface FileCardProps {
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  progress?: number;
  onRemove?: () => void;
}

export function FileCard({ name, size, type, status, progress = 0, onRemove }: FileCardProps) {
  const getIcon = () => {
    if (type.includes('image')) return <ImageIcon size={20} className="text-blue-400" />;
    if (type.includes('csv') || type.includes('excel') || type.includes('spreadsheet')) return <Database size={20} className="text-green-400" />;
    if (type.includes('pdf')) return <FileText size={20} className="text-red-400" />;
    return <File size={20} className="text-neutral-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isProcessingOrUploading = status === 'uploading' || status === 'processing';

  return (
    <div className={cn(
      "relative rounded-xl bg-neutral-900 border p-3 flex items-center gap-3 transition-all",
      isProcessingOrUploading ? "border-transparent" : "border-neutral-800"
    )}>
      {isProcessingOrUploading && (
        <div className="gemini-gradient-border absolute inset-0 rounded-xl pointer-events-none opacity-50" />
      )}
      
      <div className="shrink-0 w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center relative z-10">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0 relative z-10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-neutral-200 truncate">{name}</p>
          {onRemove && (
            <button 
              onClick={onRemove}
              className="text-neutral-500 hover:text-neutral-300 p-0.5 rounded-md hover:bg-neutral-800 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-neutral-500">{formatSize(size)}</p>
          
          {isProcessingOrUploading && (
            <div className="flex-1 max-w-[100px] h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div 
                className="h-full gemini-gradient-bg transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          <div className="flex items-center gap-1 text-xs">
            {status === 'completed' && <><CheckCircle size={12} className="text-green-500" /> <span className="text-green-500">Ready</span></>}
            {status === 'processing' && <><Loader2 size={12} className="text-purple-400 animate-spin" /> <span className="text-purple-400">Processing</span></>}
            {status === 'uploading' && <><UploadCloud size={12} className="text-blue-400 animate-bounce" /> <span className="text-blue-400">Uploading</span></>}
            {status === 'error' && <span className="text-red-500">Failed</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
