import { useState, useRef, useCallback } from 'react'
import { useStore } from '@/store/useStore'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Users,
  Upload,
  Plus,
  Trash2,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import {
  parseCSV,
  parseExcel,
  generateCSVTemplate,
  buildImageMapFromFiles,
  downloadTextFile,
} from '@/utils/export'
import type { ImportRow } from '@/utils/export'

export default function EventDetail() {
  const { id: eventId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'import' ? 'import' : 'judges'

  const events = useStore((s) => s.events)
  const judges = useStore((s) => s.judges)
  const works = useStore((s) => s.works)
  const addJudge = useStore((s) => s.addJudge)
  const removeJudge = useStore((s) => s.removeJudge)
  const updateJudge = useStore((s) => s.updateJudge)
  const importWorks = useStore((s) => s.importWorks)
  const removeWork = useStore((s) => s.removeWork)
  const clearWorks = useStore((s) => s.clearWorks)

  const event = events.find((e) => e.id === eventId)
  const eventJudges = judges.filter((j) => j.eventId === eventId)
  const eventWorks = works.filter((w) => w.eventId === eventId)

  const setTab = (tab: string) => {
    setSearchParams(tab === 'import' ? { tab: 'import' } : {})
  }

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-dark-300">活动不存在</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dark-50">{event.name}</h2>
        <p className="mt-1 text-sm text-dark-200">{event.date}</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-dark-400/30 bg-dark-600 p-1">
        <button
          onClick={() => setTab('judges')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'judges'
              ? 'bg-gold-500/20 text-gold-500'
              : 'text-dark-200 hover:text-dark-50'
          }`}
        >
          <Users className="h-4 w-4" />
          评委管理
        </button>
        <button
          onClick={() => setTab('import')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'import'
              ? 'bg-gold-500/20 text-gold-500'
              : 'text-dark-200 hover:text-dark-50'
          }`}
        >
          <Upload className="h-4 w-4" />
          作品导入
        </button>
      </div>

      {activeTab === 'judges' ? (
        <JudgesTab judges={eventJudges} eventId={eventId!} addJudge={addJudge} removeJudge={removeJudge} updateJudge={updateJudge} />
      ) : (
        <ImportTab
          eventId={eventId!}
          works={eventWorks}
          importWorks={importWorks}
          removeWork={removeWork}
          clearWorks={clearWorks}
        />
      )}
    </div>
  )
}

