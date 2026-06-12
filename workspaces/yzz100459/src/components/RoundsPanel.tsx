import { useMemo, useState } from 'react'
import { useTournament } from '@/store/tournament'
import { RESULT_LABELS } from '@/types/tournament'
import type { Match, MatchResult, Player } from '@/types/tournament'
import clsx from 'clsx'
import { isRoundStarted, isRoundCompleted } from '@/utils/pairing'

const RESULT_OPTIONS: { value: MatchResult; label: string; type: 'win' | 'loss' | 'draw' | 'bye' | 'forfeit' | 'none' }[] = [
  { value: 'pending', label: '— 未开始 —', type: 'none' },
  { value: 'win-white', label: '白方胜', type: 'win' },
  { value: 'win-black', label: '黑方胜', type: 'win' },
  { value: 'draw', label: '和棋', type: 'draw' },
  { value: 'no-show-white', label: '白方迟到，黑胜', type: 'forfeit' },
  { value: 'no-show-black', label: '黑方迟到，白胜', type: 'forfeit' },
  { value: 'forfeit-white', label: '白方弃权，黑胜', type: 'forfeit' },
  { value: 'forfeit-black', label: '黑方弃权，白胜', type: 'forfeit' },
  { value: 'bye-white', label: '白方轮空', type: 'bye' },
  { value: 'bye-black', label: '黑方轮空', type: 'bye' },
]

