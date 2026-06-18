import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, TrendingUp, Plus, ArrowLeft, CheckCircle } from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import type { ReviewTask, Reinspection } from '@/types'

const STATUS_LABELS: Record<ReviewTask['status'], string> = {
  pending: '待复查',
  in_progress: '复查中',
  completed: '已完成',
}

const STATUS_CLASSES: Record<ReviewTask['status'], string> = {
  pending: 'bg-sandalwood-400/20 text-sandalwood-400',
  in_progress: 'bg-celadon-400/20 text-celadon-400',
  completed: 'bg-ink-400/20 text-ink-400',
}

const STATUS_FLOW: ReviewTask['status'][] = ['pending', 'in_progress', 'completed']

export default function Review() {
  const navigate = useNavigate()
  const {
    diseases, components, reinspections, reviewTasks,
    addReviewTask, updateReviewTask, addReinspection, setSelectedComponentId,
  } = useStore()

  const [selectedDiseaseId, setSelectedDiseaseId] = useState<string>('')
  const [reinspectForm, setReinspectForm] = useState({
    diseaseId: '', conclusion: '', isExpanded: false, notes: '', inspectedBy: '',
  })

  const diseaseReinspections = selectedDiseaseId
    ? reinspections.filter(r => r.diseaseId === selectedDiseaseId).sort(
        (a, b) => new Date(a.inspectedAt).getTime() - new Date(b.inspectedAt).getTime()
      )
    : []

  const diseaseMap = Object.fromEntries(diseases.map(d => [d.id, d]))
  const componentMap = Object.fromEntries(components.map(c => [c.id, c]))

  const tableRows = diseases.map(d => {
    const dReinsps = reinspections.filter(r => r.diseaseId === d.id)
      .sort((a, b) => new Date(b.inspectedAt).getTime() - new Date(a.inspectedAt).getTime())
    const latest = dReinsps[0]
    const isExpanded = latest?.isExpanded ?? false
    const comp = componentMap[d.componentId]
    return {
      diseaseId: d.id,
      componentId: d.componentId,
      componentName: comp?.name ?? '未知',
      diseaseType: d.type,
      latestReinspect: latest?.inspectedAt?.slice(0, 10) ?? '—',
      isExpanded,
      count: dReinsps.length,
    }
  })

  return (
    <div className="min-h-screen bg-ink-900 p-6 space-y-8">
      <div className="flex items-center gap-4">
        <button className="btn-ghost flex items-center gap-1" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> 返回
        </button>
        <h1 className="font-serif text-2xl font-bold text-sandalwood-100">年度复查追踪</h1>
      </div>

      <section className="space-y-4">
        <h2 className="section-title flex items-center gap-2"><Calendar size={18} /> 复查任务</h2>
        <TaskForm onSubmit={(t) => addReviewTask(t)} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviewTasks.map(task => (
            <div key={task.id} className="glass-panel rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <h3 className="text-sandalwood-100 font-medium">{task.title}</h3>
                <span className="badge bg-sandalwood-700/30 text-sandalwood-200">{task.year}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-ink-300">
                <Clock size={12} />
                <span>截止 {task.deadline}</span>
              </div>
              <div className="text-xs text-ink-400">负责人：{task.assignedTo}</div>
              <div className="flex items-center justify-between">
                <span className={cn('badge', STATUS_CLASSES[task.status])}>
                  {STATUS_LABELS[task.status]}
                </span>
                {task.status !== 'completed' && (
                  <button
                    className="btn-ghost text-xs flex items-center gap-1"
                    onClick={() => {
                      const idx = STATUS_FLOW.indexOf(task.status)
                      if (idx < STATUS_FLOW.length - 1) {
                        updateReviewTask(task.id, { status: STATUS_FLOW[idx + 1] })
                      }
                    }}
                  >
                    <CheckCircle size={12} />
                    {task.status === 'pending' ? '开始复查' : '完成'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {reviewTasks.length === 0 && (
            <p className="text-ink-500 text-sm col-span-full text-center py-8">暂无复查任务</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title flex items-center gap-2"><TrendingUp size={18} /> 病害变化时间线</h2>
        <select
          className="input-field max-w-xs"
          value={selectedDiseaseId}
          onChange={e => setSelectedDiseaseId(e.target.value)}
        >
          <option value="">选择病害...</option>
          {diseases.map(d => (
            <option key={d.id} value={d.id}>
              {componentMap[d.componentId]?.name ?? '未知'} - {d.type}
            </option>
          ))}
        </select>

        {selectedDiseaseId && diseaseReinspections.length > 0 && (
          <div className="glass-panel rounded-xl p-6 overflow-x-auto">
            <div className="flex items-start gap-0 min-w-max">
              {diseaseReinspections.map((r, i) => (
                <div key={r.id} className="flex items-start">
                  <div className="flex flex-col items-center w-40">
                    <div className={cn(
                      'w-4 h-4 rounded-full border-2 shrink-0',
                      r.isExpanded ? 'bg-cinnabar-400 border-cinnabar-500 shadow-glow' : 'bg-celadon-400 border-celadon-500'
                    )} />
                    <div className="mt-2 text-center space-y-1 px-2">
                      <p className="text-xs text-ink-300">{r.inspectedAt.slice(0, 10)}</p>
                      <p className="text-xs text-ink-400">{r.inspectedBy}</p>
                      <p className="text-xs text-ink-200">{r.conclusion}</p>
                      {r.isExpanded ? (
                        <span className="badge bg-cinnabar-500/20 text-cinnabar-400 shadow-glow animate-glow">已扩展</span>
                      ) : (
                        <span className="badge bg-celadon-500/20 text-celadon-400">稳定</span>
                      )}
                    </div>
                  </div>
                  {i < diseaseReinspections.length - 1 && (
                    <div className={cn(
                      'h-0.5 w-16 mt-[7px]',
                      r.isExpanded ? 'bg-cinnabar-500/60' : 'bg-celadon-500/60'
                    )} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedDiseaseId && diseaseReinspections.length === 0 && (
          <p className="text-ink-500 text-sm">该病害暂无复查记录</p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="section-title flex items-center gap-2"><TrendingUp size={18} /> 扩展追踪表</h2>
        <div className="glass-panel rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700/50 text-ink-400 text-xs">
                <th className="py-3 px-4 text-left">构件名称</th>
                <th className="py-3 px-4 text-left">病害类型</th>
                <th className="py-3 px-4 text-left">最近复查</th>
                <th className="py-3 px-4 text-left">扩展状态</th>
                <th className="py-3 px-4 text-left">复查次数</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => (
                <tr
                  key={row.diseaseId}
                  className={cn(
                    'border-b border-ink-800 cursor-pointer transition-colors hover:bg-ink-700/30',
                    row.isExpanded && 'bg-cinnabar-900/20'
                  )}
                  onClick={() => {
                    setSelectedComponentId(row.componentId)
                    navigate('/')
                  }}
                >
                  <td className="py-3 px-4 text-ink-100">{row.componentName}</td>
                  <td className="py-3 px-4 text-ink-200">{row.diseaseType}</td>
                  <td className="py-3 px-4 text-ink-300">{row.latestReinspect}</td>
                  <td className="py-3 px-4">
                    {row.isExpanded ? (
                      <span className="badge bg-cinnabar-500/20 text-cinnabar-400">已扩展</span>
                    ) : (
                      <span className="badge bg-celadon-500/20 text-celadon-400">稳定</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-ink-300">{row.count}</td>
                </tr>
              ))}
              {tableRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">暂无病害数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="section-title flex items-center gap-2"><Plus size={18} /> 添加复查记录</h2>
        <div className="glass-panel rounded-xl p-4 max-w-lg space-y-3">
          <label className="block text-xs text-ink-400">选择病害</label>
          <select
            className="input-field"
            value={reinspectForm.diseaseId}
            onChange={e => setReinspectForm(f => ({ ...f, diseaseId: e.target.value }))}
          >
            <option value="">请选择...</option>
            {diseases.map(d => (
              <option key={d.id} value={d.id}>
                {componentMap[d.componentId]?.name ?? '未知'} - {d.type}
              </option>
            ))}
          </select>
          <label className="block text-xs text-ink-400">复查结论</label>
          <input
            className="input-field"
            placeholder="输入复查结论"
            value={reinspectForm.conclusion}
            onChange={e => setReinspectForm(f => ({ ...f, conclusion: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-ink-200 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-ink-600 bg-ink-800 text-cinnabar-500 focus:ring-cinnabar-500"
              checked={reinspectForm.isExpanded}
              onChange={e => setReinspectForm(f => ({ ...f, isExpanded: e.target.checked }))}
            />
            病害已扩展
          </label>
          <label className="block text-xs text-ink-400">备注</label>
          <input
            className="input-field"
            placeholder="备注（可选）"
            value={reinspectForm.notes}
            onChange={e => setReinspectForm(f => ({ ...f, notes: e.target.value }))}
          />
          <label className="block text-xs text-ink-400">复查人</label>
          <input
            className="input-field"
            placeholder="复查人姓名"
            value={reinspectForm.inspectedBy}
            onChange={e => setReinspectForm(f => ({ ...f, inspectedBy: e.target.value }))}
          />
          <button
            className="btn-primary w-full flex items-center justify-center gap-1"
            onClick={() => {
              if (!reinspectForm.diseaseId || !reinspectForm.conclusion) return
              const newReinspection: Reinspection = {
                id: `ri-${Date.now()}`,
                diseaseId: reinspectForm.diseaseId,
                taskId: '',
                inspectedAt: new Date().toISOString(),
                inspectedBy: reinspectForm.inspectedBy,
                conclusion: reinspectForm.conclusion,
                isExpanded: reinspectForm.isExpanded,
                notes: reinspectForm.notes,
              }
              addReinspection(newReinspection)
              setReinspectForm({ diseaseId: '', conclusion: '', isExpanded: false, notes: '', inspectedBy: '' })
            }}
          >
            <Plus size={14} /> 提交复查
          </button>
        </div>
      </section>
    </div>
  )
}

function TaskForm({ onSubmit }: { onSubmit: (task: ReviewTask) => void }) {
  const [form, setForm] = useState({
    title: '', year: new Date().getFullYear(), assignedTo: '', deadline: '',
  })
  const [open, setOpen] = useState(false)

  if (!open) {
    return (
      <button className="btn-ghost flex items-center gap-1" onClick={() => setOpen(true)}>
        <Plus size={14} /> 新建复查任务
      </button>
    )
  }

  return (
    <div className="glass-panel rounded-xl p-4 max-w-lg space-y-3">
      <input
        className="input-field"
        placeholder="任务标题"
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
      />
      <div className="flex gap-3">
        <input
          className="input-field w-28"
          type="number"
          placeholder="年份"
          value={form.year}
          onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
        />
        <input
          className="input-field flex-1"
          placeholder="负责人"
          value={form.assignedTo}
          onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
        />
      </div>
      <input
        className="input-field"
        type="date"
        value={form.deadline}
        onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
      />
      <div className="flex gap-2">
        <button
          className="btn-primary flex-1"
          onClick={() => {
            if (!form.title) return
            onSubmit({
              id: `rt-${Date.now()}`,
              projectId: '',
              title: form.title,
              year: form.year,
              assignedTo: form.assignedTo,
              deadline: form.deadline,
              status: 'pending',
            })
            setForm({ title: '', year: new Date().getFullYear(), assignedTo: '', deadline: '' })
            setOpen(false)
          }}
        >
          创建
        </button>
        <button className="btn-ghost" onClick={() => setOpen(false)}>取消</button>
      </div>
    </div>
  )
}
