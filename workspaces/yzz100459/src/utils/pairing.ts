import type {
  Match,
  MatchResult,
  Player,
  Round,
  TiebreakRecord,
  TournamentInfo,
  TournamentState,
} from '@/types/tournament'
import { roundToNearestHalf, shuffle } from './common'

export interface ScoreResult {
  [playerId: string]: {
    score: number
    wins: number
    draws: number
    losses: number
    played: number
    byes: number
    forfeits: number
    noShows: number
    blackGames: number
    whiteGames: number
    opponents: string[]
    gameResults: { opponentId: string; result: 'win' | 'loss' | 'draw'; isWhite: boolean }[]
  }
}

function resultPoints(
  result: MatchResult,
  forPlayerId: string,
  match: Match,
  info: TournamentInfo,
): number {
  const isWhite = match.whiteId === forPlayerId
  const { winPoints, drawPoints, lossPoints } = info
  switch (result) {
    case 'win-white':
      return isWhite ? winPoints : lossPoints
    case 'win-black':
      return isWhite ? lossPoints : winPoints
    case 'draw':
      return drawPoints
    case 'forfeit-white':
      return isWhite ? lossPoints : winPoints
    case 'forfeit-black':
      return isWhite ? winPoints : lossPoints
    case 'bye-white':
      return isWhite ? winPoints : 0
    case 'bye-black':
      return isWhite ? 0 : winPoints
    case 'no-show-white':
      return isWhite ? lossPoints : winPoints
    case 'no-show-black':
      return isWhite ? winPoints : lossPoints
    default:
      return 0
  }
}

function classify(
  result: MatchResult,
  forPlayerId: string,
  match: Match,
): 'win' | 'loss' | 'draw' | null {
  if (result === 'pending') return null
  const isWhite = match.whiteId === forPlayerId
  switch (result) {
    case 'win-white':
      return isWhite ? 'win' : 'loss'
    case 'win-black':
      return isWhite ? 'loss' : 'win'
    case 'draw':
      return 'draw'
    case 'forfeit-white':
      return isWhite ? 'loss' : 'win'
    case 'forfeit-black':
      return isWhite ? 'win' : 'loss'
    case 'bye-white':
      return isWhite ? 'win' : null
    case 'bye-black':
      return isWhite ? null : 'win'
    case 'no-show-white':
      return isWhite ? 'loss' : 'win'
    case 'no-show-black':
      return isWhite ? 'win' : 'loss'
  }
  return null
}

export function computeScores(state: TournamentState): ScoreResult {
  const { info, players, rounds } = state
  const scores: ScoreResult = {}
  for (const p of players) {
    scores[p.id] = {
      score: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      played: 0,
      byes: 0,
      forfeits: 0,
      noShows: 0,
      blackGames: 0,
      whiteGames: 0,
      opponents: [],
      gameResults: [],
    }
  }

  for (const round of rounds) {
    for (const m of round.matches) {
      const white = m.whiteId
      const black = m.blackId
      if (white && scores[white]) {
        scores[white].whiteGames++
        const pts = resultPoints(m.result, white, m, info)
        scores[white].score = roundToNearestHalf(scores[white].score + pts)
        const cls = classify(m.result, white, m)
        if (cls) scores[white].played++
        if (cls === 'win') scores[white].wins++
        if (cls === 'draw') scores[white].draws++
        if (cls === 'loss') scores[white].losses++
        if (m.result === 'bye-white') scores[white].byes++
        if (m.result === 'forfeit-white') scores[white].forfeits++
        if (m.result === 'forfeit-black') scores[white].noShows++
        if (black) {
          scores[white].opponents.push(black)
          if (cls && black) {
            scores[white].gameResults.push({ opponentId: black, result: cls, isWhite: true })
          }
        }
      }
      if (black && scores[black]) {
        scores[black].blackGames++
        const pts = resultPoints(m.result, black, m, info)
        scores[black].score = roundToNearestHalf(scores[black].score + pts)
        const cls = classify(m.result, black, m)
        if (cls) scores[black].played++
        if (cls === 'win') scores[black].wins++
        if (cls === 'draw') scores[black].draws++
        if (cls === 'loss') scores[black].losses++
        if (m.result === 'bye-black') scores[black].byes++
        if (m.result === 'forfeit-black') scores[black].forfeits++
        if (m.result === 'forfeit-white') scores[black].noShows++
        if (white) {
          scores[black].opponents.push(white)
          if (cls && white) {
            scores[black].gameResults.push({ opponentId: white, result: cls, isWhite: false })
          }
        }
      }
    }
  }

  return scores
}