export function RoundsPanel() {
  const state = useTournament((s) => s.state)
  const generateRound = useTournament((s) => s.generateRound)
  const regenerateRound = useTournament((s) => s.regenerateRound)
  const canRegenerateRound = useTournament((s) => s.canRegenerateRound)
  const setMatchResult = useTournament((s) => s.setMatchResult)
  const toggleMatchLock = useTournament((s) => s.toggleMatchLock)
  const swapMatchColors = useTournament((s) => s.swapMatchColors)
  const updateMatch = useTournament((s) => s.updateMatch)
  const lastWarnings = useTournament((s) => s.lastWarnings)
  const getPlayerScore = useTournament((s) => s.getPlayerScore)
  const printPairings = useTournament((s) => s.printPairings)
  const pairingsRecord = useTournament((s) => s.state.pairings)

  const totalRounds = state.info.totalRounds
  const [selectedRound, setSelectedRound] = useState<number>(
    (() => {
      const firstUnfinished = state.rounds.find((r) => r.status !== 'completed')
      if (firstUnfinished) return firstUnfinished.number
      if (state.rounds.length > 0) return Math.max(...state.rounds.map((r) => r.number))
      return 1
    })(),
  )
  const [showLockSetup, setShowLockSetup] = useState(false)
  const [locks, setLocks] = useState<Match[]>([])
  const [swapMode, setSwapMode] = useState<{ matchId: string; playerId: string } | null>(null)

  const activePlayers = useMemo(
    () => state.players.filter((p) => p.status === 'active'),
    [state.players],
  )

  const round = state.rounds.find((r) => r.number === selectedRound)
  const roundStarted = isRoundStarted(round)
  const roundCompleted = isRoundCompleted(round)
  const prevRoundsDone = useMemo(() => {
    for (let i = 1; i < selectedRound; i++) {
      const r = state.rounds.find((x) => x.number === i)
      if (!r || !isRoundCompleted(r)) return false
    }
    return true
  }, [state.rounds, selectedRound])

  const byId = useMemo(() => {
    const m: Record<string, Player> = {}
    for (const p of state.players) m[p.id] = p
    return m
  }, [state.players])

  const renderPlayerCell = (playerId: string | undefined, isWhite: boolean, match: Match) => {
    if (!playerId) {
      return (
        <div className="text-stone-400 italic">
          {isWhite ? '（无）' : '—'}
        </div>
      )
    }
    const p = byId[playerId]
    if (!p) return <div className="text-red-500">未知选手</div>
    const isSwap = swapMode?.playerId === playerId && swapMode?.matchId !== match.id
    const isSource = swapMode?.matchId === match.id && swapMode?.playerId === playerId

    const opponentsBefore = pairingsRecord[playerId] ?? []
    const hasHistory = match.whiteId && match.blackId && match.whiteId !== playerId
      ? opponentsBefore.includes(match.blackId)
      : match.whiteId && match.blackId && match.whiteId === playerId
      ? opponentsBefore.includes(match.blackId)
      : false

    const canInteract = roundStarted === false && !roundCompleted && state.players.length > 0
    return (
      <div
        className={clsx(
          'flex items-center gap-2 py-1 px-2 rounded transition-colors',
          isSource && 'ring-2 ring-accent bg-amber-50',
          isSwap && 'ring-2 ring-green-500 bg-green-50 cursor-pointer hover:bg-green-100',
          !isSwap && !isSource && canInteract && 'hover:bg-stone-50 cursor-pointer',
        )}
        onClick={() => {
          if (!canInteract) return
          if (isSwap && swapMode) {
            const sourceMatch = round?.matches.find((m) => m.id === swapMode.matchId)
            if (!sourceMatch) return
            const sourceWhite = sourceMatch.whiteId === swapMode.playerId
            const targetWhite = match.whiteId === playerId
            const newSourceWhite = sourceWhite ? playerId : sourceMatch.whiteId
            const newSourceBlack = !sourceWhite ? playerId : sourceMatch.blackId
            const newTargetWhite = targetWhite ? swapMode.playerId : match.whiteId
            const newTargetBlack = !targetWhite ? swapMode.playerId : match.blackId
            updateMatch(sourceMatch.id, {
              whiteId: newSourceWhite,
              blackId: newSourceBlack,
              result: 'pending',
            })
            updateMatch(match.id, {
              whiteId: newTargetWhite,
              blackId: newTargetBlack,
              result: 'pending',
            })
            setSwapMode(null)
            return
          }
          if (isSource) {
            setSwapMode(null)
          } else {
            setSwapMode({ matchId: match.id, playerId })
          }
        }}
      >
        <span
          className={clsx(
            'w-1.5 h-6 rounded-sm flex-shrink-0',
            isWhite ? 'bg-stone-100 border border-stone-300' : 'bg-stone-700',
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={clsx('font-medium truncate', p.status === 'withdrawn' && 'line-through text-stone-400')}>
              {p.name}
            </span>
            <span className="badge bg-amber-50 text-amber-700 text-[10px] whitespace-nowrap">
              #{p.seed} · {p.rating}
            </span>
            {p.team && (
              <span className="badge bg-stone-100 text-stone-600 text-[10px] whitespace-nowrap">
                {p.team}
              </span>
            )}
            {hasHistory && (
              <span className="badge bg-purple-100 text-purple-700 text-[10px]" title="与对手曾相遇">
                已交手
              </span>
            )}
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">
            积分 <b className="text-accent-dark">{getPlayerScore(playerId)}</b>
          </div>
        </div>
      </div>
    )
  }

  const generateNextRound = () => {
    const used = locks.filter((m) => m.whiteId && (m.blackId || true))
    const ok = generateRound(selectedRound, used)
    if (ok) {
      setShowLockSetup(false)
      setLocks([])
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((n) => {
              const r = state.rounds.find((x) => x.number === n)
              let statusColor = 'bg-stone-200 text-stone-600'
              let statusLabel = '未开始'
              if (r) {
                if (r.status === 'completed') {
                  statusColor = 'bg-green-600 text-white'
                  statusLabel = '完成'
                } else if (r.status === 'in-progress') {
                  statusColor = 'bg-blue-600 text-white'
                  statusLabel = '进行中'
                } else if (r.status === 'generated') {
                  statusColor = 'bg-amber-500 text-white'
                  statusLabel = '已排'
                }
              }
              return (
                <button
                  key={n}
                  onClick={() => setSelectedRound(n)}
                  className={clsx(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all border-2',
                    selectedRound === n
                      ? 'border-accent ring-2 ring-accent/30 ' + statusColor
                      : 'border-transparent ' + statusColor,
                  )}
                >
                  第 {n} 轮
                  <span className="ml-1.5 text-[10px] opacity-80">{statusLabel}</span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2">
            <button
              className="btn-outline text-xs"
              onClick={() => printPairings(selectedRound)}
              disabled={!round || round.matches.length === 0}
            >
              🖨 打印本轮对阵
            </button>
          </div>
        </div>
      </div>

      {lastWarnings && lastWarnings.round === selectedRound && (lastWarnings.warnings.length > 0 || lastWarnings.errors.length > 0) && (
        <div
          className={clsx(
            'card p-4 border-l-4',
            lastWarnings.errors.length > 0 ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50',
          )}
        >
          {lastWarnings.errors.map((e, i) => (
            <div key={`e${i}`} className="text-red-700 text-sm">
              ❌ {e}
            </div>
          ))}
          {lastWarnings.warnings.map((w, i) => (
            <div key={`w${i}`} className="text-amber-800 text-sm">
              ⚠ {w}
            </div>
          ))}
        </div>
      )}

      {swapMode && (
        <div className="card p-3 bg-green-50 border-green-200 border-l-4 flex items-center justify-between">
          <div className="text-sm text-green-800">
            🎯 正在换位：已选中 <b>{byId[swapMode.playerId]?.name}</b>，请点击另一场的任意选手完成交换
          </div>
          <button className="btn-ghost text-xs" onClick={() => setSwapMode(null)}>
            取消
          </button>
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-stone-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-accent-dark">第 {selectedRound} 轮对阵</h3>
            <div className="text-xs text-stone-500 mt-1">
              {round
                ? round.status === 'completed'
                  ? `✅ 本轮已结束（${round.completedAt}）`
                  : round.status === 'in-progress'
                  ? '⏱ 比赛进行中，请在下方录入成绩'
                  : round.status === 'generated'
                  ? `📋 对阵已生成（${round.generatedAt}），可点击选手进行换台`
                  : '待生成'
                : '尚未生成对阵'}
            </div>
          </div>

          {!round || round.status === 'pending' ? (
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn-outline text-xs"
                onClick={() => setShowLockSetup((v) => !v)}
                disabled={!prevRoundsDone}
              >
                {showLockSetup ? '收起锁定' : '🔒 手动锁定特殊对阵'}
              </button>
              <button
                className="btn-primary"
                disabled={!prevRoundsDone || activePlayers.length < 2}
                onClick={generateNextRound}
              >
                ⚡ 生成第 {selectedRound} 轮对阵
              </button>
              {!prevRoundsDone && (
                <span className="text-xs text-red-600 self-center">
                  请先完成前 {selectedRound - 1} 轮全部比赛
                </span>
              )}
            </div>
          ) : round.status === 'generated' ? (
            <div className="flex gap-2 flex-wrap">
              <button
                className={clsx(
                  'text-xs',
                  canRegenerateRound(selectedRound) ? 'btn-outline' : 'btn-ghost !text-stone-400 cursor-not-allowed',
                )}
                disabled={!canRegenerateRound(selectedRound)}
                onClick={() => {
                  if (confirm('重新生成本轮对阵？已锁定的对阵会保留。')) {
                    regenerateRound(selectedRound)
                  }
                }}
              >
                🔄 重新生成
              </button>
              <button
                className="btn-primary"
                onClick={() => useTournament.getState().startRound(selectedRound)}
              >
                ⏱ 开赛（进入成绩录入）
              </button>
            </div>
          ) : round.status === 'in-progress' ? (
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn-outline text-xs"
                onClick={() => {
                  if (confirm('确认本轮所有比赛已结束？')) {
                    const allDone = round.matches.every(
                      (m) => m.result !== 'pending' && m.result !== null,
                    )
                    if (!allDone) {
                      if (!confirm('仍有比赛未录入结果，是否仍然结束本轮？未录入将视为未赛。')) return
                    }
                    useTournament.getState().completeRound(selectedRound)
                    if (selectedRound < totalRounds) {
                      if (confirm('本轮已结束！要继续生成下一轮对阵吗？')) {
                        setSelectedRound(selectedRound + 1)
                      }
                    } else {
                      alert('全部轮次已完成！可在「积分排名」查看最终名次')
                    }
                  }
                }}
              >
                ✅ 结束本轮
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button
                className="btn-outline text-xs"
                onClick={() => {
                  if (confirm('修改已完成的轮次会影响破同分结果，确认重开？')) {
                    const r = { ...round, status: 'in-progress' as const, completedAt: undefined }
                    useTournament.setState({
                      state: {
                        ...useTournament.getState().state,
                        rounds: useTournament.getState().state.rounds.map((x) =>
                          x.number === selectedRound ? r : x,
                        ),
                      },
                    })
                  }
                }}
              >
                ↩ 重开本轮
              </button>
            </div>
          )}
        </div>

        {showLockSetup && (
          <div className="p-4 border-b border-stone-200 bg-stone-50 space-y-3">
            <div className="text-sm text-stone-700 font-medium">
              🔒 特殊锁定（用于第 1 轮避免亲子、师徒、同队等组合）：
            </div>
            <div className="grid gap-2">
              {locks.map((l, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    className="input-sm flex-1"
                    value={l.whiteId}
                    onChange={(e) => {
                      const copy = locks.slice()
                      copy[idx] = { ...copy[idx], whiteId: e.target.value }
                      setLocks(copy)
                    }}
                  >
                    <option value="">（选择白方）</option>
                    {activePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.team || '无队'} · {p.rating})
                      </option>
                    ))}
                  </select>
                  <span className="text-stone-400">VS</span>
                  <select
                    className="input-sm flex-1"
                    value={l.blackId}
                    onChange={(e) => {
                      const copy = locks.slice()
                      copy[idx] = { ...copy[idx], blackId: e.target.value }
                      setLocks(copy)
                    }}
                  >
                    <option value="">（选择黑方，留空=轮空白方）</option>
                    {activePlayers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.team || '无队'} · {p.rating})
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-ghost text-red-600 !px-2 text-xs"
                    onClick={() => setLocks(locks.filter((_, i) => i !== idx))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn-outline text-xs"
                onClick={() =>
                  setLocks([
                    ...locks,
                    {
                      id: '',
                      round: selectedRound,
                      board: 0,
                      whiteId: '',
                      blackId: '',
                      result: 'pending',
                      locked: true,
                    },
                  ])
                }
              >
                ＋ 添加一组锁定
              </button>
              <span className="text-xs text-stone-500">
                提示：锁定的对阵在「重新生成」时会保留，并占用这些选手名额。
              </span>
            </div>
          </div>
        )}

        {round ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th className="w-14 text-center">台次</th>
                  <th className="w-[38%]">白方</th>
                  <th className="w-24 text-center">结果</th>
                  <th className="w-[38%]">黑方</th>
                  <th className="w-10 text-center">🔒</th>
                  <th className="w-32 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {round.matches
                  .slice()
                  .sort((a, b) => a.board - b.board)
                  .map((m) => {
                    const isBye = m.result === 'bye-white' || m.result === 'bye-black' || (!m.blackId && !m.whiteId)
                    return (
                      <tr
                        key={m.id}
                        className={clsx(
                          isBye && 'bg-amber-50/50',
                          roundStarted && m.result === 'pending' && 'bg-blue-50/40',
                        )}
                      >
                        <td className="text-center font-bold text-accent-dark">{m.board}</td>
                        <td>{renderPlayerCell(m.whiteId, true, m)}</td>
                        <td className="text-center">
                          {isBye && !m.blackId ? (
                            <span className="badge bg-amber-100 text-amber-800">轮空</span>
                          ) : (
                            <select
                              className={clsx(
                                'input-sm text-center font-medium',
                                m.result === 'pending' && 'text-stone-500',
                                m.result !== 'pending' &&
                                  (m.result.includes('draw')
                                    ? 'text-stone-700'
                                    : m.result.includes('white') && (m.result.startsWith('win') || m.result.includes('black') === false)
                                    ? 'text-stone-700'
                                    : 'text-stone-700'),
                              )}
                              disabled={!roundStarted && round.status === 'generated' ? false : roundCompleted}
                              value={m.result}
                              onChange={(e) =>
                                setMatchResult(m.id, e.target.value as MatchResult)
                              }
                            >
                              {RESULT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {m.note && !m.note.includes('轮空') && (
                            <div className="text-[10px] text-purple-600 mt-1" title={m.note}>
                              💡 {m.note}
                            </div>
                          )}
                        </td>
                        <td>{renderPlayerCell(m.blackId, false, m)}</td>
                        <td className="text-center">
                          <button
                            className={clsx(
                              'w-8 h-8 rounded flex items-center justify-center mx-auto transition-all',
                              m.locked
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : 'bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-stone-600',
                              roundStarted && 'opacity-50 cursor-not-allowed',
                            )}
                            disabled={roundStarted}
                            onClick={() => toggleMatchLock(m.id)}
                            title={m.locked ? '取消锁定' : '锁定此台（重新生成不变化）'}
                          >
                            {m.locked ? '🔒' : '🔓'}
                          </button>
                        </td>
                        <td className="text-center">
                          {!roundStarted && !roundCompleted ? (
                            <div className="inline-flex gap-1">
                              <button
                                className="btn-ghost text-[11px] !py-1 !px-2"
                                onClick={() => swapMatchColors(m.id)}
                                disabled={!m.whiteId || !m.blackId}
                                title="交换先后手"
                              >
                                ↔
                              </button>
                              <button
                                className={clsx(
                                  'btn-ghost text-[11px] !py-1 !px-2',
                                  swapMode && swapMode.matchId !== m.id && 'text-green-700 bg-green-50',
                                )}
                                onClick={() => setSwapMode(null)}
                                title="换位：在两场间交换选手"
                              >
                                {swapMode ? '换' : '换台'}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">
                              {RESULT_LABELS[m.result]?.slice(0, 4) ?? '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-stone-400">
            点击上方「⚡ 生成第 {selectedRound} 轮对阵」开始编排
            <div className="text-xs mt-2">
              第 1 轮推荐先用「🔒 手动锁定特殊对阵」把亲子/师徒/同队的组合拆开
            </div>
          </div>
        )}

        {round && (
          <div className="p-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-500 flex flex-wrap gap-x-6 gap-y-1 items-center">
            <span>共 <b className="text-stone-700">{round.matches.length}</b> 场</span>
            <span>
              已完赛{' '}
              <b className="text-stone-700">
                {round.matches.filter((m) => m.result !== 'pending').length}
              </b>
            </span>
            <span>
              轮空 <b className="text-stone-700">{round.matches.filter((m) => m.result === 'bye-white' || m.result === 'bye-black' || (!m.blackId && m.whiteId)).length}</b>
            </span>
            <span>
              弃权/迟到 <b className="text-stone-700">
                {round.matches.filter((m) => m.result.startsWith('forfeit') || m.result.startsWith('no-show')).length}
              </b>
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
