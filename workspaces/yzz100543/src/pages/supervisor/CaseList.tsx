import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCaseStore } from '@/store/useCaseStore'
import { useGameStore } from '@/store/useGameStore'
import PageHeader from '@/components/common/PageHeader'
import { Plus, Pencil, Trash2, BarChart3, Search } from 'lucide-react'
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

type TabFilter = 'all' | Difficulty

const tabs: { key: TabFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'easy', label: '初级' },
  { key: 'medium', label: '中级' },
  { key: 'hard', label: '高级' },
]

export default function CaseList() {
  const navigate = useNavigate()
  const { scenarios, deleteScenario } = useCaseStore()
  const { allSessions } = useGameStore()

  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = scenarios.filter((s) => {
    const matchDifficulty = activeTab === 'all' || s.difficulty === activeTab
    const matchSearch =
      !searchQuery ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchDifficulty && matchSearch
  })

  const getSessionCount = (scenarioId: string) =>
    allSessions.filter((s) => s.scenarioId === scenarioId && s.completed).length

  return (
    <div className="min-h-screen bg-[#0a1e30]">
      <PageHeader
        title="案例管理"
        subtitle={`共 ${scenarios.length} 个案例`}
        backPath="/"
        rightContent={
          <button
            onClick={() => navigate('/supervisor/analytics')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2EC4B6]/20 text-[#2EC4B6] hover:bg-[#2EC4B6]/30 transition-colors text-sm"
          >
            <BarChart3 className="w-4 h-4" />
            数据分析
          </button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#667788]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索案例..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F2A44] border border-[#1a3a54] text-white placeholder-[#556677] focus:outline-none focus:border-[#FF6B35] transition-colors text-sm"
            />
          </div>
          <button
            onClick={() => navigate('/supervisor/cases/new/edit')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#e85d2c] text-white font-medium hover:from-[#e85d2c] hover:to-[#d04f24] transition-all shadow-lg shadow-[#FF6B35]/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            新建案例
          </button>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'bg-[#FF6B35] text-white'
                  : 'bg-[#0F2A44] text-[#8899aa] hover:text-white border border-[#1a3a54]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-[#667788]">
            <p className="text-lg mb-2">暂无案例</p>
            <p className="text-sm">点击"新建案例"创建第一个训练场景</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((scenario) => (
              <div
                key={scenario.id}
                className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54] hover:border-[#2a5a84] transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-white font-medium text-lg">{scenario.title}</h3>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/supervisor/cases/${scenario.id}/edit`)}
                      className="p-2 rounded-lg bg-[#1a3a54] text-[#8899aa] hover:text-[#4499cc] hover:bg-[#1f4060] transition-colors"
                      title="编辑"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteScenario(scenario.id)}
                      className="p-2 rounded-lg bg-[#1a3a54] text-[#8899aa] hover:text-[#FF6B35] hover:bg-[#FF6B35]/10 transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-[#667788] text-sm mb-4 line-clamp-2">
                  {scenario.description}
                </p>

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full border ${difficultyColors[scenario.difficulty]}`}
                  >
                    {difficultyLabels[scenario.difficulty]}
                  </span>
                  {scenario.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2.5 py-1 rounded-full bg-[#1a3a54] text-[#667788]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-[#556677] pt-3 border-t border-[#1a3a54]">
                  <span>{Object.keys(scenario.nodes).length} 个对话节点</span>
                  <span>{getSessionCount(scenario.id)} 次训练</span>
                  <span>{scenario.infoPoints.length} 个信息点</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
