import { useState, useCallback } from 'react'
import { Upload, FileAudio } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export default function AudioUploader() {
  const { uploadAudio, isAnalyzing } = useAppStore()
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('audio/')) return
    setFileName(file.name)
    await uploadAudio(file)
  }, [uploadAudio])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300
        ${isDragOver
          ? 'border-amber bg-amber/5 scale-[1.02]'
          : 'border-navy/20 dark:border-teal/20 hover:border-amber/50'
        }
        ${isAnalyzing ? 'opacity-60 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept="audio/*"
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      {fileName ? (
        <div className="flex flex-col items-center gap-3">
          <FileAudio className="w-10 h-10 text-teal" />
          <p className="text-sm font-medium text-navy dark:text-teal">{fileName}</p>
          <p className="text-xs text-gray-400">
            {isAnalyzing ? '正在解码音频...' : '点击或拖拽更换文件'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className="w-10 h-10 text-navy/40 dark:text-teal/40" />
          <p className="text-sm font-medium text-navy/60 dark:text-teal/60">
            拖拽音频文件到此处，或点击上传
          </p>
          <p className="text-xs text-gray-400">支持 WAV、MP3 格式</p>
        </div>
      )}
    </div>
  )
}
