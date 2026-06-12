import { useAppStore } from '@/store/useAppStore'
import { useNavigate } from 'react-router-dom'
import { FileBarChart2, Eye, ClipboardList, CheckCircle2, Clock } from 'lucide-react'
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS } from '@/types'
import type { IssueType } from '@/types'

export default function InspectionReports() {
  const navigate = useNavigate()
  const reports = useAppStore((s) => s.reports)

  const totalInspections = reports.length
  const totalIssues = reports.reduce((sum, r) => sum + r.totalIssues, 0)
  const totalConfirmed = reports.reduce((sum, r) => sum + r.confirmedIssues, 0)
  const totalPending = reports.reduce((sum, r) => sum + r.pendingIssues, 0)

  const stats = [
    { label: '总巡店次数', value: totalInspections, icon: ClipboardList, color: 'text-accent' },
    { label: '总问题数', value: totalIssues, icon: FileBarChart2, color: 'text-danger' },
    { label: '已确认', value: totalConfirmed, icon: CheckCircle2, color: 'text-pass' },
    { label: '待处理', value: totalPending, icon: Clock, color: 'text-warn' },
  ]

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">巡店报告</h1>
        <p className="text-sm text-gray-400 mt-1">查看巡店报告和问题统计</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`stat-value ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-700/40">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">门店</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">日期</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">督导</th>
              <th className="text-center px-4 py-3 text-gray-400 font-medium">照片</th>
              <th className="text-center px-4 py-3 text-gray-400 font-medium">问题</th>
              <th className="text-center px-4 py-3 text-gray-400 font-medium">已确认</th>
              <th className="text-center px-4 py-3 text-gray-400 font-medium">待处理</th>
              <th className="text-center px-4 py-3 text-gray-400 font-medium">问题分布</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id} className="border-b border-brand-700/20 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3 font-medium text-gray-200">{report.storeName}</td>
                <td className="px-4 py-3 text-gray-300 font-mono">{report.date}</td>
                <td className="px-4 py-3 text-gray-300">{report.supervisorName}</td>
                <td className="px-4 py-3 text-center font-mono text-gray-200">{report.totalPhotos}</td>
                <td className="px-4 py-3 text-center font-mono text-danger">{report.totalIssues}</td>
                <td className="px-4 py-3 text-center font-mono text-pass">{report.confirmedIssues}</td>
                <td className="px-4 py-3 text-center font-mono text-warn">{report.pendingIssues}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-center">
                    {(Object.keys(report.issueBreakdown) as IssueType[]).map((type) => (
                      <span
                        key={type}
                        className="badge text-[10px]"
                        style={{ backgroundColor: ISSUE_TYPE_COLORS[type] + '30', color: ISSUE_TYPE_COLORS[type] }}
                      >
                        {ISSUE_TYPE_LABELS[type]}:{report.issueBreakdown[type]}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigate(`/reports/${report.id}`)}
                    className="inline-flex items-center gap-1.5 text-accent hover:text-accent-light text-sm transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    查看详情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
