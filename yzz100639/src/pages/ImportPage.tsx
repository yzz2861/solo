import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '@/store/useScanStore'
import { FileText, Upload, Zap, Shield, BarChart3, AlertTriangle } from 'lucide-react'

const DEMO_TEXT = `讯联科技发布2026年度战略：行业第一的AI平台全面领先

讯联科技今日在京举行发布会，宣布公司已稳居行业第一，其AI平台在全球市场全面领先。公司董事长张明表示，讯联的AI技术已经颠覆了传统行业格局，革命性地改变了企业运营方式。

2025年，公司营收增长35.6%，市场份额达到28.3%，用户规模突破5亿。公司荣获"中国科技创新领军企业"称号，并被评为"全球AI技术最具影响力品牌"。

讯联科技CEO李华指出，我们的技术是独一无二的，竞争对手无法超越。客户反馈显示，97%的用户认为讯联的产品无与伦比。

公司市场部负责人强调，讯联将彻底改变行业生态，重新定义智能运营的标准。据内部统计，平台日处理数据量达10PB，但业内分析师对此数据持保留态度。

讯联科技的解决方案已实现里程碑式突破，开创了智能决策的新纪元。`

export default function ImportPage() {
  const [text, setText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const startScan = useScanStore(s => s.startScan)
  const navigate = useNavigate()

  const handleScan = useCallback(() => {
    if (!text.trim()) return
    startScan(text)
    setTimeout(() => navigate('/scan'), 100)
  }, [text, startScan, navigate])

  const handleDemo = useCallback(() => {
    setText(DEMO_TEXT)
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    if (file.type === 'text/plain') {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const content = ev.target?.result as string
        if (content) setText(content)
      }
      reader.readAsText(file)
    }
  }, [])

  const charCount = text.length

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col">
      <header className="border-b border-white/5 px-8 py-5">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8F65] flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">新闻稿敏感表述提示</h1>
            <p className="text-xs text-white/40">导入稿件，识别风险，一键改写</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="max-w-3xl w-full">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
              导入新闻稿，开始合规扫描
            </h2>
            <p className="text-white/50 text-sm">
              粘贴文本或拖拽 .txt 文件，识别绝对化表述、涉政敏感、数据缺来源和夸大措辞
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { icon: AlertTriangle, label: '绝对化表述', color: 'text-red-400', bg: 'bg-red-400/10' },
              { icon: Shield, label: '涉政敏感', color: 'text-rose-400', bg: 'bg-rose-400/10' },
              { icon: BarChart3, label: '数据缺来源', color: 'text-amber-400', bg: 'bg-amber-400/10' },
              { icon: Zap, label: '夸大表述', color: 'text-orange-400', bg: 'bg-orange-400/10' },
            ].map(({ icon: Icon, label, color, bg }) => (
              <div key={label} className={`${bg} rounded-xl px-3 py-3 flex items-center gap-2.5 border border-white/5`}>
                <Icon className={`w-4 h-4 ${color}`} />
                <span className="text-xs text-white/70 font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div
            className={`relative rounded-2xl border transition-all duration-300 ${
              isDragging
                ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-[0_0_40px_rgba(255,107,53,0.1)]'
                : 'border-white/10 bg-[#12122A] hover:border-white/20'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="在此粘贴新闻稿全文..."
              className="w-full h-72 bg-transparent text-white/90 text-sm leading-relaxed p-5 resize-none focus:outline-none placeholder:text-white/20 font-['Noto_Sans_SC',sans-serif]"
            />

            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#0D0D1A]/80 rounded-2xl">
                <div className="flex items-center gap-3 text-[#FF6B35]">
                  <Upload className="w-6 h-6" />
                  <span className="font-medium">释放文件以导入</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/30">
                  <FileText className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  {charCount} 字
                </span>
                {text.length === 0 && (
                  <button
                    onClick={handleDemo}
                    className="text-xs text-white/30 hover:text-[#FF6B35] transition-colors"
                  >
                    加载示例稿件
                  </button>
                )}
              </div>
              <button
                onClick={handleScan}
                disabled={!text.trim()}
                className="px-6 py-2 rounded-full bg-gradient-to-r from-[#FF6B35] to-[#FF8F65] text-white text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_24px_rgba(255,107,53,0.3)] transition-all duration-300 active:scale-95"
              >
                开始扫描
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
