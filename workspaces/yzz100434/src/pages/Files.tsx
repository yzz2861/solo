import { useRef, useCallback } from 'react'
import {
  FolderOpen,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  X,
  AlertTriangle,
  Trash2,
  HardDrive,
  Clock,
  Hash,
} from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import type { ScannedFile, AuditChecklistItem } from '@/types'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '@/types'
import StatusTag from '@/components/StatusTag'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return <FileText className="h-4 w-4 text-red-400" />
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
    return <Image className="h-4 w-4 text-blue-400" />
  if (['xlsx', 'xls', 'csv'].includes(ext))
    return <FileSpreadsheet className="h-4 w-4 text-green-400" />
  return <File className="h-4 w-4 text-zinc-400" />
}

function getMatchedItems(
  file: ScannedFile,
  checklist: AuditChecklistItem[]
): AuditChecklistItem[] {
  const fileName = file.name.toLowerCase()
  return checklist.filter((item) =>
    item.requiredFiles.some((kw) => fileName.includes(kw.toLowerCase()))
  )
}

export default function Files() {
  const folderInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { session, importScannedFiles, removeScannedFile, resetSession } =
    useAuditStore()
  const { scannedFiles, checklist } = session

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return
      const converted: ScannedFile[] = Array.from(fileList).map((file) => ({
        name: file.name,
        path: (file as File & { webkitRelativePath?: string })
          .webkitRelativePath || file.name,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type,
      }))
      if (converted.length > 0) {
        importScannedFiles(converted)
      }
    },
    [importScannedFiles]
  )

  const handleFolderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      e.target.value = ''
    },
    [handleFiles]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      e.target.value = ''
    },
    [handleFiles]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleClearAll = useCallback(() => {
    if (window.confirm('确定要清除全部导入的文件吗？此操作不可撤销。')) {
      resetSession()
    }
  }, [resetSession])

  const totalSize = scannedFiles.reduce((sum, f) => sum + f.size, 0)
  const lastScanTime = session.updatedAt

  const unmatchedFiles = scannedFiles.filter(
    (file) => getMatchedItems(file, checklist).length === 0
  )

  const fileToMatchedItems = new Map<string, AuditChecklistItem[]>()
  scannedFiles.forEach((file) => {
    fileToMatchedItems.set(file.path, getMatchedItems(file, checklist))
  })

  return (
    <div className="min-h-screen bg-[#1C1C1E] px-6 py-8 text-[#FAFAFA]">
      <div className="mx-auto max-w-5xl space-y-6">
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#3F3F46] bg-[#3F3F46]/30 py-16 transition-colors hover:border-[#F59E0B] hover:bg-[#3F3F46]/50"
          onClick={() => folderInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <FolderOpen className="mb-4 h-12 w-12 text-[#F59E0B]" />
          <p className="text-lg font-medium text-[#FAFAFA]">
            点击选择文件夹 或 拖拽文件到此处
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            支持选择整个文件夹或多个文件
          </p>
          <input
            ref={folderInputRef}
            type="file"
            className="hidden"
            onChange={handleFolderChange}
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            onChange={handleFileChange}
          />
        </div>

        {scannedFiles.length > 0 && (
          <p className="text-center text-sm text-[#F59E0B]">
            已导入 {scannedFiles.length} 个文件
          </p>
        )}

        {scannedFiles.length > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-[#3F3F46] px-5 py-3">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2 text-sm text-zinc-300">
                <Hash className="h-4 w-4 text-[#F59E0B]" />
                文件总数: <strong className="text-[#FAFAFA]">{scannedFiles.length}</strong>
              </span>
              <span className="flex items-center gap-2 text-sm text-zinc-300">
                <HardDrive className="h-4 w-4 text-[#F59E0B]" />
                总大小: <strong className="text-[#FAFAFA]">{formatSize(totalSize)}</strong>
              </span>
              <span className="flex items-center gap-2 text-sm text-zinc-300">
                <Clock className="h-4 w-4 text-[#F59E0B]" />
                最后扫描: <strong className="text-[#FAFAFA]">{formatDate(lastScanTime)}</strong>
              </span>
            </div>
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1.5 rounded bg-red-500/20 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-500/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              清除全部
            </button>
          </div>
        )}

        {scannedFiles.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[#3F3F46]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#3F3F46] bg-[#3F3F46]/60">
                  <th className="px-4 py-3 font-medium text-zinc-400">文件名</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">路径</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">大小</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">修改时间</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">关联清单项</th>
                  <th className="px-4 py-3 font-medium text-zinc-400">操作</th>
                </tr>
              </thead>
              <tbody>
                {scannedFiles.map((file) => {
                  const matchedItems = fileToMatchedItems.get(file.path) ?? []
                  return (
                    <tr
                      key={file.path}
                      className="border-b border-[#3F3F46]/50 transition-colors hover:bg-[#3F3F46]/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getFileIcon(file.name)}
                          <span className="max-w-[200px] truncate" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="max-w-[180px] truncate text-zinc-400"
                          title={file.path}
                        >
                          {file.path}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatSize(file.size)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {formatDate(file.lastModified)}
                      </td>
                      <td className="px-4 py-3">
                        {matchedItems.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {matchedItems
                              .sort(
                                (a, b) =>
                                  CATEGORY_ORDER.indexOf(a.category) -
                                  CATEGORY_ORDER.indexOf(b.category)
                              )
                              .map((item) => (
                                <span
                                  key={item.id}
                                  className="inline-flex items-center gap-1 rounded bg-[#3F3F46] px-1.5 py-0.5 text-xs"
                                >
                                  <StatusTag status={item.status} />
                                  <span className="text-zinc-400">
                                    [{CATEGORY_LABELS[item.category]}]
                                  </span>
                                  <span className="text-[#FAFAFA]">
                                    {item.name}
                                  </span>
                                </span>
                              ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeScannedFile(file.path)}
                          className="rounded p-1 text-zinc-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
                          title="移除文件"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {unmatchedFiles.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-5 py-4">
            <div className="mb-3 flex items-center gap-2 text-[#F59E0B]">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">以下文件未匹配到清单项</span>
            </div>
            <ul className="space-y-2">
              {unmatchedFiles.map((file) => (
                <li
                  key={file.path}
                  className="flex items-center justify-between rounded bg-[#1C1C1E]/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {getFileIcon(file.name)}
                    <span className="text-sm text-[#FAFAFA]">{file.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    请检查文件命名是否包含清单关键词
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
