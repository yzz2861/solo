import { LevelConfig } from "@/types"

function buildDefaultWalls(cols: number, rows: number, openings: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  const walls: Array<{ x: number; y: number }> = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (y === 0 || y === rows - 1 || x === 0 || x === cols - 1) {
        if (!openings.some(o => o.x === x && o.y === y)) {
          walls.push({ x, y })
        }
      }
    }
  }
  return walls
}

function addInternalWalls(base: Array<{ x: number; y: number }>, walls: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  return [...base, ...walls]
}

export const level1_simple: LevelConfig = {
  id: "level_1",
  name: "西直门站·初级",
  stationName: "西直门站",
  difficulty: 1,
  gridSize: { cols: 20, rows: 12 },
  cellSize: 32,
  walls: addInternalWalls(
    buildDefaultWalls(20, 12, [
      { x: 3, y: 0 }, { x: 10, y: 0 }, { x: 16, y: 0 },
      { x: 5, y: 11 }, { x: 10, y: 11 }, { x: 15, y: 11 },
      { x: 0, y: 4 }, { x: 0, y: 7 },
      { x: 19, y: 4 }, { x: 19, y: 7 }
    ]),
    [
      { x: 6, y: 3 }, { x: 6, y: 4 }, { x: 6, y: 5 },
      { x: 13, y: 3 }, { x: 13, y: 4 }, { x: 13, y: 5 },
      { x: 6, y: 7 }, { x: 6, y: 8 },
      { x: 13, y: 7 }, { x: 13, y: 8 },
    ]
  ),
  passages: [],
  entrances: [
    {
      id: "ent_a", x: 3, y: 1, label: "2号线入口",
      color: "#457b9d", passengerRate: 1.5,
      destinationIds: ["ext_b", "ext_c"]
    },
    {
      id: "ent_b", x: 10, y: 1, label: "4号线入口",
      color: "#2a9d8f", passengerRate: 1.2,
      destinationIds: ["ext_a", "ext_c"]
    },
    {
      id: "ent_c", x: 16, y: 1, label: "13号线入口",
      color: "#e63946", passengerRate: 1.0,
      destinationIds: ["ext_a", "ext_b"]
    }
  ],
  exits: [
    { id: "ext_a", x: 1, y: 4, label: "A出口", color: "#457b9d" },
    { id: "ext_b", x: 1, y: 7, label: "B出口", color: "#2a9d8f" },
    { id: "ext_c", x: 18, y: 5, label: "C出口", color: "#e63946" }
  ],
  escalators: [
    { id: "esc_1", x: 9, y: 6, direction: "up", capacity: 6, initiallyOpen: true },
    { id: "esc_2", x: 11, y: 6, direction: "down", capacity: 6, initiallyOpen: true }
  ],
  transferPoints: [
    { id: "tp_1", x: 9, y: 5, label: "中央换乘口" },
    { id: "tp_2", x: 11, y: 5, label: "南侧换乘口" }
  ],
  timeLimit: 90,
  events: [
    {
      id: "evt_1", type: "escalator_stop", triggerTime: 30,
      params: { escalatorId: "esc_1" }
    }
  ],
  maxGuides: 4,
  maxFences: 15
}

