import React, { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  isLoading?: boolean;
  acceptedFileTypes?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  isLoading = false,
  acceptedFileTypes = '.csv',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(f => 
      f.name.toLowerCase().endsWith('.csv')
    );
    
    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
      onFilesSelected(files);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300',
          isDragOver
            ? 'border-brand-500 bg-brand-50 scale-[1.01]'
            : 'border-amber-200 bg-amber-50/30 hover:border-brand-300 hover:bg-amber-50/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300',
            isDragOver ? 'bg-brand-100 animate-pulse' : 'bg-amber-100'
          )}>
            <Upload className={cn(
              'w-8 h-8 transition-colors duration-300',
              isDragOver ? 'text-brand-600' : 'text-amber-600'
            )} />
          </div>
          
          <h3 className="text-lg font-display font-bold text-amber-900 mb-2">
            拖放 CSV 文件到此处
          </h3>
          <p className="text-amber-600 mb-4">
            或点击下方按钮选择文件
          </p>
          
          <div className="flex gap-3">
            <Button
              onClick={handleBrowseClick}
              disabled={isLoading}
              loading={isLoading}
            >
              选择文件
            </Button>
            {selectedFiles.length > 0 && (
              <Button
                variant="ghost"
                onClick={clearFiles}
                disabled={isLoading}
              >
                清除选择
              </Button>
            )}
          </div>
        </div>
        
        <div className="absolute top-3 right-3 flex items-center gap-2 text-xs text-amber-500">
          <AlertCircle className="w-4 h-4" />
          支持温度日志、糖度表、投料记录三种格式
        </div>
      </div>
      
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-amber-800 mb-2">已选择文件：</h4>
          {selectedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-amber-100 hover:border-amber-200 transition-colors"
            >
              <FileText className="w-5 h-5 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-amber-500">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
