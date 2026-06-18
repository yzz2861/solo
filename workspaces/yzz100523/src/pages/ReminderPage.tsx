import { useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { useReviewStore } from '../store/useReviewStore'
import { VIOLATION_META } from '../types'
import type { ViolationType } from '../types'
import { exportReminderSheet, generateReminderSheet, type ReminderSheetData } from '../lib/exportUtils'

export default function ReminderPage() {
  const { productLineId } = useParams<{ productLineId: string }>()
  const navigate = useNavigate()
  const productLines = useReviewStore(s => s.productLines)
  const sessions = useReviewStore(s => s.getSessionsByProductLine(productLineId ?? ''))

  const productLine = productLines.find(p => p.id === productLineId)

  const data = useMemo<ReminderSheetData | null>(() => {
    if (!productLine) return null
    const recentSessions = sessions.slice(-5)
    const allV = recentSessions.flatMap(s => s.violations.filter(v => !v.exemption))
    const map = new Map<ViolationType, number>()
    allV.forEach(v => map.set(v.type, (map.get(v.type) ?? 0) + 1))
    const topViolations = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t, c]) => ({ type: t, count: c }))

    const kwMap = new Map<string, number>()
    allV.forEach(v => v.matchedKeyword.split(' + ').forEach(k => kwMap.set(k, (kwMap.get(k) ?? 0) + 1)))
    const frequentKeywords = Array.from(kwMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k]) => k)

    return { productLine, recentSessions, topViolations, frequentKeywords }
  }, [productLine, sessions])

  if (!productLine || !data) {
    return (
      <div className="card p-12 text-center">
        <p className="text-slate-600">商品线不存在</p>
        <Link to="/dashboard" className="btn-primary mt-4">返回仪表盘</Link>
      </div>
    )
  }

  const handleExport = () => exportReminderSheet(data)
  const handlePrint = () => window.print()
  const handlePreview = () => alert(generateReminderSheet(data))

  const sampleStatements: [string, string][] = [
    ['「全网最低价」', '「本店促销价，限时3天」'],
    ['「100%美白，根治色斑」', '「坚持使用有助于提亮肤色」'],
    ['「治疗便秘，立竿见影」', '「有助于肠道健康蠕动」'],
    ['「最好的，顶级面料」', '「优质面料，亲肤舒适」'],
    ['「免费送！」（无规则）', '「关注+评论，明天6点抽20份」'],
    ['「用了就好，包治百病」', '「效果因人而异，建议坚持使用」'],
    ['「国家级研发团队」', '「获得国内多项研发奖项」'],
    ['「这款可以降血压」', '「适合日常营养补充」'],
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="no-print flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/dashboard" className="text-sm text-brand-500 hover:underline">← 返回仪表盘</Link>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">
            开播重点提醒 · {productLine.name}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            基于 {data.recentSessions.length} 场历史数据生成 · 建议打印后主播签字确认
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePreview} className="btn-secondary">📋 预览文本</button>
          <button onClick={handleExport} className="btn-secondary">📥 导出TXT</button>
          <button onClick={handlePrint} className="btn-primary">🖨️ 打印 / 保存PDF</button>
        </div>
      </div>

      <div
        className="mx-auto bg-white shadow-xl rounded-2xl overflow-hidden"
        style={{ maxWidth: '900px', aspectRatio: '210 / 297', padding: '56px' }}
      >
        <div className="h-full flex flex-col border-4 border-dashed rounded-xl p-8"
             style={{ borderColor: productLine.color + '55' }}>
          <div className="flex items-center justify-between pb-5 border-b-4"
               style={{ borderColor: productLine.color }}>
            <div>
              <div className="text-xs tracking-widest text-slate-500 mb-2">COMPLIANCE REMINDER</div>
              <h1 className="text-3xl font-black text-slate-900" style={{ color: productLine.color }}>
                {productLine.name}
              </h1>
              <div className="text-xl font-bold text-slate-800 mt-1">开播重点提醒单</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">生成日期</div>
              <div className="text-lg font-bold text-slate-800">{dayjs().format('YYYY年MM月DD日')}</div>
              <div className="mt-3 px-3 py-1 rounded-full text-xs font-bold text-white inline-block"
                   style={{ backgroundColor: productLine.color }}>
                内部资料 · 严禁外传
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 my-5">
            <InfoMini label="参考场次" value={`${data.recentSessions.length} 场`} color={productLine.color} />
            <InfoMini label="累计违规" value={`${data.recentSessions.reduce((n, s) => n + s.violations.filter(v => !v.exemption).length, 0)} 条`} color={productLine.color} />
            <InfoMini label="整改完成率" value={`${
              (() => {
                const all = data.recentSessions.flatMap(s => s.violations.filter(v => !v.exemption))
                const done = all.filter(v => v.correction?.isDone).length
                return all.length > 0 ? `${Math.round(done / all.length * 100)}%` : '100%'
              })()
            }`} color={productLine.color} />
          </div>

          <section className="mb-5">
            <SectionTitle n="01" color={productLine.color}>TOP 3 高频违规 · 本场务必注意</SectionTitle>
            <div className="space-y-3 mt-3">
              {data.topViolations.length === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-800 text-center font-semibold">
                  🎉 本商品线近期无违规，保持良好！
                </div>
              ) : data.topViolations.map((tv, i) => {
                const meta = VIOLATION_META[tv.type]
                const icons = ['🔴', '🟠', '🟡']
                return (
                  <div key={tv.type} className="flex items-start gap-3 p-4 rounded-xl"
                       style={{ backgroundColor: meta.color + '10', borderLeft: `4px solid ${meta.color}` }}>
                    <div className="text-2xl">{icons[i]}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-slate-900">第{i + 1}名</span>
                        <span className="font-semibold" style={{ color: meta.color }}>{meta.label}</span>
                        <span className="badge bg-white text-slate-600">累计 {tv.count} 次</span>
                      </div>
                      <div className="text-sm text-slate-700">
                        {principleFor(tv.type)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mb-5">
            <SectionTitle n="02" color={productLine.color}>重点禁用词速查表</SectionTitle>
            <div className="mt-3 p-4 rounded-xl bg-red-50/50 border border-red-200">
              {data.frequentKeywords.length === 0 ? (
                <div className="text-sm text-slate-600 text-center py-2">暂无历史禁用词，继续保持 ✨</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.frequentKeywords.map((k, i) => (
                    <span key={k} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-red-200 shadow-sm">
                      <span className="w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                      <span className="font-bold text-red-700">{k}</span>
                      <span className="text-red-400 text-xs">❌</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mb-5">
            <SectionTitle n="03" color={productLine.color}>典型错误 vs 合规说法</SectionTitle>
            <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              {sampleStatements.map(([bad, good], i) => (
                <div key={i} className="grid grid-cols-2 text-sm odd:bg-slate-50/50">
                  <div className="p-3 flex items-start gap-2 border-r border-slate-100">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs flex items-center justify-center font-bold">✗</span>
                    <span className="text-red-700">{bad}</span>
                  </div>
                  <div className="p-3 flex items-start gap-2">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">✓</span>
                    <span className="text-emerald-800">{good}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-5">
            <SectionTitle n="04" color={productLine.color}>开播前自查 Checklist</SectionTitle>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                '不说"最"字系列：最、第一、顶级、唯一、100%',
                '不说医疗词：治疗、治愈、疗效、根治、消炎',
                '不说价格承诺：最低价、最便宜、买贵双倍退',
                '活动讲清五要素：条件/名额/时间/奖品/开奖',
                '引用用户评价时说"这是用户的反馈"',
                '口误后立即纠正："哦不对，应该是..."',
              ].map((item, i) => (
                <label key={i} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition">
                  <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center">
                    <span className="text-xs opacity-0">✓</span>
                  </div>
                  <span className="text-sm text-slate-700 flex-1">{item}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="mt-auto pt-5 border-t-2" style={{ borderColor: productLine.color + '55' }}>
            <div className="p-5 rounded-xl text-white text-center mb-5"
                 style={{ background: `linear-gradient(135deg, ${productLine.color}, ${productLine.color}dd)` }}>
              <div className="text-xs opacity-80 mb-1">合规一句话口号</div>
              <div className="text-xl font-black tracking-wide">
                不说绝对 · 不说疗效 · 活动讲清楚
              </div>
            </div>
            <div className="grid grid-cols-2 gap-10 pt-3">
              <div>
                <div className="text-xs text-slate-500 mb-8">主播签字确认</div>
                <div className="border-b-2 border-slate-300 pb-2" />
                <div className="text-xs text-slate-500 mt-2">日期：______________</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-8">合规负责人签字</div>
                <div className="border-b-2 border-slate-300 pb-2" />
                <div className="text-xs text-slate-500 mt-2">日期：{dayjs().format('YYYY-MM-DD')}</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="no-print flex items-center justify-center gap-3 py-4">
        <Link to="/dashboard" className="btn-ghost">← 返回仪表盘</Link>
        <button onClick={() => navigate(-1)} className="btn-secondary">返回上一页</button>
      </div>
    </div>
  )
}

function InfoMini({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ backgroundColor: color + '10' }}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-black mt-0.5" style={{ color }}>{value}</div>
    </div>
  )
}

function SectionTitle({ n, color, children }: { n: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white"
           style={{ backgroundColor: color }}>
        {n}
      </div>
      <h2 className="text-lg font-bold text-slate-900">{children}</h2>
    </div>
  )
}

function principleFor(t: ViolationType): string {
  switch (t) {
    case 'MEDICAL_IMPLICATION': return '严禁使用治疗/根治/疗效/消炎等医疗术语，改用「舒缓/改善/调理」等温和表述'
    case 'ABSOLUTE_WORD': return '删除最/第一/顶级/唯一/100%/国家级，改用优质/优选/推荐等主观词'
    case 'PRICE_PROMISE': return '禁止宣称全网最低/最便宜/亏本/史低，标明具体价格和促销期限（如限时3天）'
    case 'FORBIDDEN_EFFECT': return '非特证产品不宣称美白/祛斑/减肥/丰胸/生发，改用提亮/体重管理等'
    case 'UNCLEAR_LOTTERY': return '活动必须说清5要素：参与条件+名额数量+活动时间+奖品明细+开奖方式'
    case 'EXAGGERATION': return '删除疯抢/秒没/闭眼入/人手一件等夸张词，用真实销量数据说明热度'
    default: return '表述谨慎，有疑问先问合规'
  }
}
