import type { Player } from '@/types/tournament'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function uid(prefix = '', length = 12): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return prefix ? `${prefix}_${out}` : out
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function getPlayerById(players: Player[], id: string | null | undefined): Player | undefined {
  if (!id) return undefined
  return players.find((p) => p.id === id)
}

export function formatDateTime(iso?: string): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

export function roundToNearestHalf(n: number): number {
  return Math.round(n * 2) / 2
}
