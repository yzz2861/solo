import { useState, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { useParams } from 'react-router-dom'
import { Download, FileText, Lock, User, FileSpreadsheet } from 'lucide-react'
import { getRankedWorks } from '@/utils/validation'
import { exportPublicReport, exportInternalReport, exportAuthorCommentary, downloadTextFile } from '@/utils/export'
import type { AwardLevel } from '@/types'

const defaultAwards: AwardLevel[] = [
  { label: '金奖', count: 1, color: '#C9A84C' },
  { label: '银奖', count: 2, color: '#C8C5BC' },
  { label: '铜奖', count: 3, color: '#B45309' },
]

export default function Export() {
  const { id: eventId } = useParams<{ id: string }>()
  const events = useStore((s) => s.events)
  const works = useStore((s) => s.works)
  const scores = useStore((s) => s.scores)
  const judges = useStore((s) => s.judges)

  const [awards, setAwards] = useState<AwardLevel[]>(defaultAwards)
  const [selectedAuthor, setSelectedAuthor] = useState('')

  const event = events.find((e) => e.id === eventId)
  const eventWorks = works.filter((w) => w.eventId === eventId)
  const eventJudges = judges.filter((j) => j.eventId === eventId)
  const eventScores = scores.filter((s) =>
    eventWorks.some((w) => w.id === s.workId)
  )

  const rankedWorks = useMemo(
    () => getRankedWorks(eventWorks, eventScores, eventJudges),
    [eventWorks, eventScores, eventJudges]
  )

  const authors = useMemo(
    () => [...new Set(eventWorks.map((w) => w.author))].sort(),
    [eventWorks]
  )

  const eventName = event?.name ?? '未命名活动'
  const eventDate = event?.date ?? ''

  const updateAwardCount = (index: number, count: number) => {
    setAwards((prev) =>
      prev.map((a, i) => (i === index ? { ...a, count } : a))
    )
  }

  const handlePublicExport = () => {
    const md = exportPublicReport(eventName, eventDate, rankedWorks, eventScores, eventJudges, awards)
    downloadTextFile(md, `${eventName}_公开版.md`)
  }

  const handleInternalExport = () => {
    const md = exportInternalReport(eventName, eventDate, rankedWorks, eventScores, eventJudges, awards)
    downloadTextFile(md, `${eventName}_内部明细.md`)
  }

  const handleCommentaryExport = () => {
    if (!selectedAuthor) return
    const md = exportAuthorCommentary(selectedAuthor, eventWorks, eventScores, eventJudges)
    downloadTextFile(md, `${selectedAuthor}_点评稿.md`)
  }

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10 text-center">
          <h1 className="font-display text-3xl font-bold tracking-wide text-gold-500">
            导出中心
          </h1>
          <p className="mt-2 text-dark-200">{eventName}</p>
        </header>

        <section className="mb-10 rounded-xl border border-dark-400/30 bg-dark-600 p-6">
          <h2 className="mb-4 text-lg font-semibold text-dark-50">奖项配置</h2>
          <div className="flex flex-wrap items-end gap-6">
            {awards.map((award, i) => (
              <div key={award.label} className="flex items-end gap-2">
                <span className="text-sm font-medium" style={{ color: award.color }}>
                  {award.label}
                </span>
                <span className="text-dark-300">×</span>
                <input
                  type="number"
                  min={0}
                  value={award.count}
                  onChange={(e) => updateAwardCount(i, Number(e.target.value))}
                  className="w-16 rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-1.5 text-center text-dark-50 focus:border-gold-500/50 focus:outline-none"
                />
                <span className="text-sm text-dark-300">名</span>
              </div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-3 gap-6">
          <div className="group flex flex-col rounded-xl border border-dark-400/30 bg-dark-600 p-6 transition hover:border-green-400/30 hover:bg-dark-500">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-400/10">
              <FileText className="h-6 w-6 text-green-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-dark-50">公开版导出</h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-dark-200">
              获奖名单与评委综合点评，不包含个人评分
            </p>
            <button
              onClick={handlePublicExport}
              className="flex items-center justify-center gap-2 rounded-lg border border-green-400/40 bg-green-400/15 px-4 py-2.5 text-sm font-medium text-green-400 transition hover:bg-green-400/25"
            >
              <Download className="h-4 w-4" />
              导出公开版
            </button>
          </div>

          <div className="group flex flex-col rounded-xl border border-dark-400/30 bg-dark-600 p-6 transition hover:border-gold-500/30 hover:bg-dark-500">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gold-500/10">
              <Lock className="h-6 w-6 text-gold-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-dark-50">内部版导出</h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed text-dark-200">
              包含每位评委的个人评分明细和点评
            </p>
            <button
              onClick={handleInternalExport}
              className="flex items-center justify-center gap-2 rounded-lg border border-gold-500/40 bg-gold-500/15 px-4 py-2.5 text-sm font-medium text-gold-500 transition hover:bg-gold-500/25"
            >
              <Download className="h-4 w-4" />
              导出内部版
            </button>
          </div>

          <div className="group flex flex-col rounded-xl border border-dark-400/30 bg-dark-600 p-6 transition hover:border-blue-400/30 hover:bg-dark-500">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-400/10">
              <User className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-dark-50">点评稿下载</h3>
            <p className="mb-4 flex-1 text-sm leading-relaxed text-dark-200">
              按作者筛选，下载本人作品点评稿
            </p>
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="mb-3 w-full rounded-lg border border-dark-400/30 bg-dark-700 px-3 py-2 text-sm text-dark-50 focus:border-blue-400/50 focus:outline-none"
            >
              <option value="">选择作者</option>
              {authors.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <button
              onClick={handleCommentaryExport}
              disabled={!selectedAuthor}
              className="flex items-center justify-center gap-2 rounded-lg border border-blue-400/40 bg-blue-400/15 px-4 py-2.5 text-sm font-medium text-blue-400 transition hover:bg-blue-400/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" />
              下载点评稿
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