export const level2_medium: LevelConfig = {
  id: "level_2",
  name: "国贸站·中级",
  stationName: "国贸站",
  difficulty: 3,
  gridSize: { cols: 24, rows: 16 },
  cellSize: 28,
  walls: addInternalWalls(
    buildDefaultWalls(24, 16, [
      { x: 4, y: 0 }, { x: 12, y: 0 }, { x: 20, y: 0 },
      { x: 6, y: 15 }, { x: 12, y: 15 }, { x: 18, y: 15 },
      { x: 0, y: 5 }, { x: 0, y: 10 },
      { x: 23, y: 5 }, { x: 23, y: 10 }
    ]),
    [
      { x: 7, y: 4 }, { x: 7, y: 5 }, { x: 7, y: 6 },
      { x: 16, y: 4 }, { x: 16, y: 5 }, { x: 16, y: 6 },
      { x: 7, y: 9 }, { x: 7, y: 10 }, { x: 7, y: 11 },
      { x: 16, y: 9 }, { x: 16, y: 10 }, { x: 16, y: 11 },
      { x: 10, y: 7 }, { x: 11, y: 7 }, { x: 12, y: 7 }, { x: 13, y: 7 },
    ]
  ),
  passages: [],
  entrances: [
    {
      id: "ent_a", x: 4, y: 1, label: "1号线入口",
      color: "#e63946", passengerRate: 2.0,
      destinationIds: ["ext_b", "ext_c", "ext_d"]
    },
    {
      id: "ent_b", x: 12, y: 1, label: "10号线入口",
      color: "#457b9d", passengerRate: 2.5,
      destinationIds: ["ext_a", "ext_c", "ext_d"]
    },
    {
      id: "ent_c", x: 20, y: 1, label: "CBD通道入口",
      color: "#2a9d8f", passengerRate: 1.8,
      destinationIds: ["ext_a", "ext_b"]
    },
    {
      id: "ent_d", x: 12, y: 14, label: "地下商场入口",
      color: "#f4a261", passengerRate: 1.0,
      destinationIds: ["ext_a", "ext_c"]
    }
  ],
  exits: [
    { id: "ext_a", x: 1, y: 5, label: "A出口", color: "#e63946" },
    { id: "ext_b", x: 1, y: 10, label: "B出口", color: "#457b9d" },
    { id: "ext_c", x: 22, y: 5, label: "C出口", color: "#2a9d8f" },
    { id: "ext_d", x: 22, y: 10, label: "D出口", color: "#f4a261" }
  ],
  escalators: [
    { id: "esc_1", x: 9, y: 8, direction: "up", capacity: 6, initiallyOpen: true },
    { id: "esc_2", x: 14, y: 8, direction: "down", capacity: 6, initiallyOpen: true },
    { id: "esc_3", x: 12, y: 5, direction: "up", capacity: 4, initiallyOpen: true }
  ],
  transferPoints: [
    { id: "tp_1", x: 9, y: 8, label: "北侧换乘口" },
    { id: "tp_2", x: 14, y: 8, label: "南侧换乘口" },
    { id: "tp_3", x: 12, y: 5, label: "中央换乘口" }
  ],
  timeLimit: 120,
  events: [
    {
      id: "evt_1", type: "escalator_stop", triggerTime: 25,
      params: { escalatorId: "esc_1" }
    },
    {
      id: "evt_2", type: "exit_close", triggerTime: 50,
      params: { exitId: "ext_c" }
    },
    {
      id: "evt_3", type: "passenger_surge", triggerTime: 70,
      params: { entranceId: "ent_b", multiplier: 3 }
    }
  ],
  maxGuides: 6,
  maxFences: 25
}