export function computeTiebreaks(
  state: TournamentState,
  scores: ScoreResult,
): TiebreakRecord[] {
  const { players } = state
  const records: TiebreakRecord[] = []
  for (const p of players) {
    const ps = scores[p.id]
    const opponentScores = ps.opponents
      .map((oid) => scores[oid]?.score ?? 0)
      .filter((s) => s != null)
    const buchholz = opponentScores.reduce((a, b) => a + b, 0)

    let sb = 0
    let blackWins = 0
    for (const g of ps.gameResults) {
      const oppScore = scores[g.opponentId]?.score ?? 0
      if (g.result === 'win') {
        sb += oppScore
        if (!g.isWhite) blackWins++
      } else if (g.result === 'draw') {
        sb += oppScore / 2
      }
    }

    let ratingAvg = 0
    const realOpponents = ps.opponents.filter((oid) => {
      const op = state.players.find((x) => x.id === oid)
      return op && op.status !== 'bye'
    })
    if (realOpponents.length > 0) {
      ratingAvg =
        realOpponents.reduce(
          (a, oid) => a + (state.players.find((x) => x.id === oid)?.rating ?? 0),
          0,
        ) / realOpponents.length
    }

    records.push({
      playerId: p.id,
      score: ps.score,
      buchholz: roundToNearestHalf(buchholz),
      sonnebornBerger: roundToNearestHalf(sb),
      wins: ps.wins,
      blackWins,
      directEncounter: 0,
      ratingAverage: roundToNearestHalf(ratingAvg),
      tiebreakReasons: [],
    })
  }

  const groups: Record<string, TiebreakRecord[]> = {}
  for (const r of records) {
    const k = String(r.score)
    if (!groups[k]) groups[k] = []
    groups[k].push(r)
  }

  for (const key of Object.keys(groups)) {
    const group = groups[key]
    if (group.length < 2) {
      group[0].tiebreakReasons.push(`积分 ${key}，排名唯一`)
      continue
    }
    group[0].tiebreakReasons.push(`积分 ${key}（共 ${group.length} 人同分）`)
    for (let i = 1; i < group.length; i++) {
      group[i].tiebreakReasons.push(`积分 ${key}（共 ${group.length} 人同分）`)
    }

    const ids = group.map((g) => g.playerId)
    for (const g of group) {
      let de = 0
      const playerScores = scores[g.playerId]
      for (const gr of playerScores.gameResults) {
        if (ids.includes(gr.opponentId)) {
          if (gr.result === 'win') de += state.info.winPoints
          else if (gr.result === 'draw') de += state.info.drawPoints
          else if (gr.result === 'loss') de += state.info.lossPoints
        }
      }
      g.directEncounter = roundToNearestHalf(de)
    }

    group.sort((a, b) => {
      if (a.directEncounter !== b.directEncounter) return b.directEncounter - a.directEncounter
      if (a.sonnebornBerger !== b.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger
      if (a.buchholz !== b.buchholz) return b.buchholz - a.buchholz
      if (a.wins !== b.wins) return b.wins - a.wins
      if (a.blackWins !== b.blackWins) return b.blackWins - a.blackWins
      const pa = state.players.find((p) => p.id === a.playerId)
      const pb = state.players.find((p) => p.id === b.playerId)
      return (pb?.rating ?? 0) - (pa?.rating ?? 0)
    })
  }

  records.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score
    if (a.directEncounter !== b.directEncounter) return b.directEncounter - a.directEncounter
    if (a.sonnebornBerger !== b.sonnebornBerger) return b.sonnebornBerger - a.sonnebornBerger
    if (a.buchholz !== b.buchholz) return b.buchholz - a.buchholz
    if (a.wins !== b.wins) return b.wins - a.wins
    if (a.blackWins !== b.blackWins) return b.blackWins - a.blackWins
    if (a.ratingAverage !== b.ratingAverage) return b.ratingAverage - a.ratingAverage
    const pa = state.players.find((p) => p.id === a.playerId)
    const pb = state.players.find((p) => p.id === b.playerId)
    return (pb?.rating ?? 0) - (pa?.rating ?? 0)
  })

  for (let i = 0; i < records.length; i++) {
    const r = records[i]
    if (i === 0) continue
    const prev = records[i - 1]
    if (r.score === prev.score && r.tiebreakReasons.length > 0) {
      const reasons: string[] = []
      if (r.directEncounter < prev.directEncounter) {
        reasons.push(`直胜分 ${r.directEncounter} < ${prev.directEncounter}`)
      } else if (r.sonnebornBerger < prev.sonnebornBerger) {
        reasons.push(`SB分 ${r.sonnebornBerger} < ${prev.sonnebornBerger}`)
      } else if (r.buchholz < prev.buchholz) {
        reasons.push(`布赫兹分 ${r.buchholz} < ${prev.buchholz}`)
      } else if (r.wins < prev.wins) {
        reasons.push(`胜局数 ${r.wins} < ${prev.wins}`)
      } else if (r.blackWins < prev.blackWins) {
        reasons.push(`执黑胜局 ${r.blackWins} < ${prev.blackWins}`)
      } else if (r.ratingAverage < prev.ratingAverage) {
        reasons.push(`对手平均分 ${r.ratingAverage} < ${prev.ratingAverage}`)
      } else {
        const pa = state.players.find((p) => p.id === r.playerId)
        const pb = state.players.find((p) => p.id === prev.playerId)
        reasons.push(`等级分 ${pa?.rating ?? 0} < ${pb?.rating ?? 0}`)
      }
      r.tiebreakReasons.push(...reasons)
    }
  }

  return records
}

