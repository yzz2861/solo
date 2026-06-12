import { create } from 'zustand'
import type {
  Match,
  MatchResult,
  Player,
  PlayerStatus,
  Round,
  TournamentInfo,
  TournamentState,
} from '@/types/tournament'
import { createEmptyState } from '@/types/tournament'
import { uid } from '@/utils/common'
import {
  computeScores,
  computeTiebreaks,
  generateRoundPairings,
  isRoundCompleted,
  isRoundStarted,
  roundStatusCheck,
} from '@/utils/pairing'

export interface PairingWarnings {
  round: number
  warnings: string[]
  errors: string[]
}

interface TournamentStore {
  state: TournamentState
  loaded: boolean
  autoSave: boolean
  lastError: string | null
  lastWarnings: PairingWarnings | null

  init: () => Promise<void>
  reset: () => void
  updateInfo: (patch: Partial<TournamentInfo>) => void

  addPlayer: (data: Omit<Player, 'id' | 'seed'> & Partial<Pick<Player, 'seed'>>) => void
  addPlayersBatch: (
    list: { name: string; rating: number; team: string; status?: PlayerStatus; note?: string }[],
  ) => void
  updatePlayer: (id: string, patch: Partial<Player>) => void
  removePlayer: (id: string) => void
  setPlayerStatus: (id: string, status: PlayerStatus) => void

  generateRound: (roundNumber: number, lockedMatches?: Match[]) => boolean
  regenerateRound: (roundNumber: number) => boolean
  canRegenerateRound: (roundNumber: number) => boolean

  updateMatch: (matchId: string, patch: Partial<Match>) => void
  setMatchResult: (matchId: string, result: MatchResult) => void
  toggleMatchLock: (matchId: string) => void
  swapMatchColors: (matchId: string) => void
  swapPlayersBetweenMatches: (matchId1: string, matchId2: string, playerId: string) => void

  startRound: (roundNumber: number) => void
  completeRound: (roundNumber: number) => void

  saveToDisk: () => Promise<{ success: boolean; error?: string }>
  exportToFile: () => Promise<{ success: boolean; canceled?: boolean; path?: string; error?: string }>
  importFromFile: () => Promise<{ success: boolean; canceled?: boolean; error?: string; path?: string }>
  importData: (data: TournamentState) => void

  printPairings: (roundNumber: number) => void
  printStandings: () => void

  getScores: () => ReturnType<typeof computeScores>
  getTiebreaks: () => ReturnType<typeof computeTiebreaks>
  getRounds: () => Round[]
  getPlayerScore: (playerId: string) => number
}

function autoAssignSeed(players: Player[]): number {
  if (players.length === 0) return 1
  return Math.max(...players.map((p) => p.seed)) + 1
}

function updatePairingsRecord(state: TournamentState): TournamentState {
  const pairings: TournamentState['pairings'] = {}
  const colorBalance: TournamentState['colorBalance'] = {}
  for (const p of state.players) {
    pairings[p.id] = []
    colorBalance[p.id] = { white: 0, black: 0 }
  }
  for (const round of state.rounds) {
    for (const m of round.matches) {
      if (m.whiteId && pairings[m.whiteId]) {
        if (m.blackId) pairings[m.whiteId].push(m.blackId)
        colorBalance[m.whiteId].white++
      }
      if (m.blackId && pairings[m.blackId]) {
        if (m.whiteId) pairings[m.blackId].push(m.whiteId)
        colorBalance[m.blackId].black++
      }
    }
  }
  return { ...state, pairings, colorBalance }
}

function refreshRoundStatuses(state: TournamentState): TournamentState {
  return {
    ...state,
    rounds: state.rounds.map((r) => {
      const status = roundStatusCheck(r)
      let completedAt = r.completedAt
      let generatedAt = r.generatedAt
      if (status === 'generated' && !r.generatedAt) generatedAt = new Date().toISOString()
      if (status === 'completed' && !r.completedAt) completedAt = new Date().toISOString()
      if (status !== 'completed') completedAt = undefined
      return { ...r, status, generatedAt, completedAt }
    }),
  }
}

const saveQueue: { promise: Promise<unknown> | null } = { promise: null }

