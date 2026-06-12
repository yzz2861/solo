import type { LevelConfig, HexCell } from "@/types/game"

function generateCells(
  width: number,
  height: number,
  terrainFn: (col: number, row: number) => { terrain: HexCell["terrain"]; baseElevation: number }
): HexCell[] {
  const cells: HexCell[] = []
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const q = col - Math.floor(row / 2)
      const r = row
      const { terrain, baseElevation } = terrainFn(col, row)
      cells.push({ q, r, terrain, baseElevation })
    }
  }
  return cells
}

function generateSafeZoneCells(width: number, rowCount: number): { q: number; r: number }[] {
  const cells: { q: number; r: number }[] = []
  for (let row = 0; row < rowCount; row++) {
    for (let col = 0; col < width; col++) {
      cells.push({ q: col - Math.floor(row / 2), r: row })
    }
  }
  return cells
}

const level1: LevelConfig = {
  id: "reef-bay",
  name: "礁石湾 - 初级训练",
  region: "东海景区",
  difficulty: 1,
  description: "礁石湾初级训练关卡",
  mapWidth: 8,
  mapHeight: 6,
  cells: generateCells(8, 6, (col, row) => {
    if (row <= 1) return { terrain: "safe", baseElevation: 8 }
    if (row === 2) return { terrain: "shallow", baseElevation: 4 }
    if (row >= 3 && row <= 4) {
      if ((col + row) % 3 === 0) return { terrain: "reef", baseElevation: 3 }
      return { terrain: "shallow", baseElevation: 4 }
    }
    if (row === 5) {
      if (col % 4 === 0) return { terrain: "rock", baseElevation: 10 }
      return { terrain: "deep", baseElevation: 1 }
    }
    return { terrain: "deep", baseElevation: 1 }
  }),
  tidalCurve: {
    steps: [
      { turn: 0, waterLevel: 0, label: "退潮" },
      { turn: 3, waterLevel: 1.5, label: "开始涨潮" },
      { turn: 6, waterLevel: 2.5, label: "潮水上升" },
      { turn: 9, waterLevel: 4, label: "急涨" },
      { turn: 12, waterLevel: 5.5, label: "高水位" },
      { turn: 15, waterLevel: 6, label: "满潮" },
    ],
  },
  tidalWindows: [
    { startTurn: 0, endTurn: 8, description: "礁石区东部通道", affectedCells: [] },
    { startTurn: 0, endTurn: 6, description: "礁石区西部浅滩通道", affectedCells: [] },
  ],
  touristGroups: [
    { id: "tg1", position: { q: 2, r: 4 }, count: 3, stamina: 10, maxStamina: 10 },
    { id: "tg2", position: { q: 5, r: 3 }, count: 2, stamina: 8, maxStamina: 8 },
    { id: "tg3", position: { q: 6, r: 5 }, count: 4, stamina: 6, maxStamina: 6 },
  ],
  boats: [
    { id: "boat1", position: { q: 3, r: 1 }, capacity: 4 },
    { id: "boat2", position: { q: 5, r: 1 }, capacity: 3 },
  ],
  safeZoneCells: generateSafeZoneCells(8, 2),
  maxTurns: 15,
}

