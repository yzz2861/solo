import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Download, Upload, Calendar, User, MapPin, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Transcript } from '@/types'
import { useTranscriptStore } from '@/store/useTranscriptStore'
import { exportProject, importProject } from '@/utils/storage'
import { downloadBlob } from '@/utils/exporter'

export function ProjectList() {
  const navigate = useNavigate()
  const { projects, loadAllProjects, removeProject, importProjectData } = useTranscriptStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'title'>('updated')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    loadAllProjects()
  }, [loadAllProjects])

  const filteredProjects = projects
    .filter((project) => {
      const query = searchQuery.toLowerCase()
      return (
        project.title.toLowerCase().includes(query) ||
        project.interviewee.toLowerCase().includes(query) ||
        project.interviewer.toLowerCase().includes(query) ||
        project.heritageType.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
      return a.title.localeCompare(b.title, 'zh-CN')
    })

  const handleDelete = async (id: string) => {
    await removeProject(id)
    setShowDeleteConfirm(null)
  }

  const handleExport = (project: Transcript) => {
    const data = exportProject(project.id)
    const blob = new Blob([data], { type: 'application/json' })
    downloadBlob(blob, `${project.title}.json`)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        const imported = importProject(content)
        await loadAllProjects()
        navigate(`/editor/${imported.id}`)
      } catch (error) {
        alert('导入失败：' + (error as Error).message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (!file || !file.name.endsWith('.json')) {
      alert('请拖入 JSON 格式的项目文件')
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string
        await importProjectData(content)
        await loadAllProjects()
      } catch (error) {
        alert('导入失败：' + (error as Error).message)
      }
    }
    reader.readAsText(file)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-paper bg-paper-texture">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-kai text-ink-800 mb-2">非遗口述史分章系统</h1>
            <p className="text-ink-500">管理和编辑您的口述史项目</p>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-ink-200 rounded-lg text-ink-600 hover:bg-ink-50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              导入项目
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              onClick={() => navigate('/import')}
              className="flex items-center gap-2 px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              新建项目
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              placeholder="搜索项目..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-ink-500">排序：</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 bg-white border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 text-sm"
            >
              <option value="updated">最近更新</option>
              <option value="created">创建时间</option>
              <option value="title">项目名称</option>
            </select>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative transition-all ${
            isDragging ? 'ring-2 ring-primary-400 ring-offset-2 rounded-xl' : ''
          }`}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-primary-50/80 rounded-xl flex items-center justify-center z-10">
              <div className="text-center">
                <Upload className="w-12 h-12 text-primary-500 mx-auto mb-2" />
                <p className="text-primary-700 font-medium">释放以导入项目</p>
              </div>
            </div>
          )}

          {filteredProjects.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-ink-100 p-12 text-center">
              <FileText className="w-16 h-16 text-ink-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-ink-700 mb-2">
                {searchQuery ? '没有找到匹配的项目' : '还没有任何项目'}
              </h3>
              <p className="text-ink-500 mb-6">
                {searchQuery ? '尝试使用其他关键词搜索' : '点击右上角按钮创建您的第一个项目'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => navigate('/import')}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新建项目
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <div
                  key={project.id}
                  className="group bg-white rounded-2xl shadow-sm border border-ink-100 hover:shadow-md hover:border-ink-200 transition-all overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3
                        className="font-kai text-lg text-ink-800 cursor-pointer hover:text-primary-600 transition-colors line-clamp-1"
                        onClick={() => navigate(`/editor/${project.id}`)}
                      >
                        {project.title}
                      </h3>

                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/editor/${project.id}`)}
                          className="p-1.5 hover:bg-ink-100 rounded"
                          title="编辑"
                        >
                          <Edit2 className="w-4 h-4 text-ink-500" />
                        </button>
                        <button
                          onClick={() => handleExport(project)}
                          className="p-1.5 hover:bg-ink-100 rounded"
                          title="导出"
                        >
                          <Download className="w-4 h-4 text-ink-500" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(project.id)}
                          className="p-1.5 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {showDeleteConfirm === project.id && (
                      <div className="mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm text-red-700 mb-2">确定要删除这个项目吗？此操作不可恢复。</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="flex-1 py-1.5 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                          >
                            确定删除
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 py-1.5 bg-white text-ink-600 text-sm rounded border border-ink-200 hover:bg-ink-50"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-ink-600">
                        <User className="w-3.5 h-3.5 text-ink-400" />
                        <span className="truncate">被采访人：{project.interviewee || '未填写'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-600">
                        <MapPin className="w-3.5 h-3.5 text-ink-400" />
                        <span className="truncate">地点：{project.location || '未填写'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-ink-600">
                        <Calendar className="w-3.5 h-3.5 text-ink-400" />
                        <span>采访日期：{project.interviewDate || '未填写'}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-ink-100">
                      <div className="flex items-center justify-between text-xs text-ink-500">
                        <span>{project.paragraphs.length} 段内容</span>
                        <span>更新于 {formatDate(project.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="bg-gradient-to-r from-primary-50 to-primary-100 px-5 py-3 cursor-pointer hover:from-primary-100 hover:to-primary-200 transition-colors"
                    onClick={() => navigate(`/editor/${project.id}`)}
                  >
                    <div className="flex items-center justify-between text-sm text-primary-700">
                      <span>点击进入编辑</span>
                      <span className="flex items-center gap-1">
                        继续编辑
                        <Edit2 className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
