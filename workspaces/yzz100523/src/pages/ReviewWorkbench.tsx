import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { useReviewStore } from '../store/useReviewStore'
import { VIOLATION_META, SEVERITY_META, STATUS_META } from '../types'
import type { ViolationType, ExemptionReason, Severity } from '../types'
import { StatusBadge, ViolationTag, SeverityTag } from '../components/Tags'
import TranscriptAnnotator from '../components/TranscriptAnnotator'
import ViolationCard from '../components/ViolationCard'
import {
  exportInternalReport, exportAnchorChecklist, exportSessionBackup,
  generateInternalReport, generateAnchorChecklist,
} from '../lib/exportUtils'

export default function ReviewWorkbench() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const getSession = useReviewStore(s => s.getSession)
  const productLines = useReviewStore(s => s.productLines)
  const anchors = useReviewStore(s => s.anchors)
  const runDetection = useReviewStore(s => s.runDetection)
  const saveSession = useReviewStore(s => s.saveSession)
  const updateSessionStatus = useReviewStore(s => s.updateSessionStatus)
  const setViolationExemption = useReviewStore(s => s.setViolationExemption)
  const setViolationCorrection = useReviewStore(s => s.setViolationCorrection)
  const resetViolations = useReviewStore(s => s.resetViolations)

  const session = sessionId ? getSession(sessionId) : undefined
  const pl = session ? productLines.find(p => p.id === session.productLineId) : undefined
  const anchor = session ? anchors.find(a => a.id === session.anchorId) : undefined

  const [selectedId, setSelectedId] = useState<string | undefined>()
  const [filterType, setFilterType] = useState<ViolationType | 'all'>('all')
  const [filterReviewed, setFilterReviewed] = useState<'all' | 'pending' | 'confirmed' | 'exempt'>('all')
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all')
  const [showExport, setShowExport] = useState(false)
  const [detecting, setDetecting] = useState(false)

  const violations = session?.violations ?? []

  useEffect(() => {
    if (session && violations.length === 0 && !detecting) {
      // Auto-run detection first time if empty
      handleDetect(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      if (filterType !== 'all' && v.type !== filterType) return false
      if (filterSeverity !== 'all' && v.severity !== filterSeverity) return false
      if (filterReviewed === 'pending' && v.reviewed) return false
      if (filterReviewed === 'confirmed' && (!v.reviewed || v.exemption)) return false
      if (filterReviewed === 'exempt' && !v.exemption) return false
      return true
    })
  }, [violations, filterType, filterReviewed, filterSeverity])

  const stats = useMemo(() => {
    const total = violations.length
    const exempt = violations.filter(v => v.exemption).length
    const confirmed = violations.filter(v => v.reviewed && !v.exemption).length
    const corrected = violations.filter(v => !v.exemption && v.correction?.isDone).length
    const toReview = violations.filter(v => !v.reviewed).length
    const toCorrect = violations.filter(v => !v.exemption && !v.correction?.isDone && v.reviewed).length
    return { total, exempt, confirmed, corrected, toReview, toCorrect }
  }, [violations])

  if (!session) {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-3">😵</div>
        <p className="text-slate-600">场次不存在或已被删除</p>
        <Link to="/" className="btn-primary mt-4">返回首页</Link>
      </div>
    )
  }

  function handleDetect(silent = false) {
    if (!session) return
    setDetecting(true)
    setTimeout(() => {
      runDetection(session.id)
      setDetecting(false)
      if (!silent) {
        // success hint - for now just status
      }
    }, 700)
  }

  function handleSave() {
    if (!session) return
    saveSession(session.id)
    alert('✅ 已保存！状态将根据违规复核和整改完成情况自动更新。')
  }

  function scrollToViolation(id: string) {
    setSelectedId(id)
    const el = document.querySelector(`[data-violation-card="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const selectedV = selectedId ? violations.find(v => v.id === selectedId) : undefined

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-5 flex flex-wrap items-center gap-4 sticky top-[72px] z-20">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 text-slate-600"
            title="返回列表"
          >
            ←
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 truncate">{session.title}</h2>
              <StatusBadge status={session.status} />
              {session.recheckPassed && <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">✓ 复播合格</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span style={{ color: pl?.color }}>■ {pl?.name}</span>
              <img src={anchor?.avatar} className="w-4 h-4 rounded-full" />
              <span>{anchor?.name}</span>
              <span>📅 {session.liveDate}</span>
              <span>🕒 创建于 {dayjs(session.createdAt).format('MM-DD HH:mm')}</span>
              <span>· 最近更新 {dayjs(session.updatedAt).fromNow()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleSave} className="btn-primary gap-2">
            💾 保存
          </button>
          <button
            onClick={() => handleDetect(false)}
            className="btn-secondary gap-2"
            disabled={detecting}
          >
            {detecting ? '🔍 检测中...' : '🔄 重新检测'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExport(s => !s)}
              className="btn-secondary gap-2"
              disabled={session.violations.length === 0}
            >
              📤 导出 ▾
            </button>
            {showExport && (
              <div className="absolute right-0 top-12 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 w-64 animate-slide-up">
                <button
                  onClick={() => { setShowExport(false); exportInternalReport(session, pl, anchor) }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                >
                  <div className="font-medium text-sm">📋 内部证据版</div>
                  <div className="text-xs text-slate-500">含原句位置、规则依据、豁免备注</div>
                </button>
                <button
                  onClick={() => { setShowExport(false); exportAnchorChecklist(session, anchor) }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                >
                  <div className="font-medium text-sm">🎤 主播整改清单（精简）</div>
                  <div className="text-xs text-slate-500">给主播的问题+整改说法清单</div>
                </button>
                <button
                  onClick={() => { setShowExport(false); exportSessionBackup(session) }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                >
                  <div className="font-medium text-sm">💾 JSON 完整备份</div>
                  <div className="text-xs text-slate-500">可导入/迁移数据</div>
                </button>
                <button
                  onClick={() => {
                    setShowExport(false)
                    alert('【内部证据版预览】\n\n' + generateInternalReport(session, pl, anchor).slice(0, 2000) + '\n\n...（完整内容将在导出文件中展示）')
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50"
                >
                  <div className="font-medium text-sm">👀 预览内部报告</div>
                  <div className="text-xs text-slate-500">弹窗展示（前2000字）</div>
                </button>
              </div>
            )}
          </div>
          {session.status === 'PENDING_CORRECTION' && (
            <Link
              to={`/recheck/${session.id}`}
              className="btn-danger !bg-violet-600 hover:!bg-violet-700 gap-2"
            >
              🔍 复播检查
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <TopStat label="总违规点" value={stats.total} sub="" color="bg-slate-500" />
        <TopStat
          label={`待复核 (${stats.toReview})`}
          value={stats.confirmed}
          sub={`豁免 ${stats.exempt}`}
          color="bg-amber-500"
          progress={stats.total > 0 ? Math.round((stats.confirmed + stats.exempt) / stats.total * 100) : 0}
        />
        <TopStat
          label="待整改"
          value={stats.toCorrect}
          sub={`已整改 ${stats.corrected}`}
          color="bg-orange-500"
          progress={stats.confirmed > 0 ? Math.round(stats.corrected / Math.max(1, stats.confirmed) * 100) : 0}
        />
        <TopStat
          label="闭环完成率"
          value={`${stats.total > 0 ? Math.round((stats.exempt + stats.corrected) / stats.total * 100) : 100}%`}
          sub="豁免+已整改 / 总违规"
          color="bg-emerald-500"
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7 space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <span>📝</span> 原文标注视图
                <span className="text-xs font-normal text-slate-500">
                  （{session.transcript.split('\n').length} 行 · {session.transcript.length} 字）
                </span>
              </h3>
              <Legend />
            </div>
            <TranscriptAnnotator
              text={session.transcript}
              violations={filteredViolations.length === violations.length ? violations : filteredViolations}
              selectedId={selectedId}
              onSelect={scrollToViolation}
            />
          </div>

          {selectedV && (
            <div className="card p-4 border-2" style={{ borderColor: VIOLATION_META[selectedV.type].color + '55' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-slate-700">📍 当前定位详情</span>
                <ViolationTag type={selectedV.type} size="md" />
                <SeverityTag severity={selectedV.severity} />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">原句定位</div>
                  <div className="font-mono">第 {selectedV.lineNumber} 行 · [{selectedV.startOffset}:{selectedV.endOffset}]</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <div className="text-xs text-slate-500 mb-1">匹配关键词</div>
                  <div className="font-mono font-bold text-risk-medium">{selectedV.matchedKeyword}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-5 space-y-3">
          <div className="card p-4 space-y-3 sticky top-[180px]">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <span>⚠️</span> 违规列表
                <span className="badge bg-slate-100 text-slate-700">{filteredViolations.length}/{violations.length}</span>
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select className="input text-xs !py-1.5" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
                <option value="all">全部类型</option>
                {Object.entries(VIOLATION_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select className="input text-xs !py-1.5" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value as any)}>
                <option value="all">全部严重度</option>
                {Object.entries(SEVERITY_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select className="input text-xs !py-1.5" value={filterReviewed} onChange={e => setFilterReviewed(e.target.value as any)}>
                <option value="all">全部状态</option>
                <option value="pending">待复核</option>
                <option value="confirmed">已确认</option>
                <option value="exempt">已豁免</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-480px)] overflow-y-auto scrollbar-thin pr-1 pb-4">
            {filteredViolations.length === 0 ? (
              <div className="card p-10 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-sm text-slate-600">
                  {violations.length === 0 ? '暂无违规，保持良好！' : '当前筛选条件下无记录'}
                </div>
                {violations.length === 0 && (
                  <button onClick={() => handleDetect(false)} className="btn-secondary mt-4 text-sm">
                    重新运行检测
                  </button>
                )}
              </div>
            ) : (
              filteredViolations.map((v, i) => (
                <div key={v.id} data-violation-card={v.id} onMouseEnter={() => setSelectedId(v.id)}>
                  <ViolationCard
                    violation={v}
                    index={violations.indexOf(v)}
                    selected={selectedId === v.id}
                    onSelect={() => scrollToViolation(v.id)}
                    onSetExemption={(reason, note) => setViolationExemption(session.id, v.id, reason, note)}
                    onSetCorrection={(data) => setViolationCorrection(session.id, v.id, data)}
                  />
                </div>
              ))
            )}
          </div>

          <div className="card p-4 bg-amber-50/50 border-amber-200">
            <div className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
              💡 合规小贴士
            </div>
            <ul className="text-xs text-amber-900/80 space-y-1.5 list-disc pl-4">
              <li>标记豁免时务必备注原因，这将作为内部审计证据</li>
              <li>主播版整改清单仅展示「未豁免」的违规点</li>
              <li>所有修改会在保存后同步更新场次状态（{Object.values(STATUS_META).map(m => m.label).join(' → ')}）</li>
              <li>建议所有修改完成后点击「保存」，状态将自动流转</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between">
              <button
                onClick={() => {
                  if (confirm('确认重置所有违规记录？将清除人工复核结果，需重新检测。')) {
                    resetViolations(session.id)
                  }
                }}
                className="text-xs text-slate-500 hover:text-risk-medium"
              >
                🗑️ 重置违规记录
              </button>
              <button
                onClick={() => updateSessionStatus(session.id, 'PENDING_CORRECTION')}
                className="btn-secondary text-xs !py-1 !px-3"
              >
                标记为「待整改」
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TopStat({ label, value, sub, color, progress }: {
  label: string; value: number | string; sub?: string; color: string; progress?: number
}) {
  return (
    <div className="card p-4 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-slate-500 font-medium">{label}</div>
          <div className={`text-2xl font-black mt-1 ${value === 0 ? 'text-slate-400' : 'text-slate-800'}`}>
            {value}
          </div>
          {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
        </div>
        <div className={`w-3 h-10 rounded-full ${color} opacity-70`} />
      </div>
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-3 flex-wrap text-xs">
      {Object.entries(VIOLATION_META).map(([k, v]) => (
        <div key={k} className="flex items-center gap-1" title={v.label}>
          <span className="w-3 h-3 rounded" style={{ backgroundColor: v.color }} />
          <span className="text-slate-600">{v.label}</span>
        </div>
      ))}
    </div>
  )
}
