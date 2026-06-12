import { useTournament } from '@/store/tournament'
import type { TournamentInfo } from '@/types/tournament'

export function TournamentInfoPanel() {
  const info = useTournament((s) => s.state.info)
  const updateInfo = useTournament((s) => s.updateInfo)
  const reset = useTournament((s) => s.reset)

  const change = (patch: Partial<TournamentInfo>) => updateInfo(patch)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="card p-6">
        <h2 className="text-lg font-bold mb-4 text-accent-dark">赛事基本信息</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">赛事名称</span>
            <input
              className="input mt-1"
              value={info.name}
              onChange={(e) => change({ name: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">比赛地点</span>
            <input
              className="input mt-1"
              value={info.location}
              onChange={(e) => change({ location: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">比赛日期</span>
            <input
              type="date"
              className="input mt-1"
              value={info.date}
              onChange={(e) => change({ date: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">用时规则</span>
            <input
              className="input mt-1"
              placeholder="如 10+5（10分钟每方，每步+5秒）"
              value={info.timeControl}
              onChange={(e) => change({ timeControl: e.target.value })}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-stone-700">备注</span>
            <textarea
              className="input mt-1 min-h-[80px]"
              value={info.note ?? ''}
              onChange={(e) => change({ note: e.target.value })}
              placeholder="赛事规则、迟到时限、弃权判定等"
            />
          </label>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold mb-4 text-accent-dark">轮次与积分设置</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">总轮次</span>
            <input
              type="number"
              min={1}
              max={30}
              className="input mt-1"
              value={info.totalRounds}
              onChange={(e) => change({ totalRounds: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">胜方得分</span>
            <input
              type="number"
              step={0.5}
              className="input mt-1"
              value={info.winPoints}
              onChange={(e) => change({ winPoints: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">和棋得分</span>
            <input
              type="number"
              step={0.5}
              className="input mt-1"
              value={info.drawPoints}
              onChange={(e) => change({ drawPoints: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">负方得分</span>
            <input
              type="number"
              step={0.5}
              className="input mt-1"
              value={info.lossPoints}
              onChange={(e) => change({ lossPoints: Number(e.target.value) || 0 })}
            />
          </label>
        </div>
        <div className="mt-4 text-xs text-stone-500">
          预设：标准 1-0.5-0 / 足球制 3-1-0 / 自定义。新人退赛或弃权按负方处理。
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-bold mb-4 text-accent-dark">对阵规则限制</h2>
        <div className="space-y-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-accent"
              checked={info.avoidSameTeam}
              onChange={(e) => change({ avoidSameTeam: e.target.checked })}
            />
            <div>
              <div className="font-medium text-stone-800">同队选手尽量不碰</div>
              <div className="text-xs text-stone-500 mt-0.5">
                老会员要求同队错开。只有在选手不足且别无选择时才会放宽。
              </div>
            </div>
          </label>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 w-4 h-4 accent-accent"
              disabled={!info.avoidSameTeam}
              checked={info.avoidSameTeamRound1}
              onChange={(e) => change({ avoidSameTeamRound1: e.target.checked })}
            />
            <div>
              <div className="font-medium text-stone-800">第 1 轮严格禁止同队</div>
              <div className="text-xs text-stone-500 mt-0.5">
                用于手动锁定的亲子、同队、师徒等特殊组合，第 1 轮绝不对阵。
              </div>
            </div>
          </label>
          <label className="block max-w-xs">
            <span className="text-sm font-medium text-stone-700">同一对选手最多可重复对阵次数</span>
            <input
              type="number"
              min={0}
              max={10}
              className="input mt-1"
              value={info.maxRepeatEncounters}
              onChange={(e) =>
                change({ maxRepeatEncounters: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })
              }
            />
            <div className="text-xs text-stone-500 mt-1">
              默认 1 次（避免频繁交手），可根据总轮次上调。
            </div>
          </label>
        </div>
      </section>

      <section className="card p-6 border-red-200 bg-red-50/30">
        <h2 className="text-lg font-bold mb-4 text-red-700">危险操作</h2>
        <div className="flex items-center gap-3">
          <button
            className="btn-danger"
            onClick={() => {
              if (confirm('确定要清空当前所有数据并重新开始吗？此操作不可恢复。')) {
                reset()
              }
            }}
          >
            重置全部数据
          </button>
          <span className="text-sm text-red-600">
            将清除所有选手、对阵、成绩。请先导出档案备份。
          </span>
        </div>
      </section>
    </div>
  )
}