const level2: LevelConfig = {
  id: "danger-point",
  name: "险滩角 - 中级演练",
  region: "南海景区",
  difficulty: 3,
  description: "险滩角中级演练关卡",
  mapWidth: 10,
  mapHeight: 7,
  cells: generateCells(10, 7, (col, row) => {
    if (row <= 1) return { terrain: "safe", baseElevation: 9 }
    if (row === 2) return { terrain: "shallow", baseElevation: 5 }
    if (row >= 3 && row <= 4) {
      if ((col + row) % 2 === 0) return { terrain: "reef", baseElevation: 3 }
      return { terrain: "shallow", baseElevation: 5 }
    }
    if (row === 5) {
      if ((col + row) % 3 === 0) return { terrain: "shallow", baseElevation: 4 }
      return { terrain: "deep", baseElevation: 2 }
    }
    if (row === 6) {
      if (col % 4 === 0) return { terrain: "rock", baseElevation: 11 }
      return { terrain: "deep", baseElevation: 1 }
    }
    return { terrain: "deep", baseElevation: 1 }
  }),
  tidalCurve: {
    steps: [
      { turn: 0, waterLevel: 0, label: "退潮" },
      { turn: 3, waterLevel: 2, label: "微涨" },
      { turn: 6, waterLevel: 3.5, label: "涨潮" },
      { turn: 10, waterLevel: 5, label: "急涨" },
      { turn: 14, waterLevel: 7, label: "高水位" },
      { turn: 18, waterLevel: 8, label: "满潮" },
    ],
  },
  tidalWindows: [
    { startTurn: 0, endTurn: 9, description: "北侧浅滩通道", affectedCells: [] },
    { startTurn: 0, endTurn: 7, description: "中部礁石通道", affectedCells: [] },
    { startTurn: 0, endTurn: 5, description: "南侧深水通道", affectedCells: [] },
  ],
  touristGroups: [
    { id: "tg1", position: { q: 1, r: 4 }, count: 3, stamina: 8, maxStamina: 8 },
    { id: "tg2", position: { q: 4, r: 3 }, count: 5, stamina: 10, maxStamina: 10 },
    { id: "tg3", position: { q: 7, r: 5 }, count: 2, stamina: 5, maxStamina: 5 },
    { id: "tg4", position: { q: 8, r: 6 }, count: 4, stamina: 6, maxStamina: 6 },
  ],
  boats: [
    { id: "boat1", position: { q: 2, r: 1 }, capacity: 5 },
    { id: "boat2", position: { q: 7, r: 1 }, capacity: 4 },
  ],
  safeZoneCells: generateSafeZoneCells(10, 2),
  maxTurns: 18,
}

const level3: LevelConfig = {
  id: "dark-reef",
  name: "暗礁峡 - 高级考核",
  region: "东海景区",
  difficulty: 5,
  description: "暗礁峡高级考核关卡",
  mapWidth: 12,
  mapHeight: 8,
  cells: generateCells(12, 8, (col, row) => {
    if (row <= 1) return { terrain: "safe", baseElevation: 10 }
    if (row === 2) {
      if (col === 3 || col === 8) return { terrain: "rock", baseElevation: 12 }
      return { terrain: "shallow", baseElevation: 5 }
    }
    if (row >= 3 && row <= 5) {
      if (col === 2 || col === 5 || col === 8) return { terrain: "shallow", baseElevation: 5 }
      return { terrain: "reef", baseElevation: 3 }
    }
    if (row === 6) {
      if ((col + row) % 3 === 0) return { terrain: "deep", baseElevation: 2 }
      return { terrain: "shallow", baseElevation: 4 }
    }
    if (row === 7) {
      if (col % 3 === 0) return { terrain: "rock", baseElevation: 13 }
      return { terrain: "deep", baseElevation: 1 }
    }
    return { terrain: "deep", baseElevation: 1 }
  }),
  tidalCurve: {
    steps: [
      { turn: 0, waterLevel: 0, label: "退潮" },
      { turn: 4, waterLevel: 2, label: "微涨" },
      { turn: 8, waterLevel: 4, label: "涨潮" },
      { turn: 12, waterLevel: 6, label: "急涨" },
      { turn: 16, waterLevel: 8, label: "接近满潮" },
      { turn: 20, waterLevel: 9, label: "满潮" },
    ],
  },
  tidalWindows: [
    { startTurn: 0, endTurn: 10, description: "东侧窄通道", affectedCells: [] },
    { startTurn: 0, endTurn: 8, description: "西侧礁石通道", affectedCells: [] },
    { startTurn: 0, endTurn: 6, description: "中央浅滩通道", affectedCells: [] },
    { startTurn: 0, endTurn: 12, description: "外围深水绕行", affectedCells: [] },
  ],
  touristGroups: [
    { id: "tg1", position: { q: 1, r: 5 }, count: 4, stamina: 7, maxStamina: 7 },
    { id: "tg2", position: { q: 4, r: 4 }, count: 3, stamina: 9, maxStamina: 9 },
    { id: "tg3", position: { q: 7, r: 6 }, count: 5, stamina: 5, maxStamina: 5 },
    { id: "tg4", position: { q: 9, r: 3 }, count: 2, stamina: 6, maxStamina: 6 },
    { id: "tg5", position: { q: 10, r: 7 }, count: 3, stamina: 4, maxStamina: 4 },
  ],
  boats: [
    { id: "boat1", position: { q: 2, r: 1 }, capacity: 5 },
    { id: "boat2", position: { q: 6, r: 1 }, capacity: 4 },
    { id: "boat3", position: { q: 9, r: 1 }, capacity: 3 },
  ],
  safeZoneCells: generateSafeZoneCells(12, 2),
  maxTurns: 20,
}

export const levels: LevelConfig[] = [level1, level2, level3]
