import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '@/store/useGameStore'
import { useCaseStore } from '@/store/useCaseStore'
import PageHeader from '@/components/common/PageHeader'
import ScoreOverview from '@/components/report/ScoreOverview'
import DialogueReplay from '@/components/report/DialogueReplay'
import SuggestionList from '@/components/report/SuggestionList'
import { RotateCcw, ArrowRight } from 'lucide-react'

export default function Report() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const { allSessions } = useGameStore()
  const { scenarios } = useCaseStore()
  const session = allSessions.find(s => s.id === sessionId)

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a1e30] flex items-center justify-center text-white">
        报告未找到
      </div>
    )
  }

  const scenario = scenarios.find(s => s.id === session.scenarioId)

  return (
    <div className="min-h-screen bg-[#0a1e30]">
      <PageHeader
        title="培训报告"
        subtitle={scenario?.title ?? ''}
        backPath="/student"
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <ScoreOverview
          totalScore={session.totalScore}
          infoScore={session.infoScore}
          comfortScore={session.comfortScore}
          efficiencyScore={session.efficiencyScore}
        />

        <DialogueReplay
          logs={session.dialogueLogs}
          missedPoints={session.missedPoints}
        />

        <SuggestionList
          missedPoints={session.missedPoints}
          totalScore={session.totalScore}
        />

        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/student/training/${session.scenarioId}`)}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#0F2A44] text-white rounded-2xl border border-[#1a3a54] hover:border-[#2a5a84] transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            再练一次
          </button>
          <button
            onClick={() => navigate('/student')}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#FF6B35] to-[#e85d2c] text-white rounded-2xl hover:shadow-lg hover:shadow-[#FF6B35]/20 transition-all"
          >
            返回首页
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
