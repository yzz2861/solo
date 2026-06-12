import { useState, useMemo } from 'react'
import {
  Download,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  Star,
  FileText,
  ClipboardList,
  TrendingUp,
} from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import { CATEGORY_LABELS, STATUS_LABELS } from '@/types'
import type { AuditChecklistItem } from '@/types'

function getPriority(item: AuditChecklistItem): number {
  if (item.starred && item.status === 'missing') return 1
  if (item.status === 'missing') return 2
  if (item.status === 'expired') return 3
  return 4
}

function formatToday(): string {
  return new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default function Export() {
  const session = useAuditStore((s) => s.session)
  const [copied, setCopied] = useState(false)

  const stats = useMemo(() => {
    const c = session.checklist
    const total = c.length
    const existing = c.filter((i) => i.status === 'existing').length
    const missing = c.filter((i) => i.status === 'missing').length
    const expired = c.filter((i) => i.status === 'expired').length
    const needsUpdate = c.filter((i) => i.status === 'needs_update').length
    const completionRate = total > 0 ? Math.round((existing / total) * 100) : 0
    const starredTotal = c.filter((i) => i.starred).length
    const starredReady = c.filter((i) => i.starred && i.status === 'existing').length
    return { total, existing, missing, expired, needsUpdate, completionRate, starredTotal, starredReady }
  }, [session.checklist])

  const supplementList = useMemo(() => {
    return session.checklist.filter(
      (item) =>
        item.status === 'missing' ||
        item.status === 'expired' ||
        item.alerts.some((a) => a.severity === 'critical')
    )
  }, [session.checklist])

  const starredItems = useMemo(() => {
    return session.checklist.filter((i) => i.starred)
  }, [session.checklist])

  const sortedSupplement = [...supplementList]
    .map((item) => ({ item, priority: getPriority(item) }))
    .sort((a, b) => a.priority - b.priority)

  const handleExportCSV = () => {
    const BOM = '\uFEFF'
    const header = '优先级,分类,清单项,状态,到期日,提醒事项'
    const rows = sortedSupplement.map(({ item, priority }) => {
      const alerts = item.alerts.map((a) => a.message).join('; ')
      return `${priority},${CATEGORY_LABELS[item.category]},${item.name},${STATUS_LABELS[item.status]},${item.expiryDate || ''},${alerts}`
    })
    const csv = BOM + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `验厂报告_${session.name}_${formatToday()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCopySummary = async () => {
    const lines: string[] = []
    lines.push(`【验厂报告摘要】`)
    lines.push(`会话: ${session.name}`)
    lines.push(`验厂日期: ${session.auditDate || '未设置'}`)
    lines.push(`生成日期: ${formatToday()}`)
    lines.push(``)
    lines.push(`完成率: ${stats.completionRate}%`)
    lines.push(`总计: ${stats.total} | 已有: ${stats.existing} | 缺失: ${stats.missing} | 过期: ${stats.expired} | 需更新: ${stats.needsUpdate}`)
    lines.push(`关注项: ${stats.starredReady}/${stats.starredTotal} 已就绪`)
    lines.push(``)
    if (sortedSupplement.length > 0) {
      lines.push(`【待补充清单】`)
      sortedSupplement.forEach(({ item, priority }) => {
        const alerts = item.alerts.map((a) => a.message).join('; ')
        lines.push(`[${priority}] ${item.name} | ${CATEGORY_LABELS[item.category]} | ${STATUS_LABELS[item.status]}${alerts ? ' | ' + alerts : ''}`)
      })
    }
    if (starredItems.length > 0) {
      lines.push(``)
      lines.push(`【关注项状态】`)
      starredItems.forEach((item) => {
        const alerts = item.alerts.map((a) => a.message).join('; ')
        lines.push(`${item.name} | ${STATUS_LABELS[item.status]}${alerts ? ' | ' + alerts : ''}`)
      })
    }
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#1C1C1E] text-[#FAFAFA] print:bg-white print:text-black">
      <div className="mx-auto max-w-4xl px-4 py-8 print:px-0 print:py-4">
        <div className="relative mb-8 print:mb-4">
          <div className="absolute -top-4 -right-4 text-6xl font-black text-[#F59E0B]/10 select-none pointer-events-none print:text-gray-200">
            验厂文件夹助手
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            <FileText className="mr-2 inline-block h-6 w-6 text-[#F59E0B] print:text-black" />
            导出报告
          </h1>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#FAFAFA]/70 print:text-gray-600">
            <span>会话: {session.name}</span>
            <span>验厂日期: {session.auditDate || '未设置'}</span>
            <span>生成日期: {formatToday()}</span>
          </div>
        </div>

        <section className="mb-8 rounded-lg bg-[#3F3F46] p-6 print:bg-gray-100 print:border print:border-gray-300">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-[#F59E0B] print:text-black" />
            完成度概览
          </h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center">
              <span className="text-5xl font-black text-[#F59E0B] print:text-black">
                {stats.completionRate}
                <span className="text-2xl">%</span>
              </span>
              <span className="mt-1 text-xs text-[#FAFAFA]/50 print:text-gray-500">
                完成率
              </span>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: '总项数', value: stats.total },
                { label: '已有', value: stats.existing },
                { label: '缺失', value: stats.missing },
                { label: '过期', value: stats.expired },
                { label: '需更新', value: stats.needsUpdate },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded bg-[#1C1C1E]/50 px-3 py-2 text-center print:bg-white print:border print:border-gray-200"
                >
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-xs text-[#FAFAFA]/50 print:text-gray-500">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 text-[#F59E0B] print:text-black" />
            <span>
              关注项: {stats.starredReady}/{stats.starredTotal} 已就绪
            </span>
          </div>
        </section>

        <section className="mb-8 print:mb-4">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <AlertTriangle className="h-5 w-5 text-[#F59E0B] print:text-black" />
            今日待补充清单
          </h2>
          {sortedSupplement.length === 0 ? (
            <div className="rounded-lg bg-[#3F3F46] p-6 text-center text-[#FAFAFA]/50 print:bg-gray-100 print:text-gray-500">
              所有项目已就绪，无需补充
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-[#3F3F46] print:bg-white print:border print:border-gray-300">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#FAFAFA]/10 text-left text-xs text-[#FAFAFA]/60 print:border-gray-300 print:text-gray-600">
                    <th className="px-4 py-3">优先级</th>
                    <th className="px-4 py-3">清单项</th>
                    <th className="px-4 py-3">分类</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSupplement.map(({ item, priority }) => {
                    const alerts = item.alerts
                      .map((a) => a.message)
                      .join('; ')
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-[#FAFAFA]/5 print:border-gray-200"
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                              priority === 1
                                ? 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-700'
                                : priority === 2
                                  ? 'bg-orange-500/20 text-orange-400 print:bg-orange-100 print:text-orange-700'
                                  : 'bg-yellow-500/20 text-yellow-400 print:bg-yellow-100 print:text-yellow-700'
                            }`}
                          >
                            {priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {item.starred && (
                            <Star className="mr-1 inline h-3 w-3 text-[#F59E0B] print:text-black" />
                          )}
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-[#FAFAFA]/70 print:text-gray-600">
                          {CATEGORY_LABELS[item.category]}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-medium ${
                              item.status === 'missing'
                                ? 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-700'
                                : item.status === 'expired'
                                  ? 'bg-yellow-500/20 text-yellow-400 print:bg-yellow-100 print:text-yellow-700'
                                  : 'bg-blue-500/20 text-blue-400 print:bg-blue-100 print:text-blue-700'
                            }`}
                          >
                            {STATUS_LABELS[item.status]}
                          </span>
                        </td>
                        <td className="max-w-[200px] px-4 py-3 text-[#FAFAFA]/60 print:text-gray-600">
                          {alerts || '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8 print:mb-4">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Star className="h-5 w-5 text-[#F59E0B] print:text-black" />
            关注项状态
          </h2>
          {starredItems.length === 0 ? (
            <div className="rounded-lg bg-[#3F3F46] p-6 text-center text-[#FAFAFA]/50 print:bg-gray-100 print:text-gray-500">
              暂无关注项
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {starredItems.map((item) => {
                const alerts = item.alerts
                  .map((a) => a.message)
                  .join('; ')
                return (
                  <div
                    key={item.id}
                    className="rounded-lg bg-[#3F3F46] p-4 print:bg-white print:border print:border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        <Star className="mr-1 inline h-3 w-3 text-[#F59E0B] print:text-black" />
                        {item.name}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          item.status === 'existing'
                            ? 'bg-green-500/20 text-green-400 print:bg-green-100 print:text-green-700'
                            : item.status === 'missing'
                              ? 'bg-red-500/20 text-red-400 print:bg-red-100 print:text-red-700'
                              : item.status === 'expired'
                                ? 'bg-yellow-500/20 text-yellow-400 print:bg-yellow-100 print:text-yellow-700'
                                : 'bg-blue-500/20 text-blue-400 print:bg-blue-100 print:text-blue-700'
                        }`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                    </div>
                    {alerts && (
                      <p className="mt-2 text-xs text-[#FAFAFA]/50 print:text-gray-500">
                        {alerts}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="flex flex-wrap gap-3 print:hidden">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 rounded-lg bg-[#F59E0B] px-5 py-2.5 text-sm font-semibold text-[#1C1C1E] transition hover:bg-[#D97706]"
          >
            <Download className="h-4 w-4" />
            导出CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-[#3F3F46] px-5 py-2.5 text-sm font-semibold text-[#FAFAFA] transition hover:bg-[#52525B]"
          >
            <Printer className="h-4 w-4" />
            打印报告
          </button>
          <button
            onClick={handleCopySummary}
            className="flex items-center gap-2 rounded-lg bg-[#3F3F46] px-5 py-2.5 text-sm font-semibold text-[#FAFAFA] transition hover:bg-[#52525B]"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-400" />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                复制摘要
              </>
            )}
          </button>
        </section>
      </div>

      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 animate-fade-in rounded-lg bg-green-600 px-4 py-2 text-sm font-medium shadow-lg print:hidden">
          已复制到剪贴板
        </div>
      )}
    </div>
  )
}
