import { useGameStore } from '@/store/gameStore'
import { cn } from '@/lib/utils'
import TouristCard from './TouristCard'
import { Ship, Users, Clock, Waves, Play, RotateCcw, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const riskOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

const boatStatusConfig: Record<string, { label: string; color: string }> = {
  idle: { label: '待命', color: 'bg-[var(--safe-green)]' },
  moving: { label: '行驶中', color: 'bg-[var(--tide-teal)]' },
  loading: { label: '装载中', color: 'bg-[var(--warning-amber)]' },
  returning: { label: '返航中', color: 'bg-[var(--reef-gray)]' },
}

const windowStatusConfig: Record<string, { label: string; className: string }> = {
  optimal: { label: '窗口开启', className: 'bg-[var(--safe-green)] text-white' },
  closing: { label: '即将关闭', className: 'bg-[var(--warning-amber)] text-white' },
  missed: { label: '已错过', className: 'bg-[var(--danger-coral)] text-white' },
  none: { label: '未开启', className: 'bg-[var(--surface)] text-[var(--text-muted)]' },
}

export default function DispatchPanel() {
  const navigate = useNavigate()
  const {
    phase,
    currentTurn,
    maxTurns,
    waterLevel,
    touristGroups,
    boats,
    pendingDispatches,
    tidalWindows,
    selectedBoatId,
    selectBoat,
    dispatchBoat,
    confirmTurn,
    undoTurn,
    getTidalWindowStatus,
    getScore,
  } = useGameStore()

  const sortedGroups = [...touristGroups].sort(
    (a, b) => (riskOrder[a.riskLevel] ?? 4) - (riskOrder[b.riskLevel] ?? 4)
  )

  const handleGroupClick = (groupId: string) => {
    if (selectedBoatId) {
      dispatchBoat(selectedBoatId, groupId)
    }
  }

  if (phase === 'gameOver') {
    const score = getScore()
    return (
      <div className="glass-panel p-6 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-10 h-10 text-[var(--warning-amber)]" />
        <h2 className="font-display text-xl text-[var(--text-primary)]">任务结束</h2>
        <div className="glass-panel-sm p-4 w-full space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">救援效率</span>
            <span className="text-[var(--text-primary)]">{score.rescueEfficiency.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">资源利用</span>
            <span className="text-[var(--text-primary)]">{score.resourceUtilization.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">风险控制</span>
            <span className="text-[var(--text-primary)]">{score.riskControl.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">速度评分</span>
            <span className="text-[var(--text-primary)]">{score.speed.toFixed(0)}</span>
          </div>
          <div className="flex justify-between font-bold border-t border-[rgba(0,201,167,0.15)] pt-2">
            <span className="text-[var(--text-primary)]">总分</span>
            <span className="text-[var(--tide-teal)]">{score.total.toFixed(0)}</span>
          </div>
        </div>
        <div className="flex gap-3 w-full">
          <button
            className="btn-primary flex-1 text-sm"
            onClick={() => navigate('/replay')}
          >
            查看复盘
          </button>
          <button
            className="btn-secondary flex-1 text-sm"
            onClick={() => navigate('/')}
          >
            返回关卡
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-4 flex flex-col gap-4 h-full overflow-hidden">
      <div className="glass-panel-sm p-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--tide-teal)]" />
            <span className="text-[var(--text-secondary)]">回合</span>
          </div>
          <span className="font-display text-[var(--text-primary)]">
            {currentTurn} / {maxTurns}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-blue-400" />
            <span className="text-[var(--text-secondary)]">水位</span>
          </div>
          <span className="font-display text-[var(--text-primary)]">{waterLevel.toFixed(1)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary)]">阶段</span>
          <span className={cn(
            'px-2 py-0.5 rounded text-xs font-medium',
            phase === 'planning' ? 'bg-[var(--tide-teal)]/20 text-[var(--tide-teal)]' : 'bg-[var(--surface-light)] text-[var(--text-muted)]'
          )}>
            {phase === 'planning' ? '规划中' : phase}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] uppercase tracking-wider">
          <Ship className="w-3.5 h-3.5" />
          <span>救援船只</span>
        </div>
        <div className="space-y-2">
          {boats.map(boat => {
            const cfg = boatStatusConfig[boat.status]
            const pending = pendingDispatches.find(d => d.boatId === boat.id)
            const loadRatio = boat.capacity > 0 ? boat.currentLoad / boat.capacity : 0
            return (
              <div
                key={boat.id}
                onClick={() => selectBoat(boat.id === selectedBoatId ? null : boat.id)}
                className={cn(
                  'glass-panel-sm p-2.5 cursor-pointer transition-all',
                  selectedBoatId === boat.id && 'border-[var(--tide-teal)] shadow-[0_0_8px_rgba(0,201,167,0.2)]'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{boat.id}</span>
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', cfg.color)}>
                    {cfg.label}
                  </span>
                </div>
                <div className="h-1 rounded-full bg-[var(--surface)] mb-1">
                  <div
                    className="h-full rounded-full bg-[var(--tide-teal)] transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, loadRatio * 100))}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {boat.currentLoad} / {boat.capacity}
                </div>
                {pending && (
                  <div className="mt-1.5 text-[10px] text-[var(--tide-teal)] flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    <span>目标: {pending.targetGroupId} · 路径: {pending.path.length} 步</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-2">
          <Users className="w-3.5 h-3.5" />
          <span>游客队伍</span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sortedGroups.map(group => (
            <TouristCard
              key={group.id}
              group={group}
              isSelected={selectedBoatId !== null && pendingDispatches.some(d => d.targetGroupId === group.id)}
              onClick={() => handleGroupClick(group.id)}
            />
          ))}
        </div>
      </div>

      {tidalWindows.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] uppercase tracking-wider">
            <Waves className="w-3.5 h-3.5" />
            <span>潮汐窗口</span>
          </div>
          <div className="space-y-1.5">
            {tidalWindows.map((win, idx) => {
              const status = getTidalWindowStatus(idx)
              const sc = windowStatusConfig[status]
              return (
                <div key={idx} className="glass-panel-sm p-2 flex items-center justify-between">
                  <span className="text-xs text-[var(--text-secondary)] truncate mr-2">{win.description}</span>
                  <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0', sc.className)}>
                    {sc.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-[rgba(0,201,167,0.1)]">
        {pendingDispatches.length > 0 && (
          <div className="text-xs text-[var(--tide-teal)] text-center">
            {pendingDispatches.length} 项待确认调度
          </div>
        )}
        <div className="flex gap-2">
          <button
            className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5"
            onClick={confirmTurn}
            disabled={phase !== 'planning'}
          >
            <Play className="w-3.5 h-3.5" />
            确认调度
          </button>
          <button
            className="btn-secondary text-sm flex items-center justify-center gap-1.5 px-3"
            onClick={undoTurn}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            撤销
          </button>
        </div>
      </div>
    </div>
  )
}
