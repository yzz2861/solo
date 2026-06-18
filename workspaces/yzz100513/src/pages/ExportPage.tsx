import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, BookOpen, Table, Eye, Check } from 'lucide-react'
import { useTranscriptStore } from '@/store/useTranscriptStore'
import { exportCatalog, exportResearch, exportConfirmationList, downloadBlob } from '@/utils/exporter'
import type { Transcript } from '@/types'

type ExportType = 'catalog' | 'research' | 'confirmation'

interface ExportOption {
  id: ExportType
  name: string
  description: string
  icon: React.ReactNode
  format: string
}

const exportOptions: ExportOption[] = [
  {
    id: 'catalog',
    name: '目录版 PDF',
    description: '按章节分类整理的访谈目录，适合阅读和分享',
    icon: <BookOpen className="w-6 h-6" />,
    format: 'PDF'
  },
  {
    id: 'research',
    name: '研究版 PDF',
    description: '包含完整标注信息的研究版本，带时间码和实体标记',
    icon: <FileText className="w-6 h-6" />,
    format: 'PDF'
  },
  {
    id: 'confirmation',
    name: '回访确认表',
    description: '导出待确认事项列表，用于回访确认',
    icon: <Table className="w-6 h-6" />,
    format: 'Excel / CSV'
  }
]

