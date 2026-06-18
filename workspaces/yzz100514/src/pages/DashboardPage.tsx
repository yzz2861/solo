import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import type { Specimen } from '@/types'
import {
  Archive,
  LogOut,
  Droplets,
  Wrench,
  BookOpen,
  Clock,
  Plus,
  BarChart3,
  Download,
  CheckCircle,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const PIE_COLORS = ['#2D5016', '#3B82F6', '#D4A574', '#B91C1C']

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = '\uFEFF'
  const csv = BOM + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function LibrarianView() {
  const { specimens, borrowRecords } = useStore()
  const navigate = useNavigate()

  const stats = useMemo(() => ({
    inHouse: specimens.filter((s) => s.status === '在馆').length,
    borrowed: specimens.filter((s) => s.status === '借出中').length,
    damp: specimens.filter((s) => s.pressingStatus === '受潮').length,
    repair: specimens.filter((s) => s.status === '待修复').length,
  }), [specimens])

  const recentActivities = useMemo(() => {
    return [...borrowRecords]
      .sort((a, b) => b.borrowDate.localeCompare(a.borrowDate))
      .slice(0, 10)
      .map((r) => ({
        borrower: r.borrower,
        specimenCode: r.specimenCode,
        action: r.status === '已归还' ? '归还' : r.status === '逾期' ? '逾期未还' : '借出',
        date: r.status === '已归还' && r.returnDate ? r.returnDate : r.borrowDate,
      }))
  }, [borrowRecords])

  const handleExportCourseList = () => {
    const headers = ['标本编号', '借阅人', '用途', '借出日期', '预计归还', '状态']
    const rows = borrowRecords
      .filter((r) => r.purpose === '课程')
      .map((r) => [r.specimenCode, r.borrower, r.purpose, r.borrowDate, r.expectedReturnDate, r.status])
    exportCSV('课程使用清单.csv', headers, rows)
  }

  const handleExportRepairList = () => {
    const headers = ['标本编号', '科', '属', '采集地', '压片状态', '借阅状态']
    const rows = specimens
      .filter((s) => s.status === '待修复')
      .map((s) => [s.code, s.family, s.genus, s.collectionSite, s.pressingStatus, s.status])
    exportCSV('待修复标本.csv', headers, rows)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <Archive className="w-8 h-8 text-forest-500" />
          <div>
            <p className="text-2xl font-bold text-forest-800">{stats.inHouse}</p>
            <p className="text-xs text-sand-500">在馆标本数</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <LogOut className="w-8 h-8 text-blue-500" />
          <div>
            <p className="text-2xl font-bold text-forest-800">{stats.borrowed}</p>
            <p className="text-xs text-sand-500">借出中标本数</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Droplets className="w-8 h-8 text-amber-500" />
          <div>
            <p className="text-2xl font-bold text-forest-800">{stats.damp}</p>
            <p className="text-xs text-sand-500">受潮标本数</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Wrench className="w-8 h-8 text-rust-500" />
          <div>
            <p className="text-2xl font-bold text-forest-800">{stats.repair}</p>
            <p className="text-xs text-sand-500">待修复标本数</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">今日动态</h2>
        {recentActivities.length > 0 ? (
          <div className="space-y-3">
            {recentActivities.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-sand-100 last:border-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  activity.action === '逾期未还' ? 'bg-red-500' :
                  activity.action === '归还' ? 'bg-emerald-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 text-sm">
                  <span className="font-medium text-forest-800">{activity.borrower}</span>
                  <span className="text-sand-500"> {activity.action}了 </span>
                  <span className="font-mono text-forest-700">{activity.specimenCode}</span>
                </div>
                <span className="text-xs text-sand-400">{activity.date}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sand-400 text-center py-8">暂无动态</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/specimens')}>
          <Plus className="w-4 h-4" />
          新增标本
        </button>
        <button className="btn-primary flex items-center gap-2" onClick={() => navigate('/borrows')}>
          <BookOpen className="w-4 h-4" />
          借阅登记
        </button>
        <button className="btn-secondary flex items-center gap-2" onClick={() => navigate('/statistics')}>
          <BarChart3 className="w-4 h-4" />
          查看统计
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-secondary flex items-center gap-2" onClick={handleExportCourseList}>
          <Download className="w-4 h-4" />
          导出课程使用清单(CSV)
        </button>
        <button className="btn-secondary flex items-center gap-2" onClick={handleExportRepairList}>
          <Download className="w-4 h-4" />
          导出待修复标本(CSV)
        </button>
      </div>
    </div>
  )
}

function TeacherView() {
  const { borrowRecords, specimens } = useStore()

  const courseCount = useMemo(() => borrowRecords.filter((r) => r.purpose === '课程').length, [borrowRecords])
  const pendingReturnCount = useMemo(
    () => borrowRecords.filter((r) => r.status === '借出中' || r.status === '逾期').length,
    [borrowRecords]
  )

  const courseRecords = useMemo(() => borrowRecords.filter((r) => r.purpose === '课程'), [borrowRecords])
  const pendingReturnRecords = useMemo(
    () => borrowRecords.filter((r) => r.status === '借出中' || r.status === '逾期'),
    [borrowRecords]
  )

  const handleExport = () => {
    const headers = ['标本编号', '借阅人', '用途', '借出日期', '预计归还', '状态', '类型']
    const courseRows = borrowRecords
      .filter((r) => r.purpose === '课程')
      .map((r) => [r.specimenCode, r.borrower, r.purpose, r.borrowDate, r.expectedReturnDate, r.status, '课程借阅'])
    const repairRows = specimens
      .filter((s) => s.status === '待修复')
      .map((s) => [s.code, '', '', '', '', s.status, '待修复标本'])
    exportCSV('课程使用和待修复清单.csv', headers, [...courseRows, ...repairRows])
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-forest-500" />
          <div>
            <p className="text-2xl font-bold text-forest-800">{courseCount}</p>
            <p className="text-xs text-sand-500">课程借阅数</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500" />
          <div>
            <p className="text-2xl font-bold text-forest-800">{pendingReturnCount}</p>
            <p className="text-xs text-sand-500">待归还数</p>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">课程借阅记录</h2>
        {courseRecords.length > 0 ? (
          <div className="space-y-2">
            {courseRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-sand-100 last:border-0">
                <div>
                  <span className="font-mono text-sm font-medium text-forest-800">{r.specimenCode}</span>
                  <span className="text-sm text-sand-500 ml-2">借阅人：{r.borrower}</span>
                </div>
                <span className={`badge ${
                  r.status === '逾期' ? 'bg-red-100 text-red-700' :
                  r.status === '借出中' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sand-400 text-center py-8">暂无课程借阅记录</p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-forest-700 mb-4">待归还标本</h2>
        {pendingReturnRecords.length > 0 ? (
          <div className="space-y-2">
            {pendingReturnRecords.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-sand-100 last:border-0">
                <div>
                  <span className="font-mono text-sm font-medium text-forest-800">{r.specimenCode}</span>
                  <span className="text-sm text-sand-500 ml-2">借阅人：{r.borrower}</span>
                  <span className="text-sm text-sand-400 ml-2">预计归还：{r.expectedReturnDate}</span>
                </div>
                <span className={`badge ${
                  r.status === '逾期' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sand-400 text-center py-8">暂无待归还标本</p>
        )}
      </div>

      <div>
        <button className="btn-secondary flex items-center gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />
          导出课程使用和待修复清单(CSV)
        </button>
      </div>
    </div>
  )
}

function RepairView() {
  const { specimens, borrowRecords, updateSpecimen } = useStore()

  const fragileSpecimens = useMemo(() => {
    return specimens
      .filter((s) => s.pressingStatus === '受潮' || s.status === '待修复')
      .map((s) => {
        const borrowCount = borrowRecords.filter((r) => r.specimenId === s.id).length
        const isDamp = s.pressingStatus === '受潮'
        const needsRepair = s.status === '待修复'
        let priority = 0
        if (isDamp && needsRepair) priority = 2
        else if (isDamp) priority = 1
        else priority = 0
        return { specimen: s, borrowCount, priority }
      })
      .sort((a, b) => b.priority - a.priority)
  }, [specimens, borrowRecords])

  const handleMarkRepaired = (specimen: Specimen) => {
    updateSpecimen(specimen.id, { status: '在馆', pressingStatus: '正常' })
  }

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-sand-200">
          <h2 className="text-lg font-semibold text-forest-700">脆弱标本清单</h2>
        </div>
        {fragileSpecimens.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sand-50 border-b border-sand-200">
                  <th className="px-4 py-3 text-left font-medium text-forest-700">编号</th>
                  <th className="px-4 py-3 text-left font-medium text-forest-700">科属</th>
                  <th className="px-4 py-3 text-left font-medium text-forest-700">采集地</th>
                  <th className="px-4 py-3 text-left font-medium text-forest-700">压片状态</th>
                  <th className="px-4 py-3 text-left font-medium text-forest-700">借阅次数</th>
                  <th className="px-4 py-3 text-left font-medium text-forest-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {fragileSpecimens.map(({ specimen, borrowCount }) => (
                  <tr key={specimen.id} className="border-b border-sand-100 hover:bg-sand-50">
                    <td className="px-4 py-3 font-mono text-forest-800">{specimen.code}</td>
                    <td className="px-4 py-3">{specimen.family} · {specimen.genus}</td>
                    <td className="px-4 py-3">{specimen.collectionSite}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        specimen.pressingStatus === '受潮' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {specimen.pressingStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">{borrowCount}</td>
                    <td className="px-4 py-3">
                      {specimen.status === '待修复' && (
                        <button
                          className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                          onClick={() => handleMarkRepaired(specimen)}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          标记修复完成
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sand-400 text-center py-12">暂无脆弱标本</p>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const role = useStore((s) => s.role)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-forest-800">工作台</h1>
        <p className="text-sm text-sand-500 mt-1">当前角色：{role}</p>
      </div>

      {role === '馆员' && <LibrarianView />}
      {role === '教师' && <TeacherView />}
      {role === '修复师' && <RepairView />}
    </div>
  )
}
