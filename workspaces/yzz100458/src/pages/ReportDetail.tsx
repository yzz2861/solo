import { useAppStore } from '@/store/useAppStore'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, AlertTriangle, CheckCircle2, XCircle, Download } from 'lucide-react'
import { ISSUE_TYPE_LABELS, ISSUE_TYPE_COLORS } from '@/types'
import type { IssueType } from '@/types'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const getReportById = useAppStore((s) => s.getReportById)
  const getPhotosByBatchId = useAppStore((s) => s.getPhotosByBatchId)

  const report = getReportById(reportId || '')
  if (!report) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <p>报告未找到</p>
      </div>
    )
  }

  const photos = getPhotosByBatchId(report.batchId)

  const pieData = (Object.keys(report.issueBreakdown) as IssueType[]).map((type) => ({
    name: ISSUE_TYPE_LABELS[type],
    value: report.issueBreakdown[type],
    color: ISSUE_TYPE_COLORS[type],
  }))

  const barData = (Object.keys(report.issueBreakdown) as IssueType[]).map((type) => ({
    name: ISSUE_TYPE_LABELS[type],
    count: report.issueBreakdown[type],
    fill: ISSUE_TYPE_COLORS[type],
  }))

  const stats = [
    { label: '总照片', value: report.totalPhotos, icon: Camera, color: 'text-accent' },
    { label: '总问题', value: report.totalIssues, icon: AlertTriangle, color: 'text-danger' },
    { label: '已确认', value: report.confirmedIssues, icon: CheckCircle2, color: 'text-pass' },
    { label: '已驳回', value: report.rejectedIssues, icon: XCircle, color: 'text-warn' },
  ]

  const handleExport = () => {
    alert(`导出报告: ${report.storeName} ${report.date}`)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reports')} className="btn-secondary px-3 py-2">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="section-title">巡店报告 - {report.storeName} {report.date}</h1>
            <p className="text-sm text-gray-400 mt-0.5">督导: {report.supervisorName}</p>
          </div>
        </div>
        <button onClick={handleExport} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出报告
        </button>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">问题类型分布</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1a2332', border: '1px solid rgba(36,48,68,0.5)', borderRadius: 8, color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-medium text-gray-300 mb-4">问题数量统计</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barData}>
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ backgroundColor: '#1a2332', border: '1px solid rgba(36,48,68,0.5)', borderRadius: 8, color: '#e2e8f0' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-4">巡店照片</h3>
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-brand-700/30">
              <img src={photo.thumbnailUrl} alt="" className="w-full h-32 object-cover" />
              {photo.hasIssues && (
                <div className="absolute top-1.5 right-1.5 flex gap-1 flex-wrap justify-end">
                  {photo.issueTypes.map((type) => (
                    <span
                      key={type}
                      className="badge text-[10px] px-1.5 py-0.5"
                      style={{ backgroundColor: ISSUE_TYPE_COLORS[type] + '40', color: ISSUE_TYPE_COLORS[type] }}
                    >
                      {ISSUE_TYPE_LABELS[type]}
                    </span>
                  ))}
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <span className="text-[10px] text-gray-300 font-mono">{photo.takenAt.split('T')[1]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