export function ExportPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, loadProject } = useTranscriptStore()

  const [selectedType, setSelectedType] = useState<ExportType>('catalog')
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [options, setOptions] = useState({
    includeTimecode: true,
    showOriginalPosition: false,
    format: 'xlsx' as 'xlsx' | 'csv',
    onlyUnconfirmed: false
  })

  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      loadProject(id).then(() => setIsLoading(false))
    }
  }, [id, loadProject])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const generatePreview = async () => {
    if (!currentProject) return

    setIsGenerating(true)
    try {
      let blob: Blob

      switch (selectedType) {
        case 'catalog':
          blob = exportCatalog(currentProject, {
            includeTimecode: options.includeTimecode
          })
          break
        case 'research':
          blob = exportResearch(currentProject, {
            showOriginalPosition: options.showOriginalPosition
          })
          break
        case 'confirmation':
          blob = exportConfirmationList(currentProject, {
            format: options.format,
            onlyUnconfirmed: options.onlyUnconfirmed
          })
          break
        default:
          return
      }

      setPreviewBlob(blob)

      if (selectedType !== 'confirmation' || options.format === 'csv') {
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
      } else {
        setPreviewUrl(null)
      }
    } catch (error) {
      console.error('生成预览失败:', error)
      alert('生成预览失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  const generateFilename = (type: ExportType, project: Transcript, opts: typeof options) => {
    const safeTitle = project.title.replace(/[\\/:*?"<>|]/g, '_')
    const date = new Date().toISOString().split('T')[0]

    switch (type) {
      case 'catalog':
        return `${safeTitle}_目录版_${date}.pdf`
      case 'research':
        return `${safeTitle}_研究版_${date}.pdf`
      case 'confirmation':
        return `${safeTitle}_确认表_${date}.${opts.format}`
      default:
        return `${safeTitle}_${date}`
    }
  }

  const handleExport = async () => {
    if (!currentProject) return

    setIsGenerating(true)
    try {
      let blob: Blob

      switch (selectedType) {
        case 'catalog':
          blob = exportCatalog(currentProject, {
            includeTimecode: options.includeTimecode
          })
          break
        case 'research':
          blob = exportResearch(currentProject, {
            showOriginalPosition: options.showOriginalPosition
          })
          break
        case 'confirmation':
          blob = exportConfirmationList(currentProject, {
            format: options.format,
            onlyUnconfirmed: options.onlyUnconfirmed
          })
          break
        default:
          return
      }

      const filename = generateFilename(selectedType, currentProject, options)
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('导出失败:', error)
      alert('导出失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ink-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-600 mb-4">项目不存在</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600"
          >
            返回项目列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper bg-paper-texture">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(`/editor/${id}`)}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ink-600" />
          </button>
          <div>
            <h1 className="text-2xl font-kai text-ink-800">导出项目</h1>
            <p className="text-ink-500">{currentProject.title}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h2 className="font-kai text-lg text-ink-800 mb-4">选择导出类型</h2>

            <div className="space-y-3">
              {exportOptions.map((option) => (
                <div
                  key={option.id}
                  onClick={() => {
                    setSelectedType(option.id)
                    setPreviewBlob(null)
                    setPreviewUrl(null)
                  }}
                  className={`p-4 bg-white rounded-xl border-2 cursor-pointer transition-all ${
                    selectedType === option.id
                      ? 'border-primary-400 bg-primary-50/30'
                      : 'border-ink-100 hover:border-ink-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      selectedType === option.id
                        ? 'bg-primary-100 text-primary-600'
                        : 'bg-ink-100 text-ink-500'
                    }`}>
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${
                          selectedType === option.id ? 'text-primary-700' : 'text-ink-800'
                        }`}>
                          {option.name}
                        </h3>
                        <span className="text-xs bg-ink-100 text-ink-600 px-2 py-0.5 rounded">
                          {option.format}
                        </span>
                      </div>
                      <p className="text-sm text-ink-500 mt-1">
                        {option.description}
                      </p>
                    </div>
                    {selectedType === option.id && (
                      <Check className="w-5 h-5 text-primary-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-ink-100 p-4">
              <h3 className="font-medium text-ink-800 mb-3">导出选项</h3>

              {selectedType === 'catalog' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.includeTimecode}
                      onChange={(e) => setOptions(prev => ({ ...prev, includeTimecode: e.target.checked }))}
                      className="w-4 h-4 rounded border-ink-300 text-primary-500 focus:ring-primary-200"
                    />
                    <span className="text-sm text-ink-700">包含时间码</span>
                  </label>
                </div>
              )}

              {selectedType === 'research' && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.showOriginalPosition}
                      onChange={(e) => setOptions(prev => ({ ...prev, showOriginalPosition: e.target.checked }))}
                      className="w-4 h-4 rounded border-ink-300 text-primary-500 focus:ring-primary-200"
                    />
                    <span className="text-sm text-ink-700">显示原始段落位置</span>
                  </label>
                </div>
              )}

              {selectedType === 'confirmation' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-ink-700 mb-2">导出格式</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOptions(prev => ({ ...prev, format: 'xlsx' }))}
                        className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                          options.format === 'xlsx'
                            ? 'bg-primary-100 text-primary-700 border-primary-300'
                            : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
                        }`}
                      >
                        Excel (.xlsx)
                      </button>
                      <button
                        onClick={() => setOptions(prev => ({ ...prev, format: 'csv' }))}
                        className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                          options.format === 'csv'
                            ? 'bg-primary-100 text-primary-700 border-primary-300'
                            : 'bg-white text-ink-600 border-ink-200 hover:bg-ink-50'
                        }`}
                      >
                        CSV (.csv)
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={options.onlyUnconfirmed}
                      onChange={(e) => setOptions(prev => ({ ...prev, onlyUnconfirmed: e.target.checked }))}
                      className="w-4 h-4 rounded border-ink-300 text-primary-500 focus:ring-primary-200"
                    />
                    <span className="text-sm text-ink-700">仅导出待确认项</span>
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <button
                onClick={generatePreview}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-ink-100 text-ink-700 rounded-xl font-medium hover:bg-ink-200 transition-colors disabled:opacity-50"
              >
                <Eye className="w-5 h-5" />
                {isGenerating ? '生成中...' : '生成预览'}
              </button>

              <button
                onClick={handleExport}
                disabled={isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 shadow-sm"
              >
                <Download className="w-5 h-5" />
                下载文件
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden h-full min-h-[600px]">
              <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                <h3 className="font-medium text-ink-800">预览</h3>
                {previewBlob && (
                  <span className="text-xs text-ink-500">
                    {(previewBlob.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </div>

              <div className="h-[calc(100%-56px)] flex items-center justify-center bg-ink-50">
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    title="预览"
                  />
                ) : previewBlob ? (
                  <div className="text-center">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-ink-700 font-medium mb-1">文件已准备好</p>
                    <p className="text-sm text-ink-500">
                      {selectedType === 'confirmation' && options.format === 'xlsx'
                        ? 'Excel 文件无法预览，请点击下载查看'
                        : '点击下载按钮保存文件'}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-ink-400">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">点击"生成预览"查看导出效果</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