export const level3_hard: LevelConfig = {
  id: "level_3",
  name: "人民广场站·高级",
  stationName: "人民广场站",
  difficulty: 5,
  gridSize: { cols: 28, rows: 20 },
  cellSize: 24,
  walls: addInternalWalls(
    buildDefaultWalls(28, 20, [
      { x: 5, y: 0 }, { x: 14, y: 0 }, { x: 23, y: 0 },
      { x: 7, y: 19 }, { x: 14, y: 19 }, { x: 21, y: 19 },
      { x: 0, y: 6 }, { x: 0, y: 13 },
      { x: 27, y: 6 }, { x: 27, y: 13 }
    ]),
    [
      { x: 8, y: 5 }, { x: 8, y: 6 }, { x: 8, y: 7 },
      { x: 19, y: 5 }, { x: 19, y: 6 }, { x: 19, y: 7 },
      { x: 8, y: 12 }, { x: 8, y: 13 }, { x: 8, y: 14 },
      { x: 19, y: 12 }, { x: 19, y: 13 }, { x: 19, y: 14 },
      { x: 12, y: 9 }, { x: 13, y: 9 }, { x: 14, y: 9 }, { x: 15, y: 9 },
      { x: 12, y: 10 }, { x: 13, y: 10 }, { x: 14, y: 10 }, { x: 15, y: 10 },
    ]
  ),
  passages: [],
  entrances: [
    {
      id: "ent_a", x: 5, y: 1, label: "1号线入口",
      color: "#e63946", passengerRate: 2.5,
      destinationIds: ["ext_b", "ext_c", "ext_d", "ext_e"]
    },
    {
      id: "ent_b", x: 14, y: 1, label: "2号线入口",
      color: "#457b9d", passengerRate: 3.0,
      destinationIds: ["ext_a", "ext_c", "ext_d", "ext_e"]
    },
    {
      id: "ent_c", x: 23, y: 1, label: "8号线入口",
      color: "#2a9d8f", passengerRate: 2.0,
      destinationIds: ["ext_a", "ext_b"]
    },
    {
      id: "ent_d", x: 7, y: 18, label: "南京路入口",
      color: "#f4a261", passengerRate: 1.5,
      destinationIds: ["ext_a", "ext_c", "ext_e"]
    },
    {
      id: "ent_e", x: 21, y: 18, label: "西藏路入口",
      color: "#9b5de5", passengerRate: 1.2,
      destinationIds: ["ext_a", "ext_b"]
    }
  ],
  exits: [
    { id: "ext_a", x: 1, y: 6, label: "A出口", color: "#e63946" },
    { id: "ext_b", x: 1, y: 13, label: "B出口", color: "#457b9d" },
    { id: "ext_c", x: 26, y: 6, label: "C出口", color: "#2a9d8f" },
    { id: "ext_d", x: 26, y: 13, label: "D出口", color: "#f4a261" },
    { id: "ext_e", x: 14, y: 18, label: "E出口", color: "#9b5de5" }
  ],
  escalators: [
    { id: "esc_1", x: 10, y: 8, direction: "up", capacity: 6, initiallyOpen: true },
    { id: "esc_2", x: 17, y: 8, direction: "down", capacity: 6, initiallyOpen: true },
    { id: "esc_3", x: 10, y: 11, direction: "up", capacity: 4, initiallyOpen: true },
    { id: "esc_4", x: 17, y: 11, direction: "down", capacity: 4, initiallyOpen: true },
    { id: "esc_5", x: 14, y: 5, direction: "up", capacity: 4, initiallyOpen: true }
  ],
  transferPoints: [
    { id: "tp_1", x: 10, y: 8, label: "西北换乘口" },
    { id: "tp_2", x: 17, y: 8, label: "东北换乘口" },
    { id: "tp_3", x: 10, y: 11, label: "西南换乘口" },
    { id: "tp_4", x: 17, y: 11, label: "东南换乘口" },
    { id: "tp_5", x: 14, y: 5, label: "中央换乘口" }
  ],
  timeLimit: 150,
  events: [
    {
      id: "evt_1", type: "escalator_stop", triggerTime: 20,
      params: { escalatorId: "esc_1" }
    },
    {
      id: "evt_2", type: "exit_close", triggerTime: 40,
      params: { exitId: "ext_c" }
    },
    {
      id: "evt_3", type: "passenger_surge", triggerTime: 60,
      params: { entranceId: "ent_b", multiplier: 3 }
    },
    {
      id: "evt_4", type: "escalator_stop", triggerTime: 80,
      params: { escalatorId: "esc_3" }
    },
    {
      id: "evt_5", type: "exit_close", triggerTime: 100,
      params: { exitId: "ext_a" }
    }
  ],
  maxGuides: 8,
  maxFences: 30
}

export const PRESET_LEVELS: LevelConfig[] = [level1_simple, level2_medium, level3_hard]

export function getAllLevels(): LevelConfig[] {
  const customLevelsJson = localStorage.getItem("custom_levels")
  const customLevels: LevelConfig[] = customLevelsJson ? JSON.parse(customLevelsJson) : []
  return [...PRESET_LEVELS, ...customLevels]
}

export function saveCustomLevel(level: LevelConfig): void {
  const customLevelsJson = localStorage.getItem("custom_levels")
  const customLevels: LevelConfig[] = customLevelsJson ? JSON.parse(customLevelsJson) : []
  const idx = customLevels.findIndex(l => l.id === level.id)
  if (idx >= 0) {
    customLevels[idx] = level
  } else {
    customLevels.push(level)
  }
  localStorage.setItem("custom_levels", JSON.stringify(customLevels))
}
