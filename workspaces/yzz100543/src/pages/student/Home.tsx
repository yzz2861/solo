import { useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/useGameStore'
import { useStudentStore } from '@/store/useStudentStore'
import { useCaseStore } from '@/store/useCaseStore'
import PageHeader from '@/components/common/PageHeader'
import { Trophy, Target, Clock, ChevronRight, Star, AlertTriangle, Flame } from 'lucide-react'
import type { Difficulty } from '@/types'

const difficultyColors: Record<Difficulty, string> = {
  easy: 'text-green-400 bg-green-400/10 border-green-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  hard: 'text-red-400 bg-red-400/10 border-red-400/20',
}

const difficultyLabels: Record<Difficulty, string> = {
  easy: '初级',
  medium: '中级',
  hard: '高级',
}

export default function StudentHome() {
  const navigate = useNavigate()
  const { currentStudentId, students, getStudentAvgScore, getStudentCompletedScenarios, getWeakestScenarios } = useStudentStore()
  const { scenarios } = useCaseStore()
  const { allSessions } = useGameStore()
  const student = students.find(s => s.id === currentStudentId)

  if (!student) {
    navigate('/')
    return null
  }

  const avgScore = getStudentAvgScore(student.id, allSessions)
  const completedIds = getStudentCompletedScenarios(student.id, allSessions)
  const weakestIds = getWeakestScenarios(student.id, allSessions, scenarios.map(s => s.id))
  const weakestScenarios = weakestIds.map(id => scenarios.find(s => s.id === id)).filter(Boolean)

  return (
    <div className="min-h-screen bg-[#0a1e30]">
      <PageHeader
        title={`你好，${student.name}`}
        subtitle={`${student.group} · 继续训练提升应急能力`}
        backPath="/"
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-[#FF6B35]" />
              <span className="text-xs text-[#667788]">平均得分</span>
            </div>
            <div className="text-3xl font-bold text-white">{avgScore}</div>
          </div>
          <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#2EC4B6]" />
              <span className="text-xs text-[#667788]">已完成</span>
            </div>
            <div className="text-3xl font-bold text-white">{completedIds.length}<span className="text-lg text-[#667788]">/{scenarios.length}</span></div>
          </div>
          <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-[#667788]">最近训练</span>
            </div>
            <div className="text-sm text-white mt-1">
              {allSessions.filter(s => s.studentId === student.id).length > 0
                ? new Date(allSessions.filter(s => s.studentId === student.id).sort((a, b) => b.endTime - a.endTime)[0].endTime).toLocaleDateString('zh-CN')
                : '暂无'}
            </div>
          </div>
        </div>

        {weakestScenarios.length > 0 && (
          <div className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-[#FF6B35]" />
              <h2 className="text-white font-bold">薄弱场景推荐</h2>
              <span className="text-xs text-[#667788]">最需练习的Top3</span>
            </div>
            <div className="space-y-2">
              {weakestScenarios.map((scenario, idx) => scenario && (
                <button
                  key={scenario.id}
                  onClick={() => navigate(`/student/training/${scenario.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1a3a54] hover:bg-[#1f4060] transition-colors group"
                >
                  <span className="w-6 h-6 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] text-xs flex items-center justify-center font-bold">{idx + 1}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm text-white">{scenario.title}</div>
                    <div className="text-xs text-[#667788]">{scenario.description.slice(0, 30)}...</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#667788] group-hover:text-white transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-[#FF6B35]" />
            全部场景
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((scenario) => {
              const completed = completedIds.includes(scenario.id)
              return (
                <button
                  key={scenario.id}
                  onClick={() => navigate(`/student/training/${scenario.id}`)}
                  className="text-left bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54] hover:border-[#2a5a84] transition-all hover:-translate-y-0.5 hover:shadow-lg group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-medium group-hover:text-[#4499cc] transition-colors">{scenario.title}</h3>
                    {completed && (
                      <span className="flex items-center gap-1 text-xs text-[#2EC4B6] bg-[#2EC4B6]/10 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3" />已完成
                      </span>
                    )}
                  </div>
                  <p className="text-[#667788] text-sm mb-3">{scenario.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColors[scenario.difficulty]}`}>
                      {difficultyLabels[scenario.difficulty]}
                    </span>
                    {scenario.tags.map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-[#1a3a54] text-[#667788]">{tag}</span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