function JudgesTab({
  judges,
  eventId,
  addJudge,
  removeJudge,
  updateJudge,
}: {
  judges: { id: string; eventId: string; name: string; absent: boolean; absentNote: string }[]
  eventId: string
  addJudge: (eventId: string, name: string) => string
  removeJudge: (id: string) => void
  updateJudge: (id: string, data: { absent?: boolean; absentNote?: string }) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    addJudge(eventId, trimmed)
    setNewName('')
    setAdding(false)
  }

  const handleRemove = (id: string) => {
    removeJudge(id)
    setConfirmRemoveId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-dark-50">
          评委列表 ({judges.length})
        </h3>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg border border-gold-500/50 bg-gold-500/20 px-3 py-1.5 text-sm font-medium text-gold-500 transition hover:bg-gold-500/30"
          >
            <Plus className="h-3.5 w-3.5" />
            添加评委
          </button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2 rounded-lg border border-dark-400/30 bg-dark-600 px-4 py-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder="输入评委姓名"
            autoFocus
            className="flex-1 rounded-md border border-dark-400/30 bg-dark-700 px-3 py-1.5 text-sm text-dark-50 placeholder:text-dark-300 focus:border-gold-500/50 focus:outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="rounded-md bg-gold-500/20 px-3 py-1.5 text-sm font-medium text-gold-500 transition hover:bg-gold-500/30 disabled:opacity-40"
          >
            确认
          </button>
          <button
            onClick={() => { setAdding(false); setNewName('') }}
            className="rounded-md px-3 py-1.5 text-sm text-dark-200 transition hover:text-dark-50"
          >
            取消
          </button>
        </div>
      )}

      {judges.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dark-400/30 bg-dark-600 py-16">
          <Users className="mb-3 h-10 w-10 text-dark-300" />
          <p className="text-dark-300">暂无评委，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="space-y-3">
          {judges.map((judge) => (
            <div
              key={judge.id}
              className={`rounded-xl border bg-dark-600 px-5 py-4 transition ${
                judge.absent
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-dark-400/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      judge.absent
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gold-500/15 text-gold-500'
                    }`}
                  >
                    {judge.name.charAt(0)}
                  </div>
                  <span className="font-medium text-dark-50">{judge.name}</span>
                  {judge.absent && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                      缺席
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-dark-200">
                    <span>缺席</span>
                    <div
                      onClick={() => updateJudge(judge.id, { absent: !judge.absent })}
                      className={`relative h-5 w-9 rounded-full transition-colors ${
                        judge.absent ? 'bg-amber-500' : 'bg-dark-400/50'
                      }`}
                    >
                      <div
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                          judge.absent ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </label>

                  {confirmRemoveId === judge.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-red-400">确认删除?</span>
                      <button
                        onClick={() => handleRemove(judge.id)}
                        className="rounded-md bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400 transition hover:bg-red-500/30"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="rounded-md bg-dark-700 px-2 py-1 text-xs text-dark-200 transition hover:text-dark-50"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(judge.id)}
                      className="rounded-lg p-1.5 text-dark-300 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {judge.absent && (
                <div className="mt-3 pl-11">
                  <textarea
                    value={judge.absentNote}
                    onChange={(e) => updateJudge(judge.id, { absentNote: e.target.value })}
                    placeholder="缺席原因（可选）"
                    rows={2}
                    className="w-full rounded-lg border border-amber-500/20 bg-dark-700/50 px-3 py-2 text-sm text-dark-50 placeholder:text-dark-300 focus:border-amber-500/40 focus:outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ImportTab({
  eventId,
  works,
  importWorks,
  removeWork,
  clearWorks,
}: {
  eventId: string
  works: { id: string; eventId: string; anonymousCode: string; imagePath: string; author: string; theme: string; imageValid: boolean; imageUrl: string }[]
  importWorks: (eventId: string, items: ImportRow[], imageMap: Record<string, string>) => void
  removeWork: (id: string) => void
  clearWorks: (eventId: string) => void
}) {
  const [imageMap, setImageMap] = useState<Record<string, string>>({})
  const [importRows, setImportRows] = useState<ImportRow[]>([])
  const [folderName, setFolderName] = useState('')
  const [dataFileName, setDataFileName] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])
  const [imported, setImported] = useState(false)

  const folderInputRef = useRef<HTMLInputElement>(null)
  const dataInputRef = useRef<HTMLInputElement>(null)

  const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp)$/i

  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const imageFiles = Array.from(files).filter((f) => IMAGE_EXTS.test(f.name))
    const map = buildImageMapFromFiles(imageFiles)
    setImageMap(map)
    setFolderName(files[0].webkitRelativePath.split('/')[0] || '已选择文件夹')
    setImported(false)
    setWarnings([])

    if (importRows.length > 0) {
      validateRows(importRows, map)
    }
  }, [importRows])

  const handleDataFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setDataFileName(file.name)
    setImported(false)
    setWarnings([])

    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'csv') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result as string
        const rows = parseCSV(text)
        setImportRows(rows)
        validateRows(rows, imageMap)
      }
      reader.readAsText(file)
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const buffer = ev.target?.result as ArrayBuffer
        const rows = parseExcel(buffer)
        setImportRows(rows)
        validateRows(rows, imageMap)
      }
      reader.readAsArrayBuffer(file)
    }
  }, [imageMap])

  const validateRows = (rows: ImportRow[], map: Record<string, string>) => {
    const ws: string[] = []
    let invalidCount = 0
    for (const row of rows) {
      if (!map[row.imagePath]) {
        invalidCount++
      }
    }
    if (invalidCount > 0) {
      ws.push(`${invalidCount} 件作品的图片未在文件夹中找到`)
    }
    setWarnings(ws)
  }

  const handleImport = () => {
    if (importRows.length === 0) return
    importWorks(eventId, importRows, imageMap)
    setImported(true)
  }

  const handleDownloadTemplate = () => {
    const content = generateCSVTemplate()
    downloadTextFile(content, 'import_template.csv')
  }

  const handleClearWorks = () => {
    clearWorks(eventId)
    setImported(false)
  }

  return (
    <div className="space-y-6">
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {w}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-dark-400/30 bg-dark-600 p-5">
        <h3 className="mb-4 text-lg font-semibold text-dark-50">导入步骤</h3>

        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-sm font-bold text-gold-500">
              1
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-dark-50">选择图片文件夹</p>
              <input
                ref={folderInputRef}
                type="file"
                className="hidden"
                {...{ webkitdir: 'true', directory: 'true' } as React.InputHTMLAttributes<HTMLInputElement>}
                onChange={handleFolderSelect}
                accept="image/*"
              />
              <button
                onClick={() => folderInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dark-400/30 bg-dark-700 px-4 py-2 text-sm text-dark-100 transition hover:border-gold-500/30 hover:text-gold-500"
              >
                <Upload className="h-4 w-4" />
                {folderName || '选择文件夹'}
              </button>
              {folderName && (
                <p className="mt-2 text-xs text-dark-300">
                  已加载 {Object.keys(imageMap).length} 张图片
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-sm font-bold text-gold-500">
              2
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-dark-50">导入数据文件</p>
              <input
                ref={dataInputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleDataFile}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={() => dataInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-dark-400/30 bg-dark-700 px-4 py-2 text-sm text-dark-100 transition hover:border-gold-500/30 hover:text-gold-500"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  {dataFileName || '选择 CSV / XLSX 文件'}
                </button>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-sm text-gold-500/70 transition hover:text-gold-500"
                >
                  下载 CSV 模板
                </button>
              </div>
            </div>
          </div>

          {importRows.length > 0 && (
            <div className="flex items-start gap-4">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gold-500/20 text-sm font-bold text-gold-500">
                3
              </div>
              <div className="flex-1">
                <p className="mb-3 text-sm font-medium text-dark-50">
                  预览导入数据 ({importRows.length} 条)
                </p>
                <div className="overflow-x-auto rounded-lg border border-dark-400/30">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-dark-400/30 bg-dark-700/50">
                        <th className="px-4 py-2.5 text-left font-medium text-dark-200">图片路径</th>
                        <th className="px-4 py-2.5 text-left font-medium text-dark-200">作者</th>
                        <th className="px-4 py-2.5 text-left font-medium text-dark-200">主题</th>
                        <th className="px-4 py-2.5 text-center font-medium text-dark-200">图片状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((row, i) => {
                        const valid = !!imageMap[row.imagePath]
                        return (
                          <tr key={i} className="border-b border-dark-400/20 last:border-0">
                            <td className="px-4 py-2 text-dark-100">{row.imagePath}</td>
                            <td className="px-4 py-2 text-dark-100">{row.author}</td>
                            <td className="px-4 py-2 text-dark-100">{row.theme}</td>
                            <td className="px-4 py-2 text-center">
                              {valid ? (
                                <CheckCircle2 className="mx-auto h-4 w-4 text-green-400" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-red-400" />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleImport}
                    className="rounded-lg border border-gold-500/50 bg-gold-500/20 px-5 py-2 text-sm font-medium text-gold-500 transition hover:bg-gold-500/30"
                  >
                    确认导入
                  </button>
                  <button
                    onClick={() => { setImportRows([]); setDataFileName(''); setWarnings([]) }}
                    className="rounded-lg border border-dark-400/30 bg-dark-700 px-4 py-2 text-sm text-dark-200 transition hover:text-dark-50"
                  >
                    清除预览
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {works.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-dark-50">
              已导入作品 ({works.length})
            </h3>
            <button
              onClick={handleClearWorks}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm text-red-400 transition hover:bg-red-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              清空作品
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {works.map((work) => (
              <div
                key={work.id}
                className="group relative overflow-hidden rounded-xl border border-dark-400/30 bg-dark-600 transition hover:border-gold-500/30"
              >
                <div className="aspect-[4/3] bg-dark-700">
                  {work.imageUrl ? (
                    <img
                      src={work.imageUrl}
                      alt={work.theme}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <X className="h-8 w-8 text-dark-400" />
                    </div>
                  )}
                </div>

                <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-bold text-gold-500">
                  {work.anonymousCode}
                </div>

                <div className="absolute top-2 right-2">
                  {work.imageValid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400 drop-shadow" />
                  ) : (
                    <X className="h-4 w-4 text-red-400 drop-shadow" />
                  )}
                </div>

                <div className="p-2.5">
                  <p className="truncate text-xs font-medium text-dark-50">{work.theme}</p>
                  <p className="truncate text-xs text-dark-300">{work.author}</p>
                </div>

                <button
                  onClick={() => removeWork(work.id)}
                  className="absolute bottom-2 right-2 rounded-md bg-red-500/20 p-1 text-red-400 opacity-0 transition hover:bg-red-500/30 group-hover:opacity-100"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
