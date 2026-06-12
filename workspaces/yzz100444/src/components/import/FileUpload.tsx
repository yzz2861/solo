import React, { useCallback } from 'react';
import { Upload, FileText, FileSpreadsheet, FileJson, X } from 'lucide-react';
import Papa from 'papaparse';
import Button from '../common/Button';
import Badge from '../common/Badge';

interface FileUploadProps {
  onDataLoaded: (data: string[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  rowCount: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onDataLoaded,
  onError,
  className = '',
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [fileInfo, setFileInfo] = React.useState<FileInfo | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const parseFile = useCallback(
    (file: File) => {
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension === 'csv') {
        Papa.parse(file, {
          complete: (results) => {
            const texts = results.data
              .flat()
              .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
            if (texts.length > 0) {
              setFileInfo({
                name: file.name,
                size: file.size,
                type: 'csv',
                rowCount: texts.length,
              });
              onDataLoaded(texts);
            } else {
              onError?.('CSV文件中未找到有效数据');
            }
          },
          error: (error) => {
            onError?.(`解析CSV文件失败: ${error.message}`);
          },
        });
      } else if (extension === 'json') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string;
            const data = JSON.parse(content);
            let texts: string[] = [];

            if (Array.isArray(data)) {
              texts = data
                .map((item) => {
                  if (typeof item === 'string') return item;
                  if (typeof item === 'object' && item !== null) {
                    return (
                      item.text ||
                      item.content ||
                      item.answer ||
                      item.response ||
                      Object.values(item)[0]
                    );
                  }
                  return String(item);
                })
                .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
            }

            if (texts.length > 0) {
              setFileInfo({
                name: file.name,
                size: file.size,
                type: 'json',
                rowCount: texts.length,
              });
              onDataLoaded(texts);
            } else {
              onError?.('JSON文件中未找到有效数据');
            }
          } catch (error) {
            onError?.('解析JSON文件失败，请检查文件格式');
          }
        };
        reader.onerror = () => {
          onError?.('读取文件失败');
        };
        reader.readAsText(file);
      } else if (extension === 'txt') {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const texts = content
            .split(/\n|\r\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

          if (texts.length > 0) {
            setFileInfo({
              name: file.name,
              size: file.size,
              type: 'txt',
              rowCount: texts.length,
            });
            onDataLoaded(texts);
          } else {
            onError?.('TXT文件中未找到有效数据');
          }
        };
        reader.onerror = () => {
          onError?.('读取文件失败');
        };
        reader.readAsText(file);
      } else {
        onError?.('不支持的文件格式，请上传CSV、JSON或TXT文件');
      }
    },
    [onDataLoaded, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        parseFile(files[0]);
      }
    },
    [parseFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        parseFile(files[0]);
      }
    },
    [parseFile]
  );

  const handleClear = useCallback(() => {
    setFileInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'csv':
        return <FileSpreadsheet className="w-6 h-6 text-green-600" />;
      case 'json':
        return <FileJson className="w-6 h-6 text-yellow-600" />;
      default:
        return <FileText className="w-6 h-6 text-blue-600" />;
    }
  };

  return (
    <div className={className}>
      {!fileInfo ? (
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center gap-3">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isDragging ? 'bg-primary-100' : 'bg-neutral-100'
              }`}
            >
              <Upload
                className={`w-8 h-8 ${isDragging ? 'text-primary-600' : 'text-neutral-400'}`}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-900">
                {isDragging ? '释放鼠标上传文件' : '拖拽文件到此处'}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                或点击选择文件，支持 CSV、JSON、TXT 格式
              </p>
            </div>
            <Button variant="secondary" size="sm" className="mt-2">
              选择文件
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center">
              {getFileIcon(fileInfo.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-neutral-900 truncate">
                {fileInfo.name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-neutral-500">
                  {formatFileSize(fileInfo.size)}
                </span>
                <Badge variant="info" size="sm">
                  {fileInfo.rowCount} 条回答
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="w-4 h-4" />}
              onClick={handleClear}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
