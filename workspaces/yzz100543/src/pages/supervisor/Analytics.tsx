import { useMemo } from 'react'
import { useGameStore } from '@/store/useGameStore'
import { useCaseStore } from '@/store/useCaseStore'
import { useStudentStore } from '@/store/useStudentStore'
import PageHeader from '@/components/common/PageHeader'
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react'

export default function Analytics() {
  const { allSessions } = useGameStore()
  const { scenarios } = useCaseStore()
  const { students } = useStudentStore()

  const completedSessions = useMemo(
    () => allSessions.filter((s) => s.completed),
    [allSessions],
  )

  const missedInfoFrequency = useMemo(() => {
    const freq: Record<string, number> = {}
    for (const session of completedSessions) {
      for (const mp of session.missedPoints) {
        freq[mp.infoPointName] = (freq[mp.infoPointName] ?? 0) + 1
      }
    }
    return Object.entries(freq)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [completedSessions])

  const maxMissedCount = useMemo(
    () => Math.max(...missedInfoFrequency.map((m) => m.count), 1),
    [missedInfoFrequency],
  )

  const scenarioRanking = useMemo(() => {
    const scoreMap: Record<string, number[]> = {}
    for (const session of completedSessions) {
      if (!scoreMap[session.scenarioId]) scoreMap[session.scenarioId] = []
      scoreMap[session.scenarioId].push(session.totalScore)
    }
    return scenarios
      .map((s) => {
        const scores = scoreMap[s.id] ?? []
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        return { id: s.id, title: s.title, difficulty: s.difficulty, avg, count: scores.length }
      })
      .sort((a, b) => a.avg - b.avg)
  }, [scenarios, completedSessions])

  const studentRanking = useMemo(() => {
    const scoreMap: Record<string, number[]> = {}
    const countMap: Record<string, number> = {}
    for (const session of completedSessions) {
      if (!scoreMap[session.studentId]) scoreMap[session.studentId] = []
      scoreMap[session.studentId].push(session.totalScore)
      countMap[session.studentId] = (countMap[session.studentId] ?? 0) + 1
    }
    return students
      .map((st) => {
        const scores = scoreMap[st.id] ?? []
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        return { id: st.id, name: st.name, group: st.group, avg, completed: countMap[st.id] ?? 0 }
      })
      .sort((a, b) => b.avg - a.avg)
  }, [students, completedSessions])

  const difficultyLabels: Record<string, string> = {
    easy: '初级',
    medium: '中级',
    hard: '高级',
  }

  const difficultyColors: Record<string, string> = {
    easy: 'text-green-400 bg-green-400/10 border-green-400/20',
    medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    hard: 'text-red-400 bg-red-400/10 border-red-400/20',
  }

  return (
    <div className="min-h-screen bg-[#0a1e30]">
      <PageHeader
        title="数据分析"
        subtitle={`${completedSessions.length} 条训练记录`}
        backPath="/supervisor/cases"
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-xs text-[#667788]">总训练次数</span>
            </div>
            <div className="text-3xl font-bold text-white">{completedSessions.length}</div>
          </div>
          <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-xs text-[#667788]">信息遗漏总数</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {missedInfoFrequency.reduce((sum, m) => sum + m.count, 0)}
            </div>
          </div>
          <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[#2EC4B6]" />
              <span className="text-xs text-[#667788]">参训学员</span>
            </div>
            <div className="text-3xl font-bold text-white">
              {new Set(completedSessions.map((s) => s.studentId)).size}
            </div>
          </div>
        </div>

        <div className="bg-[#0F2A44] rounded-2xl p-6 border border-[#1a3a54]">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle className="w-5 h-5 text-[#FF6B35]" />
            <h2 className="text-white font-bold">信息遗漏频次</h2>
          </div>

          {missedInfoFrequency.length === 0 ? (
            <div className="text-center py-8 text-[#556677] text-sm">暂无遗漏数据</div>
          ) : (
            <div className="space-y-3">
              {missedInfoFrequency.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-28 text-sm text-[#8899aa] text-right truncate shrink-0">
                    {item.name}
                  </div>
                  <div className="flex-1 h-7 bg-[#0a1e30] rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-[#FF6B35] to-[#ff8f5e] transition-all duration-500"
                      style={{ width: `${(item.count / maxMissedCount) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 text-sm text-[#FF6B35] font-medium text-right shrink-0">
                    {item.count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0F2A44] rounded-2xl p-6 border border-[#1a3a54]">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-5 h-5 text-[#2EC4B6]" />
            <h2 className="text-white font-bold">案例难度排名</h2>
            <span className="text-xs text-[#667788]">按平均得分升序</span>
          </div>

          {scenarioRanking.length === 0 ? (
            <div className="text-center py-8 text-[#556677] text-sm">暂无案例数据</div>
          ) : (
            <div className="space-y-2">
              {scenarioRanking.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#0a1e30] border border-[#1a3a54]"
                >
                  <span className="w-6 h-6 rounded-full bg-[#1a3a54] text-[#8899aa] text-xs flex items-center justify-center font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-sm text-white truncate">{item.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColors[item.difficulty] ?? 'text-[#8899aa] bg-[#1a3a54] border-[#2a4a64]'}`}
                  >
                    {difficultyLabels[item.difficulty] ?? item.difficulty}
                  </span>
                  <span className="text-sm text-[#8899aa] w-8 text-right shrink-0">
                    {item.count}次
                  </span>
                  <span className="text-sm font-medium text-[#2EC4B6] w-12 text-right shrink-0">
                    {item.avg.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#0F2A44] rounded-2xl p-6 border border-[#1a3a54]">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-[#2EC4B6]" />
            <h2 className="text-white font-bold">学员排名</h2>
          </div>

          {studentRanking.length === 0 ? (
            <div className="text-center py-8 text-[#556677] text-sm">暂无学员数据</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[#667788] border-b border-[#1a3a54]">
                    <th className="text-left py-3 px-3 font-medium">排名</th>
                    <th className="text-left py-3 px-3 font-medium">姓名</th>
                    <th className="text-left py-3 px-3 font-medium">组别</th>
                    <th className="text-right py-3 px-3 font-medium">平均得分</th>
                    <th className="text-right py-3 px-3 font-medium">完成次数</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRanking.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="border-b border-[#1a3a54]/50 hover:bg-[#0a1e30] transition-colors"
                    >
                      <td className="py-3 px-3">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            idx === 0
                              ? 'bg-[#FF6B35]/20 text-[#FF6B35]'
                              : idx === 1
                                ? 'bg-amber-400/20 text-amber-400'
                                : idx === 2
                                  ? 'bg-[#2EC4B6]/20 text-[#2EC4B6]'
                                  : 'bg-[#1a3a54] text-[#667788]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-white">{item.name}</td>
                      <td className="py-3 px-3 text-[#8899aa]">{item.group}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[#2EC4B6] font-medium">{item.avg.toFixed(1)}</span>
                      </td>
                      <td className="py-3 px-3 text-right text-[#8899aa]">{item.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
