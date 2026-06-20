import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScanStore } from '@/store/useScanStore'
import type { ExportItem, RiskCategory, QuoteCategory } from '@/engine/types'
import { RISK_CATEGORY_LABELS, RISK_SEVERITY_LABELS, QUOTE_CATEGORY_LABELS } from '@/engine/types'
import {
  Shield, FileDown, ArrowLeft, Download, Copy,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { useState, useCallback } from 'react'

export default function ExportPage() {
  const navigate = useNavigate()
  const { currentScan, getExportItems } = useScanStore()
  const [copied, setCopied] = useState(false)

  const items = useMemo(() => getExportItems(), [currentScan])

  const handleCopyJSON = useCallback(() => {
    const exportData = items.map(item => ({
      行号: item.lineNumber,
      原句: item.originalSentence,
      风险类型: RISK_CATEGORY_LABELS[item.riskCategory as RiskCategory],
      严重等级: RISK_SEVERITY_LABELS[item.severity],
      改写建议: item.rewriteSuggestion,
      确认状态: item.confirmed ? '已确认保留' : '待处理',
      引用分类: QUOTE_CATEGORY_LABELS[item.quoteCategory as QuoteCategory],
    }))
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [items])

  const handleCopyText = useCallback(() => {
    const lines = items.map(item =>
      `[L${item.lineNumber}] ${item.originalSentence}\n` +
      `  风险: ${RISK_CATEGORY_LABELS[item.riskCategory as RiskCategory]} | ` +
      `${RISK_SEVERITY_LABELS[item.severity]} | ` +
      `${item.confirmed ? '已确认' : '待处理'}\n` +
      `  建议: ${item.rewriteSuggestion}\n` +
      `  引用: ${QUOTE_CATEGORY_LABELS[item.quoteCategory as QuoteCategory]}`
    )
    navigator.clipboard.writeText(lines.join('\n\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [items])

  if (!currentScan) {
    navigate('/')
    return null
  }

  const unconfirmed = items.filter(i => !i.confirmed)
  const confirmed = items.filter(i => i.confirmed)

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex flex-col">
      <header className="border-b border-white/5 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/scan')}
              className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF6B35] to-[#FF8F65] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">修订建议导出</h1>
              <p className="text-[10px] text-white/30">
                {items.length} 条风险 · {unconfirmed.length} 待处理 · {confirmed.length} 已确认
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-white/50 hover:bg-white/10 transition-all flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3" />
              复制文本
            </button>
            <button
              onClick={handleCopyJSON}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#FF6B35] text-white hover:bg-[#FF6B35]/80 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" />
              导出 JSON
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-5xl mx-auto">
          {copied && (
            <div className="fixed top-6 right-6 bg-[#4ECDC4] text-[#0D0D1A] px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-bounce z-50">
              已复制到剪贴板
            </div>
          )}

          <div className="rounded-xl border border-white/5 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/3 border-b border-white/5">
                  <th className="px-4 py-3 text-left text-white/40 font-medium w-12">行号</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium">原句</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium w-28">风险类型</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium w-20">等级</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium w-56">改写建议</th>
                  <th className="px-4 py-3 text-left text-white/40 font-medium w-24">引用分类</th>
                  <th className="px-4 py-3 text-center text-white/40 font-medium w-20">状态</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-white/3 ${item.confirmed ? 'opacity-40' : 'hover:bg-white/2'}`}
                  >
                    <td className="px-4 py-3 text-white/30 font-mono">L{item.lineNumber}</td>
                    <td className="px-4 py-3 text-white/70 leading-5 max-w-xs">
                      <p className="line-clamp-2">{item.originalSentence}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        item.riskCategory === 'absolute' ? 'bg-red-400/10 text-red-400' :
                        item.riskCategory === 'political' ? 'bg-rose-400/10 text-rose-400' :
                        item.riskCategory === 'data_source' ? 'bg-amber-400/10 text-amber-400' :
                        'bg-orange-400/10 text-orange-400'
                      }`}>
                        {RISK_CATEGORY_LABELS[item.riskCategory as RiskCategory]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-medium ${
                        item.severity === 'high' ? 'text-red-400' :
                        item.severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {RISK_SEVERITY_LABELS[item.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/40 leading-4 max-w-xs">
                      <p className="line-clamp-2">{item.rewriteSuggestion}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                        item.quoteCategory === 'leadership_quote' ? 'bg-purple-400/10 text-purple-300 border-purple-400/20' :
                        item.quoteCategory === 'customer_testimonial' ? 'bg-blue-400/10 text-blue-300 border-blue-400/20' :
                        item.quoteCategory === 'historical_honor' ? 'bg-yellow-400/10 text-yellow-300 border-yellow-400/20' :
                        'bg-white/5 text-white/30 border-white/10'
                      }`}>
                        {QUOTE_CATEGORY_LABELS[item.quoteCategory as QuoteCategory]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {item.confirmed ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4ECDC4] mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-white/20 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {confirmed.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-[#4ECDC4]/5 border border-[#4ECDC4]/10">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-[#4ECDC4]" />
                <span className="text-sm font-medium text-[#4ECDC4]">已确认保留 ({confirmed.length})</span>
              </div>
              <p className="text-xs text-white/40">
                以下 {confirmed.length} 条风险已被人工确认保留，在重新扫描时不会重复报错
              </p>
              <div className="mt-3 space-y-2">
                {confirmed.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-white/30">
                    <span className="font-mono shrink-0">L{item.lineNumber}</span>
                    <span className="line-through">{item.originalSentence}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
