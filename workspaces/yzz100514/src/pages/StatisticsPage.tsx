import { useEffect, useMemo } from 'react'
import { useStore } from '@/store'
import type { Specimen } from '@/types'
import { AlertTriangle } from 'lucide-react'
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

interface AlertItem {
  specimen: Specimen
  borrowCount: number
  alertReasons: string[]
  priority: number
}

const PIE_COLORS = ['#2D5016', '#3B82F6', '#D97706', '#B91C1C']

export default function StatisticsPage() {
  const { specimens, borrowRecords, role, updateOverdueRecords } = useStore()

  useEffect(() => {
    updateOverdueRecords()
  }, [updateOverdueRecords])

  const siteData = useMemo(() => {
    const map = new Map<string, number>()
    borrowRecords.forEach((r) => {
      const sp = specimens.find((s) => s.id === r.specimenId)
      if (sp) {
        map.set(sp.collectionSite, (map.get(sp.collectionSite) || 0) + 1)
      }
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [specimens, borrowRecords])

  const familyData = useMemo(() => {
    const map = new Map<string, number>()
    borrowRecords.forEach((r) => {
      const sp = specimens.find((s) => s.id === r.specimenId)
      if (sp) {
        map.set(sp.family, (map.get(sp.family) || 0) + 1)
      }
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [specimens, borrowRecords])

  const alertSpecimens = useMemo(() => {
    const alerts: AlertItem[] = []
    specimens.forEach((sp) => {
      const borrowCount = borrowRecords.filter((r) => r.specimenId === sp.id).length
      const reasons: string[] = []
      let priority = 0
      const isDamp = sp.pressingStatus === '受潮'
      const needsRepair = sp.status === '待修复'
      if (isDamp && needsRepair) {
        reasons.push('受潮', '待修复')
        priority = 3
      } else if (isDamp) {
        reasons.push('受潮预警')
        priority = 2
      } else if (needsRepair) {
        reasons.push('待修复')
        priority = 1
      }
      if (borrowCount >= 3) {
        reasons.push('高频借阅')
        if (priority < 1) priority = 0
      }
      if (reasons.length > 0) {
        alerts.push({ specimen: sp, borrowCount, alertReasons: reasons, priority })
      }
    })
    return alerts.sort((a, b) => b.priority - a.priority)
  }, [specimens, borrowRecords])

  const statusPieData = useMemo(() => {
    const inHouse = specimens.filter((s) => s.status === '在馆').length
    const borrowed = specimens.filter((s) => s.status === '借出中').length
    const repair = specimens.filter((s) => s.status === '待修复').length
    return [
      { name: '在馆', value: inHouse },
      { name: '借出中', value: borrowed },
      { name: '待修复', value: repair },
    ].filter((d) => d.value > 0)
  }, [specimens])

  const showFullStats = role === '馆员' || role === '教师'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-forest-800">统计分析</h1>

      {showFullStats && (
        <>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-forest-700 mb-4">采集地统计</h2>
            {siteData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={siteData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2D5016" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sand-400 text-center py-8">暂无数据</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-forest-700 mb-4">科属统计</h2>
            {familyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={familyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#D4A574" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sand-400 text-center py-8">暂无数据</p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-forest-700 mb-4">标本状态分布</h2>
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sand-400 text-center py-8">暂无数据</p>
            )}
          </div>
        </>
      )}

      <div className="card p-6">
        <h2 className="text-lg font-semibold text-forest-700 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          维护预警
        </h2>
        {alertSpecimens.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className="text-left py-2 px-3 font-medium text-forest-700">标本编号</th>
                  <th className="text-left py-2 px-3 font-medium text-forest-700">科属</th>
                  <th className="text-left py-2 px-3 font-medium text-forest-700">采集地</th>
                  <th className="text-left py-2 px-3 font-medium text-forest-700">借阅次数</th>
                  <th className="text-left py-2 px-3 font-medium text-forest-700">状态</th>
                  <th className="text-left py-2 px-3 font-medium text-forest-700">预警原因</th>
                </tr>
              </thead>
              <tbody>
                {alertSpecimens.map(({ specimen, borrowCount, alertReasons }) => (
                  <tr key={specimen.id} className="border-b border-sand-100 hover:bg-sand-50">
                    <td className="py-2 px-3 font-mono">{specimen.code}</td>
                    <td className="py-2 px-3">{specimen.family} · {specimen.genus}</td>
                    <td className="py-2 px-3">{specimen.collectionSite}</td>
                    <td className="py-2 px-3">{borrowCount}</td>
                    <td className="py-2 px-3">
                      <span className="badge bg-sand-100 text-forest-700">{specimen.status}</span>
                    </td>
                    <td className="py-2 px-3">
                      {alertReasons.map((r, i) => (
                        <span key={i} className="badge bg-amber-100 text-amber-600 mr-1">{r}</span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sand-400 text-center py-8">暂无预警标本</p>
        )}
      </div>
    </div>
  )
}
