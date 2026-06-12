import { useEffect, useState } from 'react'
import { useTournament } from '@/store/tournament'
import { TournamentInfoPanel } from '@/components/TournamentInfoPanel'
import { PlayersPanel } from '@/components/PlayersPanel'
import { RoundsPanel } from '@/components/RoundsPanel'
import { StandingsPanel } from '@/components/StandingsPanel'
import { ArchivePanel } from '@/components/ArchivePanel'
import clsx from 'clsx'

type Tab = 'info' | 'players' | 'rounds' | 'standings' | 'archive'

export default function App() {
  const init = useTournament((s) => s.init)
  const loaded = useTournament((s) => s.loaded)
  const state = useTournament((s) => s.state)
  const lastError = useTournament((s) => s.lastError)
  const saveToDisk = useTournament((s) => s.saveToDisk)

  const [tab, setTab] = useState<Tab>('info')

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!window.api) return
    const offSave = window.api.onRequestSave(() => saveToDisk())
    const offExport = window.api.onMenuExport(() => {
      useTournament.getState().exportToFile()
    })
    const offImport = window.api.onMenuImport(() => {
      useTournament.getState().importFromFile()
    })
    return () => {
      offSave()
      offExport()
      offImport()
    }
  }, [saveToDisk])

  if (!loaded) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-stone-500">加载比赛数据中…</div>
      </div>
    )
  }

  const playerCount = state.players.length
  const activeCount = state.players.filter((p) => p.status === 'active').length
  const completedRounds = state.rounds.filter((r) => r.status === 'completed').length

  const TABS: { key: Tab; label: string; badge?: string | number }[] = [
    { key: 'info', label: '赛事设置' },
    { key: 'players', label: '选手名单', badge: playerCount },
    { key: 'rounds', label: `对阵轮次 (${completedRounds}/${state.info.totalRounds})` },
    { key: 'standings', label: '积分排名', badge: activeCount },
    { key: 'archive', label: '档案管理' },
  ]

  return (
    <div className="h-full flex flex-col">
      <header className="no-print bg-gradient-to-r from-accent-dark via-accent to-accent-light text-white px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-wide">♞ 棋社比赛编排台</h1>
            <div className="text-xs text-amber-100/90 mt-0.5">
              {state.info.name || '未命名赛事'} · {state.info.date} · {activeCount}/{playerCount} 名有效选手
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="px-2 py-1 rounded bg-white/15">
              已保存 {state.updatedAt ? new Date(state.updatedAt).toLocaleTimeString() : '-'}
            </span>
          </div>
        </div>
      </header>

      {lastError && (
        <div className="no-print bg-red-50 border-b border-red-200 text-red-700 px-6 py-2 text-sm flex items-center justify-between">
          <span>⚠ {lastError}</span>
          <button
            className="text-red-500 hover:text-red-700"
            onClick={() => useTournament.setState({ lastError: null })}
          >
            关闭
          </button>
        </div>
      )}

      <nav className="no-print border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="flex items-center px-6">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx('tab', tab === t.key && 'tab-active')}
            >
              <span className="inline-flex items-center gap-1.5">
                {t.label}
                {t.badge && (
                  <span className="badge bg-stone-200 text-stone-700">{t.badge}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 overflow-auto p-6">
        {tab === 'info' && <TournamentInfoPanel />}
        {tab === 'players' && <PlayersPanel />}
        {tab === 'rounds' && <RoundsPanel />}
        {tab === 'standings' && <StandingsPanel />}
        {tab === 'archive' && <ArchivePanel />}
      </main>

      <footer className="no-print border-t border-stone-200 bg-stone-100 px-6 py-2 text-xs text-stone-500 flex items-center justify-between">
        <div>
          共 <b>{state.info.totalRounds}</b> 轮 · 胜得{' '}
          <b>{state.info.winPoints}</b> 分 · 和得 <b>{state.info.drawPoints}</b> 分 · 负得{' '}
          <b>{state.info.lossPoints}</b> 分
          {state.info.avoidSameTeam && ' · 同队规避'}
          {state.info.avoidSameTeamRound1 && '（第1轮严格）'}
          {` · 最多重复对阵 ${state.info.maxRepeatEncounters} 次`}
        </div>
        <div>数据位置：用户目录/AppData/棋社比赛编排台</div>
      </footer>
    </div>
  )
}
