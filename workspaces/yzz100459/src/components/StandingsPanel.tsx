import { useMemo, useState } from 'react'
import { useTournament } from '@/store/tournament'
import clsx from 'clsx'
import { STATUS_LABELS } from '@/types/tournament'

export function StandingsPanel() {
  const tiebreaks = useTournament((s) => s.getTiebreaks())
  const scores = useTournament((s) => s.getScores())
  const players = useTournament((s) => s.state.players)
  const rounds = useTournament((s) => s.state.rounds)
  const info = useTournament((s) => s.state.info)
  const printStandings = useTournament((s) => s.printStandings)
  const pairings = useTournament((s) => s.state.pairings)

  const [showDetailOf, setShowDetailOf] = useState<string | null>(null)

  const byId = useMemo(() => {
    const m: Record<string, (typeof players)[number]> = {}
    for (const p of players) m[p.id] = p
    return m
  }, [players])

  const totalCompleted = rounds.filter((r) => r.status === 'completed').length
  const tournamentDone = totalCompleted >= info.totalRounds

  const grouped = useMemo(() => {
    const groups: Record<string, typeof tiebreaks> = {}
    for (const t of tiebreaks) {
      const k = String(t.score)
      if (!groups[k]) groups[k] = []
      groups[k].push(t)
    }
    return groups
  }, [tiebreaks])

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-accent-dark">
            🏆 {tournamentDone ? '最终名次' : '实时积分排名'}
          </h3>
          <div className="text-xs text-stone-500 mt-1">
            已完成 <b>{totalCompleted}</b> / {info.totalRounds} 轮 · 共{' '}
            <b>{players.length}</b> 位选手 · 同分按「直胜分 → SB分 → 布赫兹分 → 胜局 → 执黑胜 → 对手平均分 → 等级分」
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline text-xs" onClick={printStandings}>
            🖨 打印名次表
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead className="sticky top-0">
              <tr>
                <th className="w-14 text-center">名次</th>
                <th className="w-12 text-center">#</th>
                <th>选手</th>
                <th className="w-24 text-center">队伍</th>
                <th className="w-20 text-right">等级分</th>
                <th className="w-20 text-right">积分</th>
                <th className="w-20 text-right">SB</th>
                <th className="w-20 text-right">布赫兹</th>
                <th className="w-16 text-center">胜</th>
                <th className="w-16 text-center">和</th>
                <th className="w-16 text-center">负</th>
                <th className="w-40 text-center">同分说明</th>
                <th className="w-16 text-center">状态</th>
              </tr>
            </thead>
            <tbody>
              {tiebreaks.length === 0 && (
                <tr>
                  <td
                    colSpan={13}
                    className="text-center py-16 text-stone-400"
                  >
                    暂无数据，先在「选手名单」添加选手并完成比赛吧
                  </td>
                </tr>
              )}
              {tiebreaks.map((t, idx) => {
                const p = byId[t.playerId]
                const s = scores[t.playerId]
                if (!p) return null
                const group = grouped[String(t.score)]
                const inGroup = group && group.length > 1
                const prevTiebreak = idx > 0 ? tiebreaks[idx - 1] : null
                const sameScoreAsPrev =
                  prevTiebreak && prevTiebreak.score === t.score
                const medalIdx = tournamentDone ? idx : -1
                return (
                  <tr
                    key={t.playerId}
                    className={clsx(
                      sameScoreAsPrev && 'border-t-2 border-t-transparent',
                      inGroup && !sameScoreAsPrev && 'bg-amber-50/60',
                      showDetailOf === t.playerId && 'bg-blue-50/60',
                    )}
                  >
                    <td className="text-center font-bold">
                      {medalIdx === 0 ? (
                        <span className="text-amber-500 text-xl">🥇</span>
                      ) : medalIdx === 1 ? (
                        <span className="text-stone-400 text-xl">🥈</span>
                      ) : medalIdx === 2 ? (
                        <span className="text-orange-600 text-xl">🥉</span>
                      ) : (
                        <span className="text-stone-700">{idx + 1}</span>
                      )}
                    </td>
                    <td className="text-center font-mono text-stone-500">
                      {p.seed}
                    </td>
                    <td>
                      <button
                        className={clsx(
                          'text-left hover:underline',
                          showDetailOf === t.playerId && 'font-bold text-accent-dark',
                        )}
                        onClick={() =>
                          setShowDetailOf(
                            showDetailOf === t.playerId ? null : t.playerId,
                          )
                        }
                      >
                        {p.name}
                      </button>
                      {showDetailOf === t.playerId && (
                        <div className="mt-1 text-xs text-stone-500">
                          对阵历史：
                          {(pairings[p.id] ?? [])
                            .map((oid, i) => {
                              const op = byId[oid]
                              const result = s?.gameResults[i]?.result
                              const cls =
                                result === 'win'
                                  ? 'text-green-700 bg-green-50'
                                  : result === 'draw'
                                  ? 'text-stone-600 bg-stone-50'
                                  : 'text-red-700 bg-red-50'
                              const sym =
                                result === 'win'
                                  ? '胜'
                                  : result === 'draw'
                                  ? '和'
                                  : result === 'loss'
                                  ? '负'
                                  : '?'
                              return op ? (
                                <span
                                  key={i}
                                  className={clsx(
                                    'badge mx-0.5',
                                    cls,
                                  )}
                                >
                                  {s?.gameResults[i]?.isWhite ? '白' : '黑'}
                                  {sym} vs {op.name}
                                </span>
                              ) : null
                            })}
                          {(pairings[p.id] ?? []).length === 0 && '（尚未比赛）'}
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      {p.team ? (
                        <span className="badge bg-amber-100 text-amber-800">
                          {p.team}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-right font-mono">{p.rating}</td>
                    <td className="text-right text-lg font-bold text-accent-dark">
                      {t.score}
                    </td>
                    <td className="text-right font-mono text-stone-700">
                      {t.sonnebornBerger}
                    </td>
                    <td className="text-right font-mono text-stone-700">
                      {t.buchholz}
                    </td>
                    <td className="text-center font-mono text-green-700">{s?.wins ?? 0}</td>
                    <td className="text-center font-mono text-stone-600">{s?.draws ?? 0}</td>
                    <td className="text-center font-mono text-red-600">{s?.losses ?? 0}</td>
                    <td className="text-[11px] text-stone-600 max-w-xs">
                      {t.tiebreakReasons.length > 0 ? (
                        <ul className="space-y-0.5">
                          {t.tiebreakReasons.slice(0, 4).map((r, i) => (
                            <li key={i} className="leading-tight">
                              · {r}
                            </li>
                          ))}
                          {t.tiebreakReasons.length > 4 && (
                            <li className="text-stone-400">
                              还有 {t.tiebreakReasons.length - 4} 项…
                            </li>
                          )}
                        </ul>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span
                        className={clsx(
                          'badge',
                          p.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : p.status === 'withdrawn'
                            ? 'bg-stone-200 text-stone-600'
                            : 'bg-amber-100 text-amber-700',
                        )}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 bg-stone-50">
        <h4 className="font-bold text-stone-700 mb-2">📖 同分破同分规则说明</h4>
        <ol className="list-decimal list-inside space-y-1 text-sm text-stone-600">
          <li>
            <b>直胜分 (Direct Encounter)</b>
            ：同分选手之间相互比赛的得分总和
          </li>
          <li>
            <b>Sonneborn-Berger (SB分)</b>
            ：每胜一局加上对手的积分，每和一局加上对手积分的一半
          </li>
          <li>
            <b>布赫兹分 (Buchholz)</b>
            ：所遇对手的积分总和
          </li>
          <li>
            <b>胜局数</b>
            ：实际取胜的局数（不含弃权/轮空胜）
          </li>
          <li>
            <b>执黑胜局</b>
            ：以黑方身份获胜的局数，体现顽强性
          </li>
          <li>
            <b>对手平均等级分</b>
            ：遇到的对手实力均值
          </li>
          <li>
            <b>选手等级分</b>
            ：最后的依靠
          </li>
        </ol>
        <div className="mt-3 text-xs text-stone-500">
          💡 点击选手姓名可展开查看每轮对手及结果
        </div>
      </div>
    </div>
  )
}
