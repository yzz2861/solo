import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCaseStore } from '@/store/useCaseStore'
import PageHeader from '@/components/common/PageHeader'
import { Plus, Save, User, MessageSquare, GitBranch } from 'lucide-react'
import type { Difficulty, DialogueNode, Scenario } from '@/types'

const difficultyOptions: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: '初级' },
  { value: 'medium', label: '中级' },
  { value: 'hard', label: '高级' },
]

const speakerLabels: Record<string, string> = {
  passenger: '乘客',
  system: '系统',
  narrator: '旁白',
}

const categoryLabels: Record<string, string> = {
  comfort: '安抚',
  info: '信息',
  maintenance: '维保',
  escalate: '升级',
}

export default function CaseEdit() {
  const navigate = useNavigate()
  const { caseId } = useParams<{ caseId: string }>()
  const { scenarios, addScenario, updateScenario } = useCaseStore()

  const isNew = caseId === 'new'
  const existingScenario = isNew ? null : scenarios.find((s) => s.id === caseId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [tagsInput, setTagsInput] = useState('')
  const [nodes, setNodes] = useState<Record<string, DialogueNode>>({})
  const [infoPointCount, setInfoPointCount] = useState(0)

  useEffect(() => {
    if (existingScenario) {
      setTitle(existingScenario.title)
      setDescription(existingScenario.description)
      setDifficulty(existingScenario.difficulty)
      setTagsInput(existingScenario.tags.join(', '))
      setNodes(existingScenario.nodes)
      setInfoPointCount(existingScenario.infoPoints.length)
    }
  }, [existingScenario])

  const handleSave = () => {
    if (!title.trim()) return

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    if (isNew) {
      const newScenario: Scenario = {
        id: `scenario-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        difficulty,
        tags,
        startNodeId: Object.keys(nodes).length > 0 ? Object.keys(nodes)[0] : '',
        nodes,
        infoPoints: [],
      }
      addScenario(newScenario)
    } else if (existingScenario) {
      updateScenario(existingScenario.id, {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        tags,
        nodes,
      })
    }

    navigate('/supervisor/cases')
  }

  const addEmptyNode = () => {
    const nodeId = `node-${Date.now()}`
    const newNode: DialogueNode = {
      id: nodeId,
      scenarioId: existingScenario?.id ?? '',
      speaker: 'passenger',
      text: '',
      isEnding: false,
      options: [],
    }
    setNodes((prev) => ({ ...prev, [nodeId]: newNode }))
  }

  const nodeList = Object.values(nodes)

  return (
    <div className="min-h-screen bg-[#0a1e30]">
      <PageHeader
        title={isNew ? '新建案例' : '编辑案例'}
        subtitle={existingScenario?.title}
        backPath="/supervisor/cases"
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-[#0F2A44] rounded-2xl p-6 border border-[#1a3a54] space-y-5">
          <div>
            <label className="block text-sm text-[#8899aa] mb-2">案例标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：电梯困人-老人恐慌"
              className="w-full px-4 py-3 rounded-xl bg-[#0a1e30] border border-[#2a4a64] text-white placeholder-[#556677] focus:outline-none focus:border-[#FF6B35] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-[#8899aa] mb-2">案例描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述该训练场景的核心情境..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-[#0a1e30] border border-[#2a4a64] text-white placeholder-[#556677] focus:outline-none focus:border-[#FF6B35] transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-[#8899aa] mb-2">难度</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full px-4 py-3 rounded-xl bg-[#0a1e30] border border-[#2a4a64] text-white focus:outline-none focus:border-[#FF6B35] transition-colors appearance-none"
              >
                {difficultyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-[#8899aa] mb-2">标签（逗号分隔）</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="例如：恐慌, 老人, 夜间"
                className="w-full px-4 py-3 rounded-xl bg-[#0a1e30] border border-[#2a4a64] text-white placeholder-[#556677] focus:outline-none focus:border-[#FF6B35] transition-colors"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#0F2A44] rounded-2xl p-6 border border-[#1a3a54] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#FF6B35]" />
              <h2 className="text-white font-bold">对话节点</h2>
              <span className="text-xs text-[#667788] bg-[#1a3a54] px-2 py-0.5 rounded-full">
                {nodeList.length} 个节点 · {infoPointCount} 个信息点
              </span>
            </div>
            <button
              onClick={addEmptyNode}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1a3a54] text-[#8899aa] hover:text-white hover:bg-[#1f4060] transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              添加节点
            </button>
          </div>

          {nodeList.length === 0 ? (
            <div className="text-center py-10 text-[#556677]">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无对话节点</p>
              <p className="text-xs mt-1">点击"添加节点"创建对话流程</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nodeList.map((node) => (
                <div
                  key={node.id}
                  className="bg-[#0a1e30] rounded-xl p-4 border border-[#1a3a54]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                        node.speaker === 'passenger'
                          ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
                          : node.speaker === 'system'
                            ? 'bg-[#2EC4B6]/10 text-[#2EC4B6]'
                            : 'bg-[#8899aa]/10 text-[#8899aa]'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      {speakerLabels[node.speaker] ?? node.speaker}
                    </span>
                    {node.isEnding && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">
                        结束节点
                      </span>
                    )}
                    <span className="text-xs text-[#556677] ml-auto">{node.id}</span>
                  </div>

                  <p className="text-sm text-[#8899aa] line-clamp-2 mb-2">
                    {node.text || '（空文本）'}
                  </p>

                  {node.options.length > 0 && (
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-[#1a3a54]">
                      <div className="flex items-center gap-1 text-xs text-[#556677] mb-1">
                        <GitBranch className="w-3 h-3" />
                        选项 ({node.options.length})
                      </div>
                      {node.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center gap-2 text-xs text-[#667788] bg-[#0F2A44] rounded-lg px-3 py-2"
                        >
                          <span className="px-1.5 py-0.5 rounded bg-[#1a3a54] text-[#8899aa]">
                            {categoryLabels[option.category] ?? option.category}
                          </span>
                          <span className="flex-1 truncate">{option.text}</span>
                          <span className="text-[#556677]">
                            {option.scoreDelta > 0 ? '+' : ''}
                            {option.scoreDelta}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button
            onClick={() => navigate('/supervisor/cases')}
            className="px-6 py-3 rounded-xl bg-[#1a3a54] text-[#8899aa] hover:text-white hover:bg-[#1f4060] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#e85d2c] text-white font-medium hover:from-[#e85d2c] hover:to-[#d04f24] transition-all shadow-lg shadow-[#FF6B35]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