export interface PairingCandidate {
  playerId: string
  score: number
  rating: number
  seed: number
  status: Player['status']
  team: string
  whiteGames: number
  blackGames: number
  opponents: Set<string>
  encounterCount: Record<string, number>
}

export function buildCandidates(
  state: TournamentState,
  scores: ScoreResult,
): PairingCandidate[] {
  const encounters: Record<string, Record<string, number>> = {}
  for (const round of state.rounds) {
    for (const m of round.matches) {
      if (m.whiteId && m.blackId) {
        if (!encounters[m.whiteId]) encounters[m.whiteId] = {}
        if (!encounters[m.blackId]) encounters[m.blackId] = {}
        encounters[m.whiteId][m.blackId] = (encounters[m.whiteId][m.blackId] ?? 0) + 1
        encounters[m.blackId][m.whiteId] = (encounters[m.blackId][m.whiteId] ?? 0) + 1
      }
    }
  }

  return state.players.map((p) => {
    const ps = scores[p.id]
    return {
      playerId: p.id,
      score: ps?.score ?? 0,
      rating: p.rating,
      seed: p.seed,
      status: p.status,
      team: p.team || '',
      whiteGames: ps?.whiteGames ?? 0,
      blackGames: ps?.blackGames ?? 0,
      opponents: new Set(ps?.opponents ?? []),
      encounterCount: encounters[p.id] ?? {},
    }
  })
}

export function compareRanking(a: PairingCandidate, b: PairingCandidate): number {
  if (a.score !== b.score) return b.score - a.score
  if (a.rating !== b.rating) return b.rating - a.rating
  return a.seed - b.seed
}

export interface PairingOptions {
  roundNumber: number
  lockedMatches: Match[]
}

function countEncounters(a: PairingCandidate, b: PairingCandidate): number {
  return (a.encounterCount[b.playerId] ?? 0) + (b.encounterCount[a.playerId] ?? 0)
}

function isForbiddenPairing(
  a: PairingCandidate,
  b: PairingCandidate,
  state: TournamentState,
  opts: PairingOptions,
): { forbidden: boolean; reason?: string; penalty: number } {
  if (a.playerId === b.playerId) return { forbidden: true, penalty: Infinity }
  if (a.status === 'withdrawn' || b.status === 'withdrawn') {
    return { forbidden: true, penalty: Infinity }
  }

  const maxRepeat = Math.max(1, state.info.maxRepeatEncounters)
  const encounters = countEncounters(a, b)
  if (encounters >= maxRepeat + 1) {
    return { forbidden: true, reason: `已交手 ${encounters} 次（上限 ${maxRepeat}）`, penalty: Infinity }
  }

  let penalty = 0
  if (encounters > 0) {
    penalty += encounters * 50
  }

  if (state.info.avoidSameTeam && a.team && a.team === b.team) {
    if (opts.roundNumber === 1 && state.info.avoidSameTeamRound1) {
      return { forbidden: true, reason: '第一轮禁止同队对阵', penalty: Infinity }
    }
    penalty += 80
  }

  const diffWhite = a.whiteGames - a.blackGames
  const diffBlack = b.whiteGames - b.blackGames
  if (diffWhite > 1 && diffBlack > 1) {
    penalty += 30
  }
  if (diffWhite < -1 && diffBlack < -1) {
    penalty += 30
  }

  const scoreGap = Math.abs(a.score - b.score)
  penalty += scoreGap * 10

  return { forbidden: false, penalty }
}

