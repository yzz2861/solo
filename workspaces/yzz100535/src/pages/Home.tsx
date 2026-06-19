import { useState } from 'react'
import { useStore } from '@/store/useStore'
import type { AppEvent } from '@/types'
import { useNavigate } from 'react-router-dom'
import { Plus, Camera, Calendar, Trash2, ChevronRight, Trophy } from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

interface FormState {
  name: string
  date: string
  scoreMin: number
  scoreMax: number
  maxWorksPerAuthor: number
}

const defaultForm = (): FormState => ({
  name: '',
  date: today(),
  scoreMin: 1,
  scoreMax: 10,
  maxWorksPerAuthor: 3,
})

export default function Home() {
  const navigate = useNavigate()
  const events = useStore((s) => s.events)
  const addEvent = useStore((s) => s.addEvent)
  const deleteEvent = useStore((s) => s.deleteEvent)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)

  const openModal = () => {
    setForm(defaultForm())
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const handleCreate = () => {
    if (!form.name.trim()) return
    addEvent({
      name: form.name.trim(),
      date: form.date,
      scoreMin: form.scoreMin,
      scoreMax: form.scoreMax,
      maxWorksPerAuthor: form.maxWorksPerAuthor,
    })
    closeModal()
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteEvent(id)
  }

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <Camera className="h-8 w-8 text-gold-500" />
            <h1 className="font-display text-5xl font-bold tracking-wide text-gold-500">
              摄影协会评片台
            </h1>
          </div>
          <p className="text-lg text-dark-200">
            管理摄影评片活动，组织评委打分，公正评选优秀作品
          </p>
        </header>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-dark-50">活动列表</h2>
          <button
            onClick={openModal}
            className="flex items-center gap-2 rounded-lg border border-gold-500/50 bg-gold-500/20 px-4 py-2 text-sm font-medium text-gold-500 transition hover:bg-gold-500/30"
          >
            <Plus className="h-4 w-4" />
            创建活动
          </button>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dark-400/30 bg-dark-600 py-20">
            <Camera className="mb-4 h-12 w-12 text-dark-300" />
            <p className="text-dark-300">暂无评片活动，点击上方按钮创建</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/event/${event.id}`)}
                onDelete={(e) => handleDelete(e, event.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="animate-fade-up w-full max-w-lg rounded-xl border border-dark-400/30 bg-dark-600 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-xl font-semibold text-gold-500">创建评片活动</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-dark-100">活动名称</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="请输入活动名称"
                  className="w-full rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-dark-50 placeholder:text-dark-300 focus:border-gold-500/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-dark-100">活动日期</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  className="w-full rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-dark-50 focus:border-gold-500/50 focus:outline-none"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-dark-100">最低评分</label>
                  <input
                    type="number"
                    value={form.scoreMin}
                    onChange={(e) => updateField('scoreMin', Number(e.target.value))}
                    min={0}
                    className="w-full rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-dark-50 focus:border-gold-500/50 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-sm text-dark-100">最高评分</label>
                  <input
                    type="number"
                    value={form.scoreMax}
                    onChange={(e) => updateField('scoreMax', Number(e.target.value))}
                    min={form.scoreMin}
                    className="w-full rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-dark-50 focus:border-gold-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm text-dark-100">每人作品上限</label>
                <input
                  type="number"
                  value={form.maxWorksPerAuthor}
                  onChange={(e) => updateField('maxWorksPerAuthor', Number(e.target.value))}
                  min={1}
                  className="w-full rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-dark-50 focus:border-gold-500/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-lg border border-dark-400/30 bg-dark-700 px-4 py-2 text-sm text-dark-100 transition hover:bg-dark-500"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim()}
                className="rounded-lg border border-gold-500/50 bg-gold-500/20 px-4 py-2 text-sm font-medium text-gold-500 transition hover:bg-gold-500/30 disabled:cursor-not-allowed disabled:opacity-40"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EventCard({
  event,
  onClick,
  onDelete,
}: {
  event: AppEvent
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center gap-4 rounded-xl border border-dark-400/30 bg-dark-600 px-5 py-4 transition hover:border-gold-500/30 hover:bg-dark-500"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gold-500/10">
        <Trophy className="h-5 w-5 text-gold-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-semibold text-dark-50">{event.name}</h3>
          <span
            className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              event.revealed
                ? 'bg-green-500/15 text-green-400'
                : 'bg-dark-400/20 text-dark-200'
            }`}
          >
            {event.revealed ? '已揭晓' : '评审中'}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-dark-200">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {event.date}
          </span>
          <span>评分 {event.scoreMin}-{event.scoreMax}</span>
          <span>上限 {event.maxWorksPerAuthor} 幅/人</span>
        </div>
      </div>

      <button
        onClick={onDelete}
        className="flex-shrink-0 rounded-lg p-2 text-dark-300 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <ChevronRight className="h-4 w-4 flex-shrink-0 text-dark-300 transition group-hover:text-gold-500" />
    </div>
  )
}
