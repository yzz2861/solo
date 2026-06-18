import { useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useReviewStore } from '../store/useReviewStore'
import { VIOLATION_META, SEVERITY_META, EXEMPTION_META } from '../types'
import { StatusBadge } from '../components/Tags'

export default function RecheckPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const getSession = useReviewStore(s => s.getSession)
  const anchors = useReviewStore(s => s.anchors)
  const productLines = useReviewStore(s => s.productLines)
  const setRecheckPassed = useReviewStore(s => s.setRecheckPassed)
  const setViolationCorrection = useReviewStore(s => s.setViolationCorrection)

  const session = sessionId ? getSession(sessionId) : undefined
  const anchor = session ? anchors.find(a => a.id === session.anchorId) : undefined
  const pl = session ? productLines.find(p => p.id === session.productLineId) : undefined

  const [checks, setChecks] = useState<Record<string, boolean>>({})

  const toCheckList = useMemo(() => {
    if (!session) return []
    return session.violations
      .filter(v => !v.exemption)
      .sort((a, b) => a.lineNumber - b.lineNumber)
  }, [session])

  const allChecked = useMemo(() => {
    return toCheckList.every(v => checks[v.id] || v.correction?.isDone)
  }, [toCheckList, checks])

  const checkedCount = useMemo(() => {
    return toCheckList.filter(v => checks[v.id] || v.correction?.isDone).length
  }, [toCheckList, checks])

  if (!session) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-600">场次不存在</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">返回列表</Link>
      </div>
    )
  }

  const toggle = (id: string) => {
    setChecks(c => ({ ...c, [id]: !c[id] }))
    setViolationCorrection(session.id, id, { isDone: true })
  }

  const handleMarkAll = () => {
    const patch: Record<string, boolean> = {}
    toCheckList.forEach(v => { patch[v.id] = true })
    setChecks(patch)
  }

  const handlePass = () => {
    if (!confirm(`确认本场所有${toCheckList.length}项违规已整改到位？标记后将自动流转为「已完成」状态。`)) return
    toCheckList.forEach(v => setViolationCorrection(session.id, v.id, { isDone: true }))
    setRecheckPassed(session.id, true)
    alert('✅ 复播检查通过！场次状态已更新为「已完成」。')
  }

  const handleFail = () => {
    if (!confirm('本场整改未通过，将继续停留在「待整改」状态，请主播重新整改。')) return
    setRecheckPassed(session.id, false)
    alert('已记录：整改未通过，请主播对照清单重新修改。')
  }

  const rate = toCheckList.length > 0 ? Math.round(checkedCount / toCheckList.length * 100) : 100

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <Link to={`/review/${session.id}`} className="text-sm text-brand-500 hover:underline">← 返回审查工作台</Link>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">🔍 复播前整改检查</h2>
          <p className="text-sm text-slate-500 mt-1">
            对照原违规清单，逐条核实主播整改是否到位 · 检查通过后场次闭环
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={session.status} />
          {session.recheckPassed && <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200">✓ 曾通过复播</span>}
        </div>
      </div>

      <div className="card p-6 grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
        <div className="md:col-span-1 flex items-center gap-4">
          <img src={anchor?.avatar} className="w-16 h-16 rounded-xl border-4 border-slate-100" />
          <div>
            <div className="font-bold text-slate-900 text-lg">{anchor?.name}</div>
            <div className="text-sm text-slate-500">{session.title}</div>
          </div>
        </div>
        <div className="md:col-span-1">
          <div className="text-xs text-slate-500 mb-1">商品线</div>
          <div className="font-semibold" style={{ color: pl?.color }}>{pl?.name}</div>
          <div className="text-xs text-slate-500 mt-2 mb-1">直播日期</div>
          <div className="font-medium text-slate-700">{session.liveDate}</div>
        </div>
        <div className="md:col-span-1">
          <div className="text-xs text-slate-500 mb-1">需检查项</div>
          <div className="text-2xl font-black text-risk-medium">{toCheckList.length}</div>
          <div className="text-xs text-slate-500 mt-2 mb-1">已豁免项</div>
          <div className="font-medium text-slate-700">{session.violations.filter(v => v.exemption).length} 项（无需检查）</div>
        </div>
        <div className="md:col-span-1">
          <div className="text-xs text-slate-500 mb-2">检查进度</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-amber-500 to-emerald-500"
                style={{ width: `${rate}%` }}
              />
            </div>
            <div className={`text-2xl font-black ${rate === 100 ? 'text-risk-ok' : 'text-amber-600'}`}>
              {rate}%
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2">{checkedCount} / {toCheckList.length} 项已确认</div>
        </div>
      </div>

      <div className="card p-4 flex items-center justify-between flex-wrap gap-3 bg-gradient-to-r from-violet-50 to-blue-50 border-violet-200">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <div className="font-semibold text-slate-800">复播检查说明</div>
            <div className="text-xs text-slate-600">请逐项对照整改方案，要求主播复播时口述规范版本，确认不再使用违规表述。</div>
          </div>
        </div>
        <button onClick={handleMarkAll} className="btn-secondary text-sm">
          ✅ 一键全部确认已整改
        </button>
      </div>

      <div className="space-y-3">
        {toCheckList.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <p className="text-slate-700 font-medium">本场次无需要检查的整改项</p>
            <p className="text-sm text-slate-500 mt-1">所有违规点都已豁免，可直接标记通过</p>
            <button onClick={handlePass} className="btn-primary mt-5">标记为已完成</button>
          </div>
        ) : toCheckList.map((v, i) => {
          const meta = VIOLATION_META[v.type]
          const sev = SEVERITY_META[v.severity]
          const done = checks[v.id] || v.correction?.isDone
          return (
            <div
              key={v.id}
              className={`card p-5 transition-all ${done ? 'opacity-70 bg-emerald-50/40' : ''}`}
              style={done ? { borderLeft: `4px solid #10B981` } : { borderLeft: `4px solid ${meta.color}` }}
            >
              <div className="flex items-start gap-4">
                <label className="flex-shrink-0 cursor-pointer pt-0.5">
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => toggle(v.id)}
                    className="w-5 h-5 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                  />
                </label>

                <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold"
                     style={{ backgroundColor: done ? '#10B981' : meta.color }}>
                  {done ? '✓' : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="badge" style={{ backgroundColor: meta.color + '1A', color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className={`badge ${sev.color}`}>严重度：{sev.label}</span>
                    <span className="text-xs text-slate-500">第 {v.lineNumber} 行</span>
                    {v.exemption && (
                      <span className="badge bg-slate-100 text-slate-600">
                        {EXEMPTION_META[v.exemption.reason].icon} {EXEMPTION_META[v.exemption.reason].label}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                      <div className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1.5">
                        ❌ 原违规表述
                      </div>
                      <p className="text-sm text-slate-800">「{v.originalText}」</p>
                      <p className="text-xs text-slate-500 mt-2">匹配词：<code className="bg-white px-1.5 py-0.5 rounded border border-red-200">{v.matchedKeyword}</code></p>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <div className="text-xs font-semibold text-emerald-700 mb-1.5 flex items-center gap-1.5">
                        ✅ 整改方案
                      </div>
                      {v.correction?.correctedText ? (
                        <>
                          <p className="text-sm text-slate-800 font-medium">「{v.correction.correctedText}」</p>
                          {v.correction.reviewerNote && (
                            <p className="text-xs text-slate-500 mt-2">备注：{v.correction.reviewerNote}</p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-700 bg-white/60 px-2 py-1 rounded border border-emerald-200/60">
                            💡 系统建议：{v.suggestion}
                          </p>
                          <p className="text-xs text-amber-600">⚠️ 合规尚未填写具体整改方案，请先在工作台填写。</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-xs font-semibold text-slate-700 mb-1">📜 违规依据</div>
                    <div className="text-xs text-slate-600">{v.ruleBasis}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="sticky bottom-4 bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-xl flex items-center justify-between flex-wrap gap-3 z-20">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${allChecked ? 'bg-risk-ok animate-pulse' : 'bg-amber-500'}`} />
          <span className="text-sm text-slate-600">
            {allChecked
              ? '✅ 全部整改项已核实，可标记通过'
              : `⏳ 还剩 ${toCheckList.length - checkedCount} 项需要确认`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/review/${session.id}`} className="btn-ghost">返回审查工作台</Link>
          <button onClick={handleFail} className="btn-secondary text-risk-medium border-risk-medium">
            ❌ 整改未通过
          </button>
          <button
            onClick={handlePass}
            disabled={!allChecked}
            className="btn-primary bg-risk-ok hover:bg-emerald-600"
          >
            🎯 确认整改通过，标记完成
          </button>
        </div>
      </div>
    </div>
  )
}