export const useTournament = create<TournamentStore>((set, get) => ({
  state: createEmptyState(),
  loaded: false,
  autoSave: true,
  lastError: null,
  lastWarnings: null,

  init: async () => {
    try {
      if (typeof window !== 'undefined' && window.api && window.api.loadData) {
        const res = await window.api.loadData()
        if (res.success && res.data) {
          let valid = res.data
          if (!valid.pairings) valid = updatePairingsRecord(valid)
          valid = refreshRoundStatuses(valid)
          set({ state: valid, loaded: true })
        } else {
          set({ loaded: true })
        }
      } else {
        set({ loaded: true })
      }
    } catch (err) {
      set({ loaded: true, lastError: (err as Error).message })
    }
  },

  reset: () => {
    set({ state: createEmptyState(), lastWarnings: null, lastError: null })
    get().saveToDisk()
  },

  updateInfo: (patch) => {
    set((s) => ({
      state: {
        ...s.state,
        info: { ...s.state.info, ...patch },
        updatedAt: new Date().toISOString(),
      },
    }))
    get().saveToDisk()
  },

  addPlayer: (data) => {
    set((s) => {
      const seed = data.seed ?? autoAssignSeed(s.state.players)
      const player: Player = {
        id: uid('P'),
        name: data.name,
        rating: data.rating ?? 0,
        team: data.team ?? '',
        status: data.status ?? 'active',
        seed,
        note: data.note,
      }
      const newPlayers = [...s.state.players, player]
      const pairings = { ...s.state.pairings, [player.id]: [] }
      const colorBalance = { ...s.state.colorBalance, [player.id]: { white: 0, black: 0 } }
      return {
        state: {
          ...s.state,
          players: newPlayers,
          pairings,
          colorBalance,
          updatedAt: new Date().toISOString(),
        },
      }
    })
    get().saveToDisk()
  },

  addPlayersBatch: (list) => {
    set((s) => {
      let nextSeed = autoAssignSeed(s.state.players)
      const players = list.map((data) => ({
        id: uid('P'),
        name: data.name,
        rating: data.rating ?? 0,
        team: data.team ?? '',
        status: data.status ?? 'active',
        seed: nextSeed++,
        note: data.note,
      }))
      const pairings = { ...s.state.pairings }
      const colorBalance = { ...s.state.colorBalance }
      for (const p of players) {
        pairings[p.id] = []
        colorBalance[p.id] = { white: 0, black: 0 }
      }
      return {
        state: {
          ...s.state,
          players: [...s.state.players, ...players],
          pairings,
          colorBalance,
          updatedAt: new Date().toISOString(),
        },
      }
    })
    get().saveToDisk()
  },

  updatePlayer: (id, patch) => {
    set((s) => ({
      state: {
        ...s.state,
        players: s.state.players.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        updatedAt: new Date().toISOString(),
      },
    }))
    get().saveToDisk()
  },

  removePlayer: (id) => {
    set((s) => {
      const { [id]: _, ...pairings } = s.state.pairings
      const { [id]: __, ...colorBalance } = s.state.colorBalance
      const rounds = s.state.rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) => ({
          ...m,
          whiteId: m.whiteId === id ? '' : m.whiteId,
          blackId: m.blackId === id ? '' : m.blackId,
        })),
      }))
      const newState = updatePairingsRecord({
        ...s.state,
        players: s.state.players.filter((p) => p.id !== id),
        pairings,
        colorBalance,
        rounds,
        updatedAt: new Date().toISOString(),
      })
      return { state: refreshRoundStatuses(newState) }
    })
    get().saveToDisk()
  },

  setPlayerStatus: (id, status) => {
    set((s) => ({
      state: {
        ...s.state,
        players: s.state.players.map((p) => (p.id === id ? { ...p, status } : p)),
        updatedAt: new Date().toISOString(),
      },
    }))
    get().saveToDisk()
  },

  canRegenerateRound: (roundNumber) => {
    const round = get().state.rounds.find((r) => r.number === roundNumber)
    if (!round) return true
    return !isRoundStarted(round)
  },

  generateRound: (roundNumber, lockedMatches = []) => {
    const { state } = get()
    const res = generateRoundPairings(state, { roundNumber, lockedMatches })
    if (res.errors.length > 0) {
      set({ lastWarnings: { round: roundNumber, warnings: res.warnings, errors: res.errors } })
      return false
    }
    set((s) => {
      const existing = s.state.rounds.findIndex((r) => r.number === roundNumber)
      const round: Round = {
        number: roundNumber,
        status: 'generated',
        matches: res.matches,
        generatedAt: new Date().toISOString(),
      }
      let rounds = s.state.rounds.slice()
      if (existing >= 0) {
        rounds[existing] = round
      } else {
        rounds.push(round)
      }
      rounds.sort((a, b) => a.number - b.number)
      const updated = updatePairingsRecord({
        ...s.state,
        rounds,
        updatedAt: new Date().toISOString(),
      })
      return {
        state: refreshRoundStatuses(updated),
        lastWarnings: { round: roundNumber, warnings: res.warnings, errors: [] },
      }
    })
    get().saveToDisk()
    return true
  },

  regenerateRound: (roundNumber) => {
    if (!get().canRegenerateRound(roundNumber)) {
      set({ lastError: `第 ${roundNumber} 轮已有成绩录入，不能重新生成` })
      return false
    }
    const existing = get().state.rounds.find((r) => r.number === roundNumber)
    const locked = existing?.matches.filter((m) => m.locked) ?? []
    return get().generateRound(roundNumber, locked)
  },

  updateMatch: (matchId, patch) => {
    set((s) => {
      const rounds = s.state.rounds.map((r) => ({
        ...r,
        matches: r.matches.map((m) => (m.id === matchId ? { ...m, ...patch } : m)),
      }))
      const updated = updatePairingsRecord({
        ...s.state,
        rounds,
        updatedAt: new Date().toISOString(),
      })
      return { state: refreshRoundStatuses(updated) }
    })
    get().saveToDisk()
  },

  setMatchResult: (matchId, result) => {
    get().updateMatch(matchId, { result })
  },

  toggleMatchLock: (matchId) => {
    const m = get()
      .state.rounds.flatMap((r) => r.matches)
      .find((x) => x.id === matchId)
    if (m) get().updateMatch(matchId, { locked: !m.locked })
  },

  swapMatchColors: (matchId) => {
    const m = get()
      .state.rounds.flatMap((r) => r.matches)
      .find((x) => x.id === matchId)
    if (m) {
      get().updateMatch(matchId, {
        whiteId: m.blackId,
        blackId: m.whiteId,
        result: 'pending',
      })
    }
  },

  swapPlayersBetweenMatches: (matchId1, matchId2, playerId) => {
    const all = get().state.rounds.flatMap((r) => r.matches)
    const m1 = all.find((x) => x.id === matchId1)
    const m2 = all.find((x) => x.id === matchId2)
    if (!m1 || !m2) return
    const inM1 = m1.whiteId === playerId ? 'white' : m1.blackId === playerId ? 'black' : null
    const inM2 = m2.whiteId === playerId ? 'white' : m2.blackId === playerId ? 'black' : null
    if (!inM1 && !inM2) return
    if (inM1) {
      const other = inM1 === 'white' ? m1.blackId : m1.whiteId
      get().updateMatch(matchId1, {
        whiteId: inM1 === 'white' ? m2.whiteId : other,
        blackId: inM1 === 'black' ? m2.whiteId : other,
      })
      get().updateMatch(matchId2, {
        whiteId: m2.whiteId === m2.whiteId ? playerId : m2.whiteId,
        blackId: inM1 === 'white' ? m2.blackId : m2.blackId,
      })
      if (inM1 === 'white') {
        get().updateMatch(matchId2, {
          whiteId: playerId,
          blackId: m2.blackId === playerId ? m1.blackId : m2.blackId,
        })
      } else {
        get().updateMatch(matchId2, {
          blackId: playerId,
          whiteId: m2.whiteId === playerId ? m1.whiteId : m2.whiteId,
        })
      }
    }
  },

  startRound: (roundNumber) => {
    set((s) => ({
      state: {
        ...s.state,
        rounds: s.state.rounds.map((r) =>
          r.number === roundNumber ? { ...r, status: 'in-progress' } : r,
        ),
        updatedAt: new Date().toISOString(),
      },
    }))
  },

  completeRound: (roundNumber) => {
    set((s) => ({
      state: {
        ...s.state,
        rounds: s.state.rounds.map((r) =>
          r.number === roundNumber
            ? { ...r, status: 'completed', completedAt: new Date().toISOString() }
            : r,
        ),
        updatedAt: new Date().toISOString(),
      },
    }))
    get().saveToDisk()
  },

  saveToDisk: async () => {
    try {
      if (typeof window !== 'undefined' && window.api && window.api.saveData) {
        const res = await window.api.saveData(get().state)
        if (!res.success) {
          set({ lastError: res.error ?? '保存失败' })
          return res
        }
        set({ state: { ...get().state, lastSavedAt: new Date().toISOString() } as any })
        return res
      }
    } catch (err) {
      set({ lastError: (err as Error).message })
      return { success: false, error: (err as Error).message }
    }
    return { success: true }
  },

  exportToFile: async () => {
    try {
      if (typeof window !== 'undefined' && window.api && window.api.exportFile) {
        const res = await window.api.exportFile(get().state)
        return res
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
    return { success: false }
  },

  importFromFile: async () => {
    try {
      if (typeof window !== 'undefined' && window.api && window.api.importFile) {
        const res = await window.api.importFile()
        if (res.success && res.data) {
          get().importData(res.data)
          return { success: true, path: res.path }
        }
        return res as any
      }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
    return { success: false }
  },

  importData: (data) => {
    let valid = updatePairingsRecord(data)
    valid = refreshRoundStatuses(valid)
    set({ state: valid })
    get().saveToDisk()
  },

  printPairings: (roundNumber) => {
    const round = get().state.rounds.find((r) => r.number === roundNumber)
    if (!round) return
    const { players, info } = get().state
    const byPlayer = Object.fromEntries(players.map((p) => [p.id, p]))
    const rows = round.matches
      .slice()
      .sort((a, b) => a.board - b.board)
      .map((m) => {
        const w = byPlayer[m.whiteId]
        const b = byPlayer[m.blackId]
        const whiteStr = w
          ? `${w.name}${w.team ? `（${w.team}）` : ''} [${w.rating}]`
          : '轮空'
        const blackStr = b
          ? `${b.name}${b.team ? `（${b.team}）` : ''} [${b.rating}]`
          : ''
        return `<tr>
          <td style="padding:8px 12px;border:1px solid #ccc;">${m.board}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${whiteStr}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">VS</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${blackStr}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${m.locked ? '🔒锁定' : ''}</td>
        </tr>`
      })
      .join('')
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${info.name} - 第${roundNumber}轮对阵</title>
<style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;padding:32px;color:#222;}
h1{text-align:center;margin-bottom:8px;}
.meta{text-align:center;color:#666;margin-bottom:24px;}
table{width:100%;border-collapse:collapse;font-size:14px;}
th{background:#f5e6d3;padding:10px 12px;border:1px solid #ccc;}
</style></head><body>
<h1>${info.name} - 第 ${roundNumber} 轮对阵</h1>
<div class="meta">${info.date} ${info.location} · 用时 ${info.timeControl}</div>
<table><thead><tr><th>台次</th><th>白方</th><th></th><th>黑方</th><th>备注</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`
    if (window.api?.printPairings) window.api.printPairings(html)
  },

  printStandings: () => {
    const tiebreaks = get().getTiebreaks()
    const { players, info } = get().state
    const scores = get().getScores()
    const byPlayer = Object.fromEntries(players.map((p) => [p.id, p]))
    const rows = tiebreaks
      .map((t, idx) => {
        const p = byPlayer[t.playerId]
        const s = scores[t.playerId]
        if (!p) return ''
        return `<tr>
          <td style="padding:8px 12px;border:1px solid #ccc;text-align:center;">${idx + 1}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${p.seed}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${p.name}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${p.team || '-'}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${p.rating}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;text-align:center;">${t.score}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;text-align:center;">${t.sonnebornBerger}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;text-align:center;">${t.buchholz}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;text-align:center;">${s?.played ?? 0}</td>
          <td style="padding:8px 12px;border:1px solid #ccc;">${t.tiebreakReasons.join('；') || '-'}</td>
        </tr>`
      })
      .join('')
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${info.name} - 最终名次</title>
<style>body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;padding:32px;color:#222;}
h1{text-align:center;margin-bottom:8px;}
.meta{text-align:center;color:#666;margin-bottom:24px;}
table{width:100%;border-collapse:collapse;font-size:12px;}
th{background:#f5e6d3;padding:10px 8px;border:1px solid #ccc;}
</style></head><body>
<h1>${info.name} - 最终名次</h1>
<div class="meta">${info.date} ${info.location} · 共 ${info.totalRounds} 轮 · 用时 ${info.timeControl}</div>
<table><thead><tr>
<th>名次</th><th>序号</th><th>姓名</th><th>队伍</th><th>等级分</th><th>积分</th><th>SB</th><th>布赫兹</th><th>局数</th><th>同分说明</th>
</tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`
    if (window.api?.printStandings) window.api.printStandings(html)
  },

  getScores: () => computeScores(get().state),
  getTiebreaks: () => computeTiebreaks(get().state, computeScores(get().state)),
  getRounds: () => get().state.rounds,
  getPlayerScore: (playerId) => get().getScores()[playerId]?.score ?? 0,
}))