export interface PairingMatch {
  whiteId: string
  blackId: string
  isBye?: boolean
  reason?: string
}

function pickColor(a: PairingCandidate, b: PairingCandidate): [string, string] {
  const aNeedBlack = a.blackGames < a.whiteGames
  const bNeedBlack = b.blackGames < b.whiteGames
  const aNeedWhite = a.whiteGames < a.blackGames
  const bNeedWhite = b.whiteGames < b.blackGames

  if (aNeedBlack && bNeedWhite) return [b.playerId, a.playerId]
  if (aNeedWhite && bNeedBlack) return [a.playerId, b.playerId]
  if (a.whiteGames === b.whiteGames && a.blackGames === b.blackGames) {
    return Math.random() < 0.5
      ? [a.playerId, b.playerId]
      : [b.playerId, a.playerId]
  }
  if (a.whiteGames + a.blackGames === 0 || b.whiteGames + b.blackGames === 0) {
    if (a.seed < b.seed) return [a.playerId, b.playerId]
    return [b.playerId, a.playerId]
  }
  if (a.whiteGames <= b.whiteGames) return [a.playerId, b.playerId]
  return [b.playerId, a.playerId]
}

function bloomPairing(
  candidates: PairingCandidate[],
  state: TournamentState,
  opts: PairingOptions,
  depth = 0,
  maxDepth = 500,
): PairingMatch[] | null {
  if (depth > maxDepth) return null

  const active = candidates.filter((c) => c.status !== 'withdrawn')
  if (active.length === 0) return []

  const sorted = active.slice().sort(compareRanking)
  const first = sorted[0]
  const rest = sorted.slice(1)
  const restFiltered = rest.filter((c) => c.playerId !== first.playerId)

  if (restFiltered.length === 0) {
    return [{ whiteId: first.playerId, blackId: '', isBye: true, reason: '轮空' }]
  }

  const scored = restFiltered
    .map((c) => {
      const forbid = isForbiddenPairing(first, c, state, opts)
      return { candidate: c, forbid }
    })
    .filter((x) => !x.forbid.forbidden)
    .sort((a, b) => {
      if (a.forbid.penalty !== b.forbid.penalty) return a.forbid.penalty - b.forbid.penalty
      const sa = Math.abs(a.candidate.score - first.score)
      const sb = Math.abs(b.candidate.score - first.score)
      if (sa !== sb) return sa - sb
      return b.candidate.rating - a.candidate.rating
    })

  let usedBye = false
  if (active.length % 2 === 1) {
    const bottomCandidates = active.slice().sort((a, b) => compareRanking(b, a))
    for (const bc of bottomCandidates) {
      if (bc.status === 'withdrawn') continue
      if ((state.pairings[bc.playerId]?.length ?? 0) >= state.rounds.length) continue
      const byeCounts = state.rounds.reduce(
        (n, r) =>
          n +
          r.matches.filter(
            (m) =>
              (m.whiteId === bc.playerId && m.result === 'bye-white') ||
              (m.blackId === bc.playerId && m.result === 'bye-black'),
          ).length,
        0,
      )
      if (byeCounts === 0 && countEncounters(bc, { ...first, playerId: '' } as any) < 999) {
        const others = candidates.filter((c) => c.playerId !== bc.playerId)
        const tryRest = bloomPairing(others, state, opts, depth + 1, maxDepth - 1)
        if (tryRest !== null) {
          return [
            { whiteId: bc.playerId, blackId: '', isBye: true, reason: '轮空（低分优先）' },
            ...tryRest,
          ]
        }
      }
    }
  }

  for (const entry of scored.slice(0, Math.min(40, scored.length))) {
    const { candidate } = entry
    const [whiteId, blackId] = pickColor(first, candidate)
    const remaining = candidates.filter(
      (c) => c.playerId !== first.playerId && c.playerId !== candidate.playerId,
    )
    const sub = bloomPairing(remaining, state, opts, depth + 1, maxDepth - 1)
    if (sub !== null) {
      return [{ whiteId, blackId, reason: entry.forbid.reason }, ...sub]
    }
  }

  if (!usedBye && active.length % 2 === 1) {
    usedBye = true
    const others = candidates.filter((c) => c.playerId !== first.playerId)
    const sub = bloomPairing(others, state, opts, depth + 1, maxDepth - 1)
    if (sub !== null) {
      return [
        { whiteId: first.playerId, blackId: '', isBye: true, reason: '轮空（唯一可选）' },
        ...sub,
      ]
    }
  }

  if (depth < 100) {
    for (const c of restFiltered.slice(0, 20)) {
      const [whiteId, blackId] = pickColor(first, c)
      const remaining = candidates.filter(
        (x) => x.playerId !== first.playerId && x.playerId !== c.playerId,
      )
      const sub = bloomPairing(remaining, state, opts, depth + 20, maxDepth)
      if (sub !== null) {
        return [{ whiteId, blackId, reason: '放宽限制' }, ...sub]
      }
    }
  }

  return null
}

