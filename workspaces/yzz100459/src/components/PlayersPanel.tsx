import { useMemo, useState } from 'react'
import { useTournament } from '@/store/tournament'
import { STATUS_LABELS } from '@/types/tournament'
import type { Player, PlayerStatus } from '@/types/tournament'
import clsx from 'clsx'

interface PlayerForm {
  name: string
  rating: string
  team: string
  status: PlayerStatus
  note: string
}

const EMPTY_FORM: PlayerForm = {
  name: '',
  rating: '',
  team: '',
  status: 'active',
  note: '',
}

export function PlayersPanel() {
  const players = useTournament((s) => s.state.players)
  const addPlayer = useTournament((s) => s.addPlayer)
  const updatePlayer = useTournament((s) => s.updatePlayer)
  const removePlayer = useTournament((s) => s.removePlayer)
  const setPlayerStatus = useTournament((s) => s.setPlayerStatus)
  const addPlayersBatch = useTournament((s) => s.addPlayersBatch)
  const getPlayerScore = useTournament((s) => s.getPlayerScore)
  const colorBalance = useTournament((s) => s.state.colorBalance)

  const [form, setForm] = useState<PlayerForm>(EMPTY_FORM)
  const [filter, setFilter] = useState<'all' | PlayerStatus>('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchText, setBatchText] = useState('')
  const [sortBy, setSortBy] = useState<'seed' | 'rating' | 'score' | 'name'>('seed')

  const filtered = useMemo(() => {
    let list = players.slice()
    if (filter !== 'all') list = list.filter((p) => p.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.team.toLowerCase().includes(q) ||
          String(p.rating).includes(q),
      )
    }
    switch (sortBy) {
      case 'seed':
        list.sort((a, b) => a.seed - b.seed)
        break
      case 'rating':
        list.sort((a, b) => b.rating - a.rating)
        break
      case 'score':
        list.sort((a, b) => getPlayerScore(b.id) - getPlayerScore(a.id))
        break
      case 'name':
        list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
        break
    }
    return list
  }, [players, filter, search, sortBy, getPlayerScore])

  const teamList = useMemo(() => {
    const s = new Set<string>()
    for (const p of players) if (p.team) s.add(p.team)
    return Array.from(s).sort()
  }, [players])

  const submitPlayer = () => {
    if (!form.name.trim()) {
      alert('请输入选手姓名')
      return
    }
    if (editingId) {
      updatePlayer(editingId, {
        name: form.name.trim(),
        rating: Number(form.rating) || 0,
        team: form.team.trim(),
        status: form.status,
        note: form.note.trim() || undefined,
      })
      setEditingId(null)
    } else {
      addPlayer({
        name: form.name.trim(),
        rating: Number(form.rating) || 0,
        team: form.team.trim(),
        status: form.status,
        note: form.note.trim() || undefined,
      })
    }
    setForm(EMPTY_FORM)
  }

  const startEdit = (p: Player) => {
    setEditingId(p.id)
    setForm({
      name: p.name,
      rating: String(p.rating),
      team: p.team,
      status: p.status,
      note: p.note ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  const handleBatchImport = () => {
    const lines = batchText.split('\n').map((l) => l.trim()).filter(Boolean)
    const items: { name: string; rating: number; team: string; status?: PlayerStatus; note?: string }[] = []
    for (const line of lines) {
      const parts = line.split(/[,，\t]/).map((p) => p.trim())
      if (!parts[0]) continue
      let name = parts[0]
      let rating = 0
      let team = ''
      let status: PlayerStatus | undefined
      for (let i = 1; i < parts.length; i++) {
        const v = parts[i]
        if (/^-?\d+$/.test(v)) rating = Number(v)
        else if (v === '退赛' || v === 'withdrawn') status = 'withdrawn'
        else team = v
      }
      items.push({ name, rating, team, status })
    }
    if (items.length === 0) {
      alert('没有检测到有效的选手信息')
      return
    }
    addPlayersBatch(items)
    setBatchText('')
    setBatchOpen(false)
  }

  const canDelete = (p: Player) => {
    const anyResult = useTournament
      .getState()
      .state.rounds.some((r) =>
        r.matches.some(
          (m) =>
            (m.whiteId === p.id || m.blackId === p.id) &&
            m.result !== 'pending',
        ),
      )
    return !anyResult
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-accent-dark">
            {editingId ? '✎ 编辑选手' : '＋ 新增选手'}
          </h2>
          <button
            className="btn-outline text-xs"
            onClick={() => setBatchOpen((v) => !v)}
          >
            {batchOpen ? '收起批量录入' : '📋 批量录入 / 导入名单'}
          </button>
        </div>

        {batchOpen ? (
          <div className="space-y-3">
            <textarea
              className="input min-h-[160px] font-mono text-xs"
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`每行一位选手，支持：\n姓名,等级分,队伍\n例如：\n张三,1850,红队\n李四,1720,蓝队\n王五,2010,红队,退赛`}
            />
            <div className="flex gap-2">
              <button className="btn-primary" onClick={handleBatchImport}>
                确认导入
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setBatchText(
                    players
                      .map(
                        (p) =>
                          `${p.name},${p.rating},${p.team}${
                            p.status === 'withdrawn' ? ',退赛' : ''
                          }`,
                      )
                      .join('\n'),
                  )
                }}
              >
                填充当前名单
              </button>
              <button className="btn-ghost" onClick={() => setBatchOpen(false)}>
                取消
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <label className="block md:col-span-2">
              <span className="text-xs font-medium text-stone-600">姓名 *</span>
              <input
                className="input mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="例如：张三"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">等级分</span>
              <input
                type="number"
                className="input mt-1"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                placeholder="例如：1800"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">队伍 / 俱乐部</span>
              <input
                className="input mt-1"
                value={form.team}
                list="team-datalist"
                onChange={(e) => setForm({ ...form, team: e.target.value })}
                placeholder="红队"
              />
              <datalist id="team-datalist">
                {teamList.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-stone-600">状态</span>
              <select
                className="select mt-1"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PlayerStatus })}
              >
                <option value="active">正常参赛</option>
                <option value="withdrawn">退赛</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={submitPlayer}>
                {editingId ? '保存修改' : '添加'}
              </button>
              {editingId && (
                <button className="btn-secondary" onClick={cancelEdit}>
                  取消
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="card">
        <div className="p-4 border-b border-stone-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-stone-100 rounded-md p-0.5">
            {(['all', 'active', 'withdrawn'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  'px-3 py-1 text-xs rounded transition-colors',
                  filter === f
                    ? 'bg-white text-accent-dark shadow-sm font-medium'
                    : 'text-stone-600 hover:text-stone-800',
                )}
              >
                {f === 'all' ? '全部' : STATUS_LABELS[f]}（
                {f === 'all'
                  ? players.length
                  : players.filter((p) => p.status === f).length}
                ）
              </button>
            ))}
          </div>
          <input
            className="input-sm max-w-xs"
            placeholder="搜索姓名 / 队伍 / 等级分…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs text-stone-600 ml-auto">
            排序：
            <select
              className="input-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
            >
              <option value="seed">报名序号</option>
              <option value="rating">等级分</option>
              <option value="score">当前积分</option>
              <option value="name">姓名拼音</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-12">#</th>
                <th>姓名</th>
                <th className="w-20 text-right">等级分</th>
                <th>队伍</th>
                <th className="w-16">状态</th>
                <th className="w-20 text-right">积分</th>
                <th className="w-20 text-right">白/黑</th>
                <th>备注</th>
                <th className="w-48 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-stone-400"
                  >
                    暂无选手，先在上方添加吧 🧑‍🤝‍🧑
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const score = getPlayerScore(p.id)
                const cb = colorBalance[p.id] ?? { white: 0, black: 0 }
                return (
                  <tr key={p.id}>
                    <td className="font-mono text-stone-500">{p.seed}</td>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-right font-mono text-stone-700">{p.rating}</td>
                    <td>
                      {p.team ? (
                        <span className="badge bg-amber-100 text-amber-800">
                          {p.team}
                        </span>
                      ) : (
                        <span className="text-stone-400 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={clsx(
                          'badge',
                          p.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-stone-200 text-stone-600',
                        )}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </td>
                    <td className="text-right font-bold text-accent">{score}</td>
                    <td className="text-right font-mono text-xs text-stone-500">
                      <span className="text-stone-700">{cb.white}</span>/
                      <span className="text-stone-500">{cb.black}</span>
                    </td>
                    <td className="text-xs text-stone-500">{p.note ?? ''}</td>
                    <td className="text-right space-x-1">
                      <button
                        className="btn-ghost text-xs !py-1 !px-2"
                        onClick={() => startEdit(p)}
                      >
                        编辑
                      </button>
                      {p.status === 'active' ? (
                        <button
                          className="btn-ghost text-xs !py-1 !px-2 text-amber-700"
                          onClick={() => setPlayerStatus(p.id, 'withdrawn')}
                          title="新人退赛等情况"
                        >
                          退赛
                        </button>
                      ) : (
                        <button
                          className="btn-ghost text-xs !py-1 !px-2 text-green-700"
                          onClick={() => setPlayerStatus(p.id, 'active')}
                        >
                          恢复
                        </button>
                      )}
                      <button
                        className={clsx(
                          'btn-ghost text-xs !py-1 !px-2',
                          canDelete(p) ? 'text-red-600' : 'text-stone-400',
                        )}
                        disabled={!canDelete(p)}
                        onClick={() => {
                          if (confirm(`确认删除选手 ${p.name}？`)) {
                            removePlayer(p.id)
                          }
                        }}
                        title={canDelete(p) ? '' : '已有比赛成绩不能删除，可改为退赛'}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-stone-100 bg-stone-50 text-xs text-stone-500 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span>共 <b className="text-stone-700">{players.length}</b> 位选手</span>
          <span>正常 <b className="text-stone-700">{players.filter(p=>p.status==='active').length}</b> / 退赛 <b className="text-stone-700">{players.filter(p=>p.status==='withdrawn').length}</b></span>
          <span>队伍数 <b className="text-stone-700">{teamList.length}</b></span>
          {players.length % 2 === 1 && (
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">⚠ 选手为奇数，每轮有 1 人轮空</span>
          )}
        </div>
      </section>
    </div>
  )
}
