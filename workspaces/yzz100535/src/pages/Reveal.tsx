import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { useParams } from 'react-router-dom'
import { Trophy, Eye, EyeOff, Medal, Star } from 'lucide-react'
import { getRankedWorks } from '@/utils/validation'
import type { AwardLevel } from '@/types'

const defaultAwards: AwardLevel[] = [
  { label: '金奖', count: 1, color: 'gold' },
  { label: '银奖', count: 2, color: 'silver' },
  { label: '铜奖', count: 3, color: 'bronze' },
]

function getAwardForWork(
  rank: number,
  awards: AwardLevel[]
): AwardLevel | null {
  let cumulative = 0
  for (const award of awards) {
    cumulative += award.count
    if (rank <= cumulative) return award
  }
  return null
}

function getRankBorderStyle(rank: number) {
  if (rank === 1) return 'border-gold-500'
  if (rank === 2) return 'border-dark-100'
  if (rank === 3) return 'border-amber-700'
  return 'border-dark-400/30'
}

function getRankBgStyle(rank: number) {
  if (rank === 1) return 'bg-gradient-to-br from-gold-500/15 to-dark-600'
  if (rank === 2) return 'bg-gradient-to-br from-dark-100/10 to-dark-600'
  if (rank === 3) return 'bg-gradient-to-br from-amber-700/15 to-dark-600'
  return 'bg-dark-600'
}

function getMedalIcon(rank: number) {
  if (rank === 1) return <Medal className="h-6 w-6 text-gold-400" />
  if (rank === 2) return <Medal className="h-6 w-6 text-dark-100" />
  if (rank === 3) return <Medal className="h-6 w-6 text-amber-600" />
  return null
}

function getAwardBadge(award: AwardLevel) {
  const colorMap: Record<string, string> = {
    gold: 'bg-gold-500/20 text-gold-400 border-gold-500/40',
    silver: 'bg-dark-100/20 text-dark-100 border-dark-100/40',
    bronze: 'bg-amber-700/20 text-amber-500 border-amber-700/40',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorMap[award.color] || 'bg-dark-400/20 text-dark-200 border-dark-400/30'}`}
    >
      <Star className="h-3 w-3" />
      {award.label}
    </span>
  )
}

export default function Reveal() {
  const { id } = useParams<{ id: string }>()
  const events = useStore((s) => s.events)
  const works = useStore((s) => s.works)
  const scores = useStore((s) => s.scores)
  const judges = useStore((s) => s.judges)
  const revealEvent = useStore((s) => s.revealEvent)
  const unrevealEvent = useStore((s) => s.unrevealEvent)

  const event = events.find((e) => e.id === id)
  const eventWorks = works.filter((w) => w.eventId === id)
  const eventJudges = judges.filter((j) => j.eventId === id)
  const ranked = getRankedWorks(eventWorks, scores, eventJudges)
  const revealed = event?.revealed ?? false

  const [awards, setAwards] = useState<AwardLevel[]>(defaultAwards)

  const updateAwardCount = (index: number, count: number) => {
    setAwards((prev) =>
      prev.map((a, i) => (i === index ? { ...a, count: Math.max(0, count) } : a))
    )
  }

  if (!event) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-dark-300">活动不存在</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8 flex items-start justify-between">
        <div className="flex flex-col items-center flex-1">
          <h2 className="mb-6 font-display text-2xl font-bold text-dark-50">
            揭晓排名
          </h2>

          {!revealed ? (
            <button
              onClick={() => id && revealEvent(id)}
              className="animate-pulse-gold flex items-center gap-2 rounded-xl border border-gold-500/60 bg-gold-500/20 px-8 py-4 text-lg font-semibold text-gold-400 transition hover:bg-gold-500/30"
            >
              <Eye className="h-6 w-6" />
              揭晓作者
            </button>
          ) : (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 rounded-xl border border-green-500/40 bg-green-500/15 px-6 py-3 text-base font-semibold text-green-400">
                <EyeOff className="h-5 w-5" />
                已揭晓
              </span>
              <button
                onClick={() => id && unrevealEvent(id)}
                className="flex items-center gap-2 rounded-lg border border-dark-400/40 bg-dark-500 px-4 py-2.5 text-sm font-medium text-dark-200 transition hover:bg-dark-400 hover:text-dark-100"
              >
                重新隐藏
              </button>
            </div>
          )}
        </div>

        <div className="w-56 rounded-xl border border-dark-400/30 bg-dark-600 p-4">
          <h3 className="mb-3 text-sm font-semibold text-dark-100">奖项配置</h3>
          <div className="space-y-2.5">
            {awards.map((award, i) => (
              <div key={award.label} className="flex items-center justify-between gap-2">
                <span className="text-sm text-dark-200">{award.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-dark-300">×</span>
                  <input
                    type="number"
                    min={0}
                    value={award.count}
                    onChange={(e) => updateAwardCount(i, parseInt(e.target.value) || 0)}
                    className="w-12 rounded border border-dark-400/40 bg-dark-700 px-2 py-1 text-center text-sm text-dark-50 focus:border-gold-500/50 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dark-400/30 bg-dark-600 py-20">
          <Trophy className="mb-4 h-12 w-12 text-dark-300" />
          <p className="text-dark-300">暂无作品数据</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ranked.map((work) => {
            const award = getAwardForWork(work.rank, awards)
            return (
              <div
                key={work.id}
                className={`flex items-center gap-5 rounded-xl border-2 px-5 py-4 transition ${getRankBorderStyle(work.rank)} ${getRankBgStyle(work.rank)}`}
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                  {getMedalIcon(work.rank) || (
                    <span className="text-base font-bold text-dark-300">
                      {work.rank}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-dark-400/30 px-2 py-0.5 font-mono text-xs text-dark-200">
                      {work.anonymousCode}
                    </span>
                    <span className="text-sm text-dark-200">《{work.theme}》</span>
                    {award && getAwardBadge(award)}
                  </div>
                  <div className="mt-1.5">
                    {revealed ? (
                      <span className="animate-flip-in inline-block text-base font-semibold text-gold-400">
                        {work.author}
                      </span>
                    ) : (
                      <span className="text-base font-semibold text-dark-400">???</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <Star className="h-4 w-4 text-gold-500" />
                  <span className="text-lg font-bold text-dark-50">
                    {work.avgScore.toFixed(2)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
