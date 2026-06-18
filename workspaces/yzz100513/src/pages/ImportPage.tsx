import { useState, useRef } from 'react'
import { ArrowLeft, Upload, FileText, User, MapPin, Calendar, Clock, Sparkles, AlertCircle, CheckCircle, Wand2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Transcript } from '@/types'
import { useTranscriptStore } from '@/store/useTranscriptStore'
import { processText } from '@/utils/parser'
import { sampleTranscript, sampleMetadata } from '@/data/sampleData'

export function ImportPage() {
  const navigate = useNavigate()
  const { createProject } = useTranscriptStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    title: '',
    interviewee: '',
    interviewer: '',
    interviewDate: new Date().toISOString().split('T')[0],
    location: '',
    duration: '',
    heritageType: '',
    description: ''
  })

  const [textContent, setTextContent] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.txt')) {
      setError('请上传 TXT 格式的文本文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setTextContent(content)
      setError(null)

      if (!formData.title) {
        const fileName = file.name.replace(/\.txt$/i, '')
        setFormData(prev => ({ ...prev, title: fileName }))
      }
    }
    reader.onerror = () => {
      setError('文件读取失败，请重试')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.txt')) {
      setError('请拖入 TXT 格式的文本文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setTextContent(content)
      setError(null)

      if (!formData.title) {
        const fileName = file.name.replace(/\.txt$/i, '')
        setFormData(prev => ({ ...prev, title: fileName }))
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleProcess = async () => {
    if (!formData.title.trim()) {
      setError('请输入项目标题')
      return
    }

    if (!textContent.trim()) {
      setError('请粘贴文本内容或上传 TXT 文件')
      return
    }

    setIsProcessing(true)
    setError(null)
    setProgress(0)

    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      setProgress(30)

      await new Promise(resolve => setTimeout(resolve, 200))
      setProgress(60)

      const metadata: Partial<Transcript> = {
        ...formData,
        language: 'zh-CN'
      }

      const project = processText(textContent, metadata)

      await new Promise(resolve => setTimeout(resolve, 200))
      setProgress(100)

      const projectId = await createProject(project)

      await new Promise(resolve => setTimeout(resolve, 500))

      navigate(`/editor/${projectId}`)
    } catch (err) {
      setError('处理失败：' + (err as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }

  const paragraphCount = textContent.trim()
    ? textContent.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
    : 0

  return (
    <div className="min-h-screen bg-paper bg-paper-texture">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ink-600" />
          </button>
          <div>
            <h1 className="text-2xl font-kai text-ink-800">导入口述史文本</h1>
            <p className="text-ink-500">填写基本信息，粘贴或上传采访文本</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-ink-100 p-6">
              <h2 className="font-kai text-lg text-ink-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                基本信息
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">
                    项目标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="例如：XX技艺传承人访谈记录"
                    className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-ink-400" />
                      被采访人
                    </label>
                    <input
                      type="text"
                      name="interviewee"
                      value={formData.interviewee}
                      onChange={handleInputChange}
                      placeholder="传承人姓名"
                      className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-ink-400" />
                      采访人
                    </label>
                    <input
                      type="text"
                      name="interviewer"
                      value={formData.interviewer}
                      onChange={handleInputChange}
                      placeholder="采访者姓名"
                      className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-ink-400" />
                      采访日期
                    </label>
                    <input
                      type="date"
                      name="interviewDate"
                      value={formData.interviewDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-ink-400" />
                      时长
                    </label>
                    <input
                      type="text"
                      name="duration"
                      value={formData.duration}
                      onChange={handleInputChange}
                      placeholder="例如：1小时30分钟"
                      className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-ink-400" />
                    采访地点
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="例如：浙江省XX市XX村"
                    className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">
                    非遗类型
                  </label>
                  <select
                    name="heritageType"
                    value={formData.heritageType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400"
                  >
                    <option value="">请选择</option>
                    <option value="传统技艺">传统技艺</option>
                    <option value="传统美术">传统美术</option>
                    <option value="传统音乐">传统音乐</option>
                    <option value="传统舞蹈">传统舞蹈</option>
                    <option value="传统戏剧">传统戏剧</option>
                    <option value="传统医药">传统医药</option>
                    <option value="民间文学">民间文学</option>
                    <option value="其他">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">
                    项目描述
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="简要描述本次采访的背景和目的..."
                    className="w-full px-4 py-2 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-ink-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-kai text-lg text-ink-800 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary-600" />
                  文本内容
                </h2>
                <button
                  onClick={() => {
                    setTextContent(sampleTranscript)
                    setFormData(prev => ({
                      ...prev,
                      title: sampleMetadata.title,
                      interviewee: sampleMetadata.interviewee,
                      interviewer: sampleMetadata.interviewer,
                      interviewDate: sampleMetadata.interviewDate,
                      location: sampleMetadata.interviewLocation,
                      duration: sampleMetadata.audioDuration,
                    }))
                    setError(null)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 transition-colors"
                >
                  <Wand2 className="w-4 h-4" />
                  加载示例数据
                </button>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-primary-400 bg-primary-50'
                    : textContent
                    ? 'border-green-300 bg-green-50'
                    : 'border-ink-200 hover:border-primary-300 hover:bg-ink-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {textContent ? (
                  <div className="flex items-center justify-center gap-3 text-green-600">
                    <CheckCircle className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-medium">已加载文本</div>
                      <div className="text-sm text-green-600/80">
                        共 {paragraphCount} 个段落，{textContent.length} 字
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-ink-400 mx-auto mb-3" />
                    <p className="text-ink-600 mb-1">点击或拖拽上传 TXT 文件</p>
                    <p className="text-sm text-ink-400">或在下方直接粘贴文本</p>
                  </>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  粘贴文本内容
                </label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="将采访文本粘贴到此处...

提示：段落之间请用空行分隔，系统会自动按空行分段。"
                  rows={12}
                  className="w-full px-4 py-3 border border-ink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 resize-none font-serif text-ink-800 leading-relaxed"
                />
              </div>

              {textContent && (
                <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
                  <span>预计分段数：{paragraphCount} 段</span>
                  <span>字数：{textContent.length} 字</span>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 font-medium">处理出错</p>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-primary-800 font-medium mb-1">智能处理说明</p>
                  <ul className="text-sm text-primary-700/80 space-y-1">
                    <li>• 自动按空行分段</li>
                    <li>• 基于关键词自动分类到5个章节</li>
                    <li>• 自动抽取人物、地名、技法、原话等实体</li>
                    <li>• 自动检测听不清、多称呼、时间跳跃等不确定内容</li>
                  </ul>
                </div>
              </div>
            </div>

            {isProcessing && (
              <div className="bg-white border border-ink-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-ink-700 font-medium">正在智能处理文本...</span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-ink-500 mt-2 text-right">{progress}%</div>
              </div>
            )}

            <button
              onClick={handleProcess}
              disabled={isProcessing || !textContent.trim() || !formData.title.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <Sparkles className="w-5 h-5" />
              {isProcessing ? '处理中...' : '开始智能处理'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
