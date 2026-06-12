import { useCallback, useRef, useState } from 'react';
import { Upload, FileCheck, AlertCircle, X } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { clsx } from 'clsx';

interface FileUploadProps<T = any> {
  label: string;
  description: string;
  accept?: string;
  expectedColumns?: string[];
  onParsed: (rows: T[]) => void;
  sampleData?: T[];
  icon?: React.ReactNode;
  colorAccent?: 'primary' | 'warn' | 'safe';
}

export default function FileUpload<T extends Record<string, any>>({
  label,
  description,
  accept = '.csv,.xlsx,.xls',
  expectedColumns,
  onParsed,
  icon,
  colorAccent = 'primary',
}: FileUploadProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [rowCount, setRowCount] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const parseFile = useCallback(
    (file: File) => {
      setError('');
      const ext = file.name.split('.').pop()?.toLowerCase();

      const handleRows = (rows: any[]) => {
        if (rows.length === 0) {
          setError('文件内容为空');
          return;
        }
        const clean = rows
          .map((r) => {
            const o: any = {};
            Object.keys(r).forEach((k) => {
              const key = String(k).trim();
              let val = r[k];
              if (typeof val === 'string') val = val.trim();
              o[key] = val;
            });
            return o;
          })
          .filter((r) => Object.values(r).some((v) => v !== '' && v != null));

        setFileName(file.name);
        setRowCount(clean.length);
        onParsed(clean);
      };

      if (ext === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => handleRows(res.data as any[]),
          error: (e) => setError(`CSV解析失败: ${e.message}`),
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);
            handleRows(rows);
          } catch (e: any) {
            setError(`Excel解析失败: ${e.message}`);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setError('仅支持 CSV / XLSX / XLS 格式');
      }
    },
    [onParsed],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const files = e.dataTransfer.files;
      if (files && files[0]) parseFile(files[0]);
    },
    [parseFile],
  );

  const accent = {
    primary: {
      border: 'border-primary-300 bg-primary-50/40',
      hover: 'hover:border-primary-400 hover:bg-primary-50',
      badge: 'badge-primary',
    },
    warn: {
      border: 'border-warn-400/50 bg-warn-400/5',
      hover: 'hover:border-warn-500 hover:bg-warn-400/10',
      badge: 'badge-warn',
    },
    safe: {
      border: 'border-safe-400/50 bg-safe-400/5',
      hover: 'hover:border-safe-500 hover:bg-safe-400/10',
      badge: 'badge-safe',
    },
  }[colorAccent];

  return (
    <div className="card-sm flex flex-col h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-serif font-bold text-primary-800 flex items-center gap-2 text-lg">
            {icon}
            {label}
          </h3>
          <p className="text-xs text-primary-500 mt-1">{description}</p>
        </div>
        {rowCount > 0 && (
          <span className={clsx('badge shrink-0', accent.badge)}>
            <FileCheck className="w-3 h-3" />
            {rowCount} 条记录
          </span>
        )}
      </div>

      {expectedColumns && (
        <div className="text-xs text-primary-500 mb-3 px-2 py-1.5 rounded bg-primary-50/50">
          <span className="font-medium text-primary-700">需要包含字段：</span>
          {expectedColumns.join('、')}
        </div>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={clsx(
          'cursor-pointer flex-1 min-h-[120px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center transition-all px-4 py-6',
          dragActive
            ? 'border-primary-500 bg-primary-100 scale-[1.01]'
            : `${accent.border} ${accent.hover}`,
        )}
      >
        <Upload className="w-8 h-8 text-primary-400 mb-2" />
        {fileName ? (
          <div>
            <div className="text-sm font-medium text-primary-800">
              {fileName}
            </div>
            <div className="text-xs text-primary-500 mt-0.5">
              点击或拖拽更换文件
            </div>
          </div>
        ) : (
          <div>
            <div className="text-sm font-medium text-primary-700">
              点击或拖拽文件到此处
            </div>
            <div className="text-xs text-primary-400 mt-0.5">
              支持 CSV / XLSX / XLS
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseFile(f);
          e.target.value = '';
        }}
      />

      {error && (
        <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md bg-danger-400/10 text-danger-600 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => setError('')}
            className="shrink-0 hover:text-danger-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
