import { useState, useEffect } from 'react'
import { useCaseStore } from '@/store/useCaseStore'
import { useStudentStore } from '@/store/useStudentStore'
import { useGameStore } from '@/store/useGameStore'
import PageHeader from '@/components/common/PageHeader'
import { cn } from '@/lib/utils'
import type { RetrainingPlan } from '@/types'
import {
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Calendar,
  ClipboardList,
  CheckSquare,
  Square,
  AlertTriangle,
  Trophy,
  Target,
} from 'lucide-react'

function getStatusColor(avgScore: number) {
  if (avgScore >= 70) return 'bg-[#2EC4B6]'
  if (avgScore >= 50) return 'bg-[#FF6B35]'
  return 'bg-red-500'
}

function getStatusLabel(avgScore: number) {
  if (avgScore >= 70) return '达标'
  if (avgScore >= 50) return '待提升'
  return '需补训'
}

function getStatusTextColor(avgScore: number) {
  if (avgScore >= 70) return 'text-[#2EC4B6]'
  if (avgScore >= 50) return 'text-[#FF6B35]'
  return 'text-red-400'
}

export default function Retraining() {
  const { students, getStudentAvgScore, getStudentCompletedScenarios } = useStudentStore()
  const { scenarios, retrainingPlans, addRetrainingPlan, deleteRetrainingPlan, leader, loadRetrainingPlans } = useCaseStore()
  const { allSessions } = useGameStore()

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [requiredScenarioIds, setRequiredScenarioIds] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    loadRetrainingPlans()
  }, [loadRetrainingPlans])

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const toggleScenario = (scenarioId: string) => {
    setRequiredScenarioIds((prev) => {
      const next = new Set(prev)
      if (next.has(scenarioId)) {
        next.delete(scenarioId)
      } else {
        next.add(scenarioId)
      }
      return next
    })
  }

  const handleSubmit = () => {
    setFormError('')

    if (!title.trim()) {
      setFormError('请输入计划标题')
      return
    }
    if (!deadline) {
      setFormError('请选择截止日期')
      return
    }
    if (selectedStudentIds.size === 0) {
      setFormError('请至少选择一名学员')
      return
    }
    if (requiredScenarioIds.size === 0) {
      setFormError('请至少选择一个补训场景')
      return
    }

    const plan: RetrainingPlan = {
      id: `plan-${Date.now()}`,
      leaderId: leader.leaderId,
      title: title.trim(),
      deadline,
      requiredScenarioIds: [...requiredScenarioIds],
      studentIds: [...selectedStudentIds],
      note: note.trim(),
      createdAt: Date.now(),
    }

    addRetrainingPlan(plan)

    setTitle('')
    setDeadline('')
    setRequiredScenarioIds(new Set())
    setNote('')
    setSelectedStudentIds(new Set())
  }

  const handleDeletePlan = (planId: string) => {
    deleteRetrainingPlan(planId)
  }

  const selectedStudents = students.filter((s) => selectedStudentIds.has(s.id))

  return (
    <div className="min-h-screen bg-[#0a1e30]">
      <PageHeader
        title="补训安排"
        subtitle={`${leader.name} · ${leader.leaderId}`}
        backPath="/leader/login"
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Student Grid */}
        <section>
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#2EC4B6]" />
            学员列表
            <span className="text-xs text-[#667788] font-normal">点击选择需要补训的学员</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {students.map((student) => {
              const avgScore = getStudentAvgScore(student.id, allSessions)
              const completedCount = getStudentCompletedScenarios(student.id, allSessions).length
              const isSelected = selectedStudentIds.has(student.id)

              return (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={cn(
                    'relative text-left bg-[#0F2A44] rounded-2xl p-4 border transition-all hover:-translate-y-0.5',
                    isSelected
                      ? 'border-[#2EC4B6] shadow-lg shadow-[#2EC4B6]/10'
                      : 'border-[#1a3a54] hover:border-[#2a5a84]'
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium text-sm truncate">{student.name}</span>
                    <div className={cn('w-2.5 h-2.5 rounded-full', getStatusColor(avgScore))} />
                  </div>
                  <div className="text-xs text-[#667788] mb-2">{student.group}</div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3.5 h-3.5 text-[#667788]" />
                      <span className={cn('text-sm font-bold', getStatusTextColor(avgScore))}>
                        {avgScore.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-[#667788]" />
                      <span className="text-sm text-[#667788]">{completedCount}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        avgScore >= 70
                          ? 'bg-[#2EC4B6]/10 text-[#2EC4B6]'
                          : avgScore >= 50
                            ? 'bg-[#FF6B35]/10 text-[#FF6B35]'
                            : 'bg-red-500/10 text-red-400'
                      )}
                    >
                      {getStatusLabel(avgScore)}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#2EC4B6] flex items-center justify-center">
                      <UserCheck className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* Selected Students */}
        {selectedStudents.length > 0 && (
          <section className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
            <h2 className="text-white font-bold mb-3 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#2EC4B6]" />
              已选学员
              <span className="text-xs text-[#667788] font-normal">({selectedStudents.length}人)</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {selectedStudents.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2EC4B6]/10 text-[#2EC4B6] rounded-full text-sm"
                >
                  {s.name}
                  <button
                    onClick={() => toggleStudent(s.id)}
                    className="hover:text-white transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Create Retraining Plan Form */}
        <section className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]">
          <h2 className="text-white font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#2EC4B6]" />
            创建补训计划
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-[#8899aa] mb-2">计划标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例：A组第三周补训"
                className="w-full px-4 py-3 bg-[#1a3a54] border border-[#2a4a64] rounded-xl text-white placeholder-[#556677] focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-[#8899aa] mb-2">截止日期</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#667788]" />
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-[#1a3a54] border border-[#2a4a64] rounded-xl text-white focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/30 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#8899aa] mb-2">必训场景</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {scenarios.map((scenario) => {
                  const checked = requiredScenarioIds.has(scenario.id)
                  return (
                    <button
                      key={scenario.id}
                      onClick={() => toggleScenario(scenario.id)}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-colors text-left',
                        checked
                          ? 'bg-[#2EC4B6]/10 border-[#2EC4B6]/30'
                          : 'bg-[#1a3a54] border-[#2a4a64] hover:border-[#3a5a74]'
                      )}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-[#2EC4B6] flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-[#667788] flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">{scenario.title}</div>
                        <div className="text-xs text-[#667788] truncate">{scenario.description.slice(0, 30)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#8899aa] mb-2">备注</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="补充说明（选填）"
                rows={3}
                className="w-full px-4 py-3 bg-[#1a3a54] border border-[#2a4a64] rounded-xl text-white placeholder-[#556677] focus:outline-none focus:border-[#2EC4B6] focus:ring-1 focus:ring-[#2EC4B6]/30 transition-colors resize-none"
              />
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#2EC4B6] to-[#25a99d] text-white font-bold hover:from-[#36d4c6] hover:to-[#2db9ab] transition-all shadow-lg shadow-[#2EC4B6]/20 hover:shadow-[#2EC4B6]/30 active:scale-[0.98]"
            >
              创建补训计划
            </button>
          </div>
        </section>

        {/* Existing Retraining Plans */}
        {retrainingPlans.length > 0 && (
          <section>
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#2EC4B6]" />
              已有补训计划
            </h2>
            <div className="space-y-4">
              {retrainingPlans.map((plan) => {
                const planStudents = students.filter((s) => plan.studentIds.includes(s.id))
                const planScenarios = scenarios.filter((s) => plan.requiredScenarioIds.includes(s.id))

                return (
                  <div
                    key={plan.id}
                    className="bg-[#0F2A44] rounded-2xl p-5 border border-[#1a3a54]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-white font-bold">{plan.title}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-[#667788] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            截止：{plan.deadline}
                          </span>
                          <span className="text-xs text-[#667788] flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5" />
                            {planStudents.length}人
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mb-3">
                      <span className="text-xs text-[#667788]">补训学员：</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {planStudents.map((s) => (
                          <span
                            key={s.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-[#1a3a54] text-[#8899aa]"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-xs text-[#667788]">必训场景：</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {planScenarios.map((s) => (
                          <span
                            key={s.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-[#2EC4B6]/10 text-[#2EC4B6]"
                          >
                            {s.title}
                          </span>
                        ))}
                      </div>
                    </div>

                    {plan.note && (
                      <div className="mt-3 text-xs text-[#667788] bg-[#1a3a54] rounded-xl p-3">
                        {plan.note}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
