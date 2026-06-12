import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, X, Store as StoreIcon, ImagePlus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Photo } from '@/types'

interface UploadItem {
  photo: Photo
  progress: number
}

export default function PhotoImport() {
  const navigate = useNavigate()
  const stores = useAppStore((s) => s.stores)
  const importedPhotos = useAppStore((s) => s.importedPhotos)
  const addImportedPhotos = useAppStore((s) => s.addImportedPhotos)
  const getStoreById = useAppStore((s) => s.getStoreById)

  const [selectedStore, setSelectedStore] = useState(stores[0]?.id ?? '')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (uploadItems.length === 0) return
    const timer = setInterval(() => {
      setUploadItems((prev) =>
        prev.map((item) => ({
          ...item,
          progress: item.progress >= 100 ? 100 : item.progress + Math.random() * 15 + 5,
        }))
      )
    }, 300)
    return () => clearInterval(timer)
  }, [uploadItems.length])

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
      if (imageFiles.length === 0) return

      const now = Date.now()
      const newPhotos: Photo[] = imageFiles.map((_, i) => ({
        id: `photo-new-${now}-${i}`,
        batchId: 'batch-new',
        storeId: selectedStore,
        url: `https://picsum.photos/seed/new${now + i}/800/600`,
        thumbnailUrl: `https://picsum.photos/seed/new${now + i}/200/150`,
        quality: 'GOOD',
        blurScore: Math.random() * 0.2,
        glareScore: Math.random() * 0.15,
        takenAt: new Date().toISOString(),
        hasIssues: true,
        issueTypes: [],
        minConfidence: 0,
      }))

      addImportedPhotos(newPhotos)
      setUploadItems((prev) => [
        ...prev,
        ...newPhotos.map((photo) => ({ photo, progress: 0 })),
      ])
    },
    [selectedStore, addImportedPhotos]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const removeItem = (id: string) => {
    setUploadItems((prev) => prev.filter((item) => item.photo.id !== id))
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">照片导入</h1>
        <p className="text-sm text-gray-500 mt-1">
          批量导入门店货架照片，AI 将自动识别陈列问题
        </p>
      </div>

      <div
        className={`card p-5 border-2 border-dashed transition-colors duration-200 cursor-pointer ${
          isDragOver ? 'border-accent animate-pulse-border bg-accent/5' : 'border-gray-600 hover:border-gray-500'
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center py-10">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDragOver ? 'bg-accent/20' : 'bg-brand-700/50'}`}>
            <Upload className={`w-8 h-8 ${isDragOver ? 'text-accent' : 'text-gray-400'}`} />
          </div>
          <p className="text-gray-300 text-base font-medium">拖拽照片到此处或点击选择</p>
          <p className="text-gray-500 text-xs mt-2">支持 JPG / PNG / WEBP 格式</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      <div className="card p-5 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <StoreIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">门店选择器</span>
        </div>
        <select
          value={selectedStore}
          onChange={(e) => setSelectedStore(e.target.value)}
          className="w-full bg-brand-700/50 border border-brand-600/50 rounded-lg px-3 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-accent/50"
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name} - {store.region}
            </option>
          ))}
        </select>
      </div>

      {uploadItems.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-300">
              上传队列 ({uploadItems.length})
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {uploadItems.map((item) => {
              const store = getStoreById(item.photo.storeId)
              const clampedProgress = Math.min(item.progress, 100)
              return (
                <div key={item.photo.id} className="card p-3 relative group">
                  <div className="aspect-[4/3] rounded-md overflow-hidden bg-brand-700/50 mb-2">
                    <img
                      src={item.photo.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-brand-700/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300 bg-accent"
                      style={{ width: `${clampedProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {store && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent">
                        {store.name}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-500">{Math.round(clampedProgress)}%</span>
                  </div>
                  <button
                    onClick={() => removeItem(item.photo.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5 text-gray-300" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button className="btn-secondary" onClick={() => setUploadItems([])}>
          清空队列
        </button>
        <button
          className="btn-primary flex items-center gap-2"
          disabled={importedPhotos.length === 0}
          onClick={() => navigate('/results')}
        >
          <ImagePlus className="w-4 h-4" />
          开始识别
        </button>
      </div>
    </div>
  )
}
