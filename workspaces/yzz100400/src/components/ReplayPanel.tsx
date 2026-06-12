import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, SkipForward, SkipBack, X } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'
import Timeline from '@/components/Timeline'
import RadarChart from '@/components/RadarChart'

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  optimal: { bg: 'rgba(16, 185, 129, 0.2)', text: '#10B981', label: '最佳窗口' },
  closing: { bg: 'rgba(245, 158, 11, 0.2)', text: '#F59E0B', label: '窗口关闭中' },
  missed: { bg: 'rgba(255, 107, 107, 0.2)', text: '#FF6B6B', label: '已错过' },
  none: { bg: 'rgba(74, 107, 138, 0.2)', text: '#4A6B8A', label: '无窗口' },
}

export default function ReplayPanel() {
  const replaySession = useGameStore((s) => s.replaySession)
  const replayTurnIndex = useGameStore((s) => s.replayTurnIndex)
  const setReplayTurn = useGameStore((s) => s.setReplayTurn)
  const exitReplay = useGameStore((s) => s.exitReplay)

  const [isPlaying, setIsPlaying] = useState(false)

  const totalTurns = replaySession?.turns.length ?? 0
  const currentTurnData = replaySession?.turns[replayTurnIndex]

  const decisions = replaySession?.turns.map((t) => ({
    turnNumber: t.turnNumber,
    tidalWindowStatus: t.decisions.length > 0
      ? t.decisions.reduce<string>((worst, d) => {
          const order = ['missed', 'closing', 'optimal', 'none']
          return order.indexOf(d.tidalWindowStatus) < order.indexOf(worst) ? d.tidalWindowStatus : worst
        }, 'none')
      : 'none',
  })) ?? []

  const tidalWindows = replaySession?.turns.flatMap((t) =>
    t.decisions
      .filter((d) => d.tidalWindowStatus !== 'none')
      .map((d) => ({
        startTurn: t.turnNumber,
        endTurn: t.turnNumber,
        description: d.tidalWindowStatus,
      }))
  ) ?? []

  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setReplayTurn(Math.min(replayTurnIndex + 1, totalTurns - 1))
      if (replayTurnIndex >= totalTurns - 1) {
        setIsPlaying(false)
      }
    }, 1500)
    return () => clearInterval(interval)
  }, [isPlaying, replayTurnIndex, totalTurns, setReplayTurn])

  const handlePlayPause = useCallback(() => {
    if (replayTurnIndex >= totalTurns - 1 && !isPlaying) {
      setReplayTurn(0)
      setIsPlaying(true)
    } else {
      setIsPlaying((prev) => !prev)
    }
  }, [isPlaying, replayTurnIndex, totalTurns, setReplayTurn])

  const score = replaySession?.score
  const resourceAnalysis = replaySession?.resourceAnalysis

  const maxDispatch = resourceAnalysis
    ? Math.max(...Object.values(resourceAnalysis.boatDispatchCount), 1)
    : 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(10, 37, 64, 0.97)' }}>
      <div className="glass-panel flex items-center justify-between px-6 py-3 m-3 mb-0">
        <h2 className="font-display text-lg tracking-wider" style={{ color: 'var(--tide-teal)' }}>
          复盘回放
        </h2>
        <button
          onClick={exitReplay}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        <div className="glass-panel px-5 py-4">
          <Timeline
            totalTurns={totalTurns}
            currentTurn={replayTurnIndex}
            decisions={decisions}
            tidalWindows={tidalWindows}
            onTurnChange={setReplayTurn}
          />
        </div>

        {currentTurnData && (
          <div className="glass-panel px-5 py-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              第 {currentTurnData.turnNumber} 回合决策
            </h3>
            {currentTurnData.decisions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>本回合无决策</p>
            ) : (
              <div className="space-y-2">
                {currentTurnData.decisions.map((d, i) => {
                  const style = STATUS_STYLES[d.tidalWindowStatus] ?? STATUS_STYLES.none
                  return (
                    <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg" style={{ background: 'rgba(14, 42, 71, 0.6)' }}>
                      <span className="text-sm font-mono" style={{ color: 'var(--tide-teal)' }}>
                        {d.boatId}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                        {d.action === 'dispatch' ? '派遣' : d.action === 'recall' ? '召回' : '等待'}
                      </span>
                      {d.targetGroupId && (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          → {d.targetGroupId}
                        </span>
                      )}
                      <span
                        className="ml-auto px-2 py-0.5 rounded text-xs font-medium"
                        style={{ background: style.bg, color: style.text }}
                      >
                        {style.label}
                      </span>
                      {(d.tidalWindowStatus === 'missed' || d.tidalWindowStatus === 'closing') && (
                        <span style={{ color: style.text }} className="text-sm">⚠</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {(currentTurnData.decisions.some((d) => d.tidalWindowStatus === 'missed') ||
              currentTurnData.decisions.some((d) => d.tidalWindowStatus === 'closing')) && (
              <div className="mt-3 space-y-1">
                {currentTurnData.decisions
                  .filter((d) => d.tidalWindowStatus === 'missed')
                  .map((d, i) => (
                    <p key={`m-${i}`} className="text-xs" style={{ color: 'var(--danger-coral)' }}>
                      ⚠ {d.boatId} 已错过最佳潮汐窗口，救援风险增大
                    </p>
                  ))}
                {currentTurnData.decisions
                  .filter((d) => d.tidalWindowStatus === 'closing')
                  .map((d, i) => (
                    <p key={`c-${i}`} className="text-xs" style={{ color: 'var(--warning-amber)' }}>
                      ⚠ {d.boatId} 潮汐窗口即将关闭，建议尽快行动
                    </p>
                  ))}
              </div>
            )}
          </div>
        )}

        {score && (
          <div className="glass-panel px-5 py-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              评分总览
            </h3>
            <div className="flex items-start gap-6">
              <RadarChart scores={score} />
              <div className="flex flex-col justify-center py-4">
                <div className="text-4xl font-display font-bold" style={{ color: 'var(--tide-teal)' }}>
                  {score.total.toFixed(0)}
                </div>
                <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>总分</div>
                <div className="mt-4 space-y-1.5">
                  {[
                    { label: '救援效率', value: score.rescueEfficiency },
                    { label: '资源利用', value: score.resourceUtilization },
                    { label: '风险控制', value: score.riskControl },
                    { label: '速度', value: score.speed },
                    { label: '决策', value: score.decision },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(0, 201, 167, 0.15)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(item.value, 100)}%`,
                            background: 'var(--tide-teal)',
                          }}
                        />
                      </div>
                      <span style={{ color: 'var(--text-secondary)' }}>{item.value.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {resourceAnalysis && (
          <div className="glass-panel px-5 py-4">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
              资源分析
            </h3>

            <div className="space-y-3">
              <div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>船只派遣次数</div>
                {Object.entries(resourceAnalysis.boatDispatchCount).map(([boatId, count]) => (
                  <div key={boatId} className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-mono w-16" style={{ color: 'var(--tide-teal)' }}>{boatId}</span>
                    <div className="flex-1 h-3 rounded-full" style={{ background: 'rgba(0, 201, 167, 0.1)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(count / maxDispatch) * 100}%`,
                          background: 'linear-gradient(90deg, var(--tide-teal-dim), var(--tide-teal))',
                        }}
                      />
                    </div>
                    <span className="text-xs w-6 text-right" style={{ color: 'var(--text-secondary)' }}>{count}</span>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>风险派遣比例</div>
                <div className="flex h-4 rounded-full overflow-hidden" style={{ background: 'rgba(14, 42, 71, 0.6)' }}>
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${resourceAnalysis.highRiskDispatchRatio * 100}%`,
                      background: 'var(--danger-coral)',
                    }}
                  />
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${resourceAnalysis.lowRiskDispatchRatio * 100}%`,
                      background: 'var(--safe-green)',
                    }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: 'var(--danger-coral)' }}>
                    高风险 {(resourceAnalysis.highRiskDispatchRatio * 100).toFixed(0)}%
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--safe-green)' }}>
                    低风险 {(resourceAnalysis.lowRiskDispatchRatio * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>空闲回合</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(resourceAnalysis.idleTurns).map(([boatId, idle]) => (
                    <div
                      key={boatId}
                      className="px-2 py-1 rounded text-xs"
                      style={{ background: 'rgba(14, 42, 71, 0.6)', color: idle > 3 ? 'var(--warning-amber)' : 'var(--text-secondary)' }}
                    >
                      {boatId}: {idle} 回合
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>平均响应时间</div>
                <span className="text-lg font-display font-bold" style={{ color: 'var(--tide-teal)' }}>
                  {resourceAnalysis.averageResponseTime.toFixed(1)}
                </span>
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>回合</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel mx-3 mb-3 px-5 py-3 flex items-center justify-center gap-4">
        <button
          onClick={() => setReplayTurn(0)}
          className="p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <SkipBack size={18} />
        </button>
        <button
          onClick={() => setReplayTurn(Math.max(0, replayTurnIndex - 1))}
          className="p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="19 20 9 12 19 4 19 20" />
            <line x1="5" y1="19" x2="5" y2="5" />
          </svg>
        </button>
        <button
          onClick={handlePlayPause}
          className="p-3 rounded-full transition-colors"
          style={{
            background: 'var(--tide-teal)',
            color: 'white',
            boxShadow: '0 0 16px rgba(0, 201, 167, 0.4)',
          }}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={() => setReplayTurn(Math.min(totalTurns - 1, replayTurnIndex + 1))}
          className="p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
        <button
          onClick={() => setReplayTurn(totalTurns - 1)}
          className="p-2 rounded-lg transition-colors hover:bg-white/10"
          style={{ color: 'var(--text-secondary)' }}
        >
          <SkipForward size={18} />
        </button>
      </div>
    </div>
  )
}