export interface GenerateRoundResult {
  matches: Match[]
  warnings: string[]
  errors: string[]
}

export function generateRoundPairings(
  state: TournamentState,
  opts: PairingOptions,
): GenerateRoundResult {
  const warnings: string[] = []
  const errors: string[] = []
  const roundNumber = opts.roundNumber
  const scores = computeScores(state)
  const candidates = buildCandidates(state, scores)

  const activeCandidates = candidates.filter((c) => c.status !== 'withdrawn')
  if (activeCandidates.length < 2) {
    errors.push('有效选手不足 2 人，无法生成对阵')
    return { matches: [], warnings, errors }
  }

  const locked: Match[] = opts.lockedMatches.filter(
    (m) => m.whiteId && (m.blackId || m.result === 'bye-white' || m.result === 'bye-black'),
  )
  const lockedIds = new Set<string>()
  for (const m of locked) {
    if (m.whiteId) lockedIds.add(m.whiteId)
    if (m.blackId) lockedIds.add(m.blackId)
  }

  const remaining = candidates.filter((c) => !lockedIds.has(c.playerId))

  const shuffledPool = shuffle(remaining)
  const pairings = bloomPairing(shuffledPool, state, opts, 0, 2000)

  if (pairings === null) {
    errors.push('无法在当前约束下生成完整对阵，请检查是否退赛过多或限制条件过严')
    return { matches: [], warnings, errors }
  }

  const matches: Match[] = []
  let board = 1

  for (const m of locked) {
    matches.push({
      ...m,
      round: roundNumber,
      board: board++,
      result: m.blackId ? 'pending' : 'bye-white',
    })
  }

  const sortedPairings = pairings
    .map((p) => {
      const a = candidates.find((c) => c.playerId === p.whiteId)!
      const b = p.blackId ? candidates.find((c) => c.playerId === p.blackId)! : null
      const topScore = b ? Math.max(a.score, b.score) : a.score
      const topRating = b ? Math.max(a.rating, b.rating) : a.rating
      return { p, a, b, topScore, topRating }
    })
    .sort((x, y) => {
      if (x.topScore !== y.topScore) return y.topScore - x.topScore
      if (x.topRating !== y.topRating) return y.topRating - x.topRating
      return 0
    })

  for (const { p } of sortedPairings) {
    if (p.isBye) {
      matches.push({
        id: `R${roundNumber}_B${board}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        round: roundNumber,
        board: board++,
        whiteId: p.whiteId,
        blackId: '',
        result: 'bye-white',
        locked: false,
        note: p.reason,
      })
    } else {
      matches.push({
        id: `R${roundNumber}_B${board}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        round: roundNumber,
        board: board++,
        whiteId: p.whiteId,
        blackId: p.blackId!,
        result: 'pending',
        locked: false,
        note: p.reason,
      })
    }
  }

  const repeatViolations = matches.filter((m) => {
    if (!m.blackId) return false
    const a = state.players.find((p) => p.id === m.whiteId)
    const b = state.players.find((p) => p.id === m.blackId)
    if (!a || !b) return false
    if (!state.info.avoidSameTeam) return false
    return a.team && a.team === b.team
  })
  if (repeatViolations.length > 0) {
    warnings.push(`本轮有 ${repeatViolations.length} 组同队对阵（选手不足已放宽限制）`)
  }

  return { matches, warnings, errors }
}

export function isRoundStarted(round: Round | undefined): boolean {
  if (!round) return false
  return round.matches.some((m) => m.result !== 'pending')
}

export function isRoundCompleted(round: Round | undefined): boolean {
  if (!round) return false
  if (round.matches.length === 0) return false
  return round.matches.every(
    (m) => m.result !== 'pending' && m.result !== undefined && m.result !== null,
  )
}

export function roundStatusCheck(round: Round): Round['status'] {
  if (round.matches.length === 0) return 'pending'
  if (isRoundCompleted(round)) return 'completed'
  if (isRoundStarted(round)) return 'in-progress'
  return 'generated'
}
