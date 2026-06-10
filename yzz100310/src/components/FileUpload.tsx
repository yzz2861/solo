import { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import type { FileType } from '@/types';

export interface FileUploadProps {
  fileType: FileType;
  label: string;
  description: string;
  accept: string;
  onFileSelect: (file: File) => Promise<void> | void;
  disabled?: boolean;
}

const ICONS: Record<FileType, typeof FileText> = {
  borrow: FileSpreadsheet,
  return: FileText,
  waiver: FileText,
};

export function FileUpload({ fileType, label, description, accept, onFileSelect, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = ICONS[fileType];

  const handleFile = useCallback(
    async (file: File) => {
      setProcessing(true);
      setMessage(null);
      try {
        await onFileSelect(file);
        setMessage({ type: 'success', text: `${file.name} 已处理` });
      } catch (e) {
        setMessage({ type: 'error', text: (e as Error).message || '处理失败' });
      } finally {
        setProcessing(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onFileSelect],
  );

  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-serif font-semibold text-base text-primary">{label}</h3>
            <p className="text-xs text-primary/60 mt-0.5">{description}</p>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            if (disabled) return;
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            if (disabled) return;
            e.preventDefault();
            setIsDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-accent bg-accent/5'
              : disabled
                ? 'border-border bg-gray-50 cursor-not-allowed opacity-60'
                : 'border-border hover:border-primary/40 hover:bg-primary/[0.02]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled || processing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <UploadCloud
            className={`w-8 h-8 mx-auto mb-2 transition ${isDragging ? 'text-accent scale-110' : 'text-primary/40'}`}
          />
          <p className="text-sm text-primary/70">
            {processing ? '处理中…' : isDragging ? '松开即可上传' : '点击或拖拽文件到此处'}
          </p>
          <p className="text-xs text-primary/40 mt-1">
            支持 {accept.split(',').map((s) => s.toUpperCase()).join(' / ')} 格式
          </p>
        </div>

        {message && (
          <div
            className={`mt-3 flex items-center gap-2 text-sm ${
              message.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
