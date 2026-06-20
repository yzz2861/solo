import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '@/store/useScanStore'
import { OriginalPanel, ConfirmedSection } from '@/components/OriginalPanel'
import { RiskCard, FilterBar } from '@/components/RiskUI'
import type { RiskCategory } from '@/engine/types'
import { RISK_CATEGORY_LABELS } from '@/engine/types'
import {
  Shield, FileDown, RefreshCw, ArrowLeft,
  CheckCircle2, AlertTriangle, Loader2,
} from 'lucide-react'

export default function ScanPage() {
  const navigate = useNavigate()
  const {
    currentScan, isScanning, filterCategory,
    editingText, setEditingText,
    confirmRisk, unconfirmRisk, setFilterCategory, rescan,
    getFilteredSentences, getRiskSentences,
  } = useScanStore()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showEdit, setShowEdit] = useState(false)

  const filteredSentences = useMemo(() => getFilteredSentences(), [currentScan, filterCategory])
  const allRiskSentences = useMemo(() => getRiskSentences(), [currentScan])
  const confirmedSentences = useMemo(
    () => (currentScan?.sentences || []).filter(s => s.risks.some(r => r.confirmed)),
    [currentScan]
  )

  const counts = useMemo(() => {
    const c: Record<RiskCategory | 'all', number> = { all: 0, absolute: 0, political: 0, data_source: 0, exaggeration: 0 }
    if (!currentScan) return c
    for (const s of allRiskSentences) {
      for (const r of s.risks.filter(r => !r.confirmed)) {
        c[r.category]++
        c.all++
      }
    }
    return c
  }, [currentScan, allRiskSentences])

  if (!currentScan) {
    navigate('/')
    return null
  }

  if (isScanning) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-[#FF6B35]/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#FF6B35] animate-spin" />
            <Shield className="absolute inset-0 m-auto w-8 h-8 text-[#FF6B35]" />
          </div>
          <p className="text-white/70 font-medium mb-1">正在扫描敏感表述...</p>
          <p className="text-white/30 text-xs">逐句分析中，请稍候</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col">
      <header className="border-b border-white/5 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8F65] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">扫描结果</h1>
              <p className="text-[10px] text-white/30">
                {currentScan.sentences.length} 句 · {counts.all} 处风险 · {confirmedSentences.reduce((a, s) => a + s.risks.filter(r => r.confirmed).length, 0)} 已确认
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEdit(!showEdit)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white/50 hover:bg-white/10 transition-all"
            >
              {showEdit ? '查看原文' : '编辑稿件'}
            </button>
            <button
              onClick={() => { rescan() }}
              disabled={isScanning}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#4ECDC4]/15 text-[#4ECDC4] hover:bg-[#4ECDC4]/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              重新扫描
            </button>
            <button
              onClick={() => navigate('/export')}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FF6B35] text-white hover:bg-[#FF6B35]/80 transition-all flex items-center gap-1.5"
            >
              <FileDown className="w-3 h-3" />
              导出修订建议
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[55%] border-r border-white/5 flex flex-col">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs text-white/30 font-medium">原文</span>
            {!showEdit && (
              <div className="flex items-center gap-3 text-[10px] text-white/20">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400/50" />绝对化</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400/50" />涉政</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400/50" />数据</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400/50" />夸大</span>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            {showEdit ? (
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                className="w-full h-full bg-transparent text-white/80 text-xs leading-6 resize-none focus:outline-none font-['Noto_Sans_SC',sans-serif]"
              />
            ) : (
              <OriginalPanel
                sentences={currentScan.sentences}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
          </div>
        </div>

        <div className="w-[45%] flex flex-col">
          <div className="px-4 py-2 border-b border-white/5">
            <FilterBar active={filterCategory} onChange={setFilterCategory} counts={counts} />
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {filteredSentences.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <CheckCircle2 className="w-10 h-10 text-[#4ECDC4] mx-auto mb-3" />
                  <p className="text-white/60 font-medium mb-1">
                    {counts.all === 0 ? '所有风险已清除' : '当前分类无风险'}
                  </p>
                  <p className="text-xs text-white/30">
                    {counts.all === 0 ? '稿件已通过合规检查' : '切换筛选查看其他分类'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSentences.map(sentence =>
                  sentence.risks
                    .filter(r => !r.confirmed && (filterCategory === 'all' || r.category === filterCategory))
                    .map(risk => (
                      <RiskCard
                        key={risk.id}
                        sentence={sentence}
                        risk={risk}
                        onConfirm={() => confirmRisk(sentence.id, risk.id)}
                        onUnconfirm={() => unconfirmRisk(sentence.id, risk.id)}
                      />
                    ))
                )}
              </div>
            )}

            <ConfirmedSection
              sentences={confirmedSentences}
              onUnconfirm={unconfirmRisk}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
