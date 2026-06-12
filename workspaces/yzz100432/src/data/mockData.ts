import type { Tree, StreetLamp, Sign, Bench, PowerLine, RoadSegment, User, Task, PruningScheme } from "../types";

export const mockTrees: Tree[] = [
  {
    id: "tree-001",
    code: "T-A-001",
    species: "樟树",
    height: 8.5,
    crownRadius: 3.2,
    positionX: 10,
    positionY: 0,
    positionZ: 5,
    heightEstimated: false,
    healthStatus: "good",
    crownShape: "round",
  },
  {
    id: "tree-002",
    code: "T-A-002",
    species: "悬铃木",
    height: 10.2,
    crownRadius: 4.0,
    positionX: 18,
    positionY: 0,
    positionZ: 5,
    heightEstimated: false,
    healthStatus: "good",
    crownShape: "oval",
  },
  {
    id: "tree-003",
    code: "T-A-003",
    species: "广玉兰",
    height: 7.8,
    crownRadius: 2.8,
    positionX: 26,
    positionY: 0,
    positionZ: 5,
    heightEstimated: true,
    healthStatus: "fair",
    crownShape: "conical",
  },
  {
    id: "tree-004",
    code: "T-B-001",
    species: "银杏",
    height: 9.5,
    crownRadius: 3.5,
    positionX: 10,
    positionY: 0,
    positionZ: -5,
    heightEstimated: false,
    healthStatus: "good",
    crownShape: "irregular",
  },
  {
    id: "tree-005",
    code: "T-B-002",
    species: "水杉",
    height: 12.0,
    crownRadius: 2.5,
    positionX: 18,
    positionY: 0,
    positionZ: -5,
    heightEstimated: false,
    healthStatus: "good",
    crownShape: "conical",
  },
  {
    id: "tree-006",
    code: "T-B-003",
    species: "桂花",
    height: 5.5,
    crownRadius: 2.2,
    positionX: 26,
    positionY: 0,
    positionZ: -5,
    heightEstimated: false,
    healthStatus: "good",
    crownShape: "round",
  },
  {
    id: "tree-007",
    code: "T-C-001",
    species: "香樟",
    height: 8.0,
    crownRadius: 3.0,
    positionX: -8,
    positionY: 0,
    positionZ: 8,
    heightEstimated: true,
    healthStatus: "fair",
    crownShape: "round",
  },
  {
    id: "tree-008",
    code: "T-C-002",
    species: "朴树",
    height: 9.0,
    crownRadius: 3.8,
    positionX: -2,
    positionY: 0,
    positionZ: 8,
    heightEstimated: false,
    healthStatus: "good",
    crownShape: "oval",
  },
];

export const mockStreetLamps: StreetLamp[] = [
  { id: "lamp-001", position: [5, 0, 8], intensity: 1.5, radius: 12, height: 4 },
  { id: "lamp-002", position: [13, 0, 8], intensity: 1.5, radius: 12, height: 4 },
  { id: "lamp-003", position: [21, 0, 8], intensity: 1.5, radius: 12, height: 4 },
  { id: "lamp-004", position: [29, 0, 8], intensity: 1.5, radius: 12, height: 4 },
  { id: "lamp-005", position: [5, 0, -8], intensity: 1.5, radius: 12, height: 4 },
  { id: "lamp-006", position: [13, 0, -8], intensity: 1.5, radius: 12, height: 4 },
  { id: "lamp-007", position: [21, 0, -8], intensity: 1.5, radius: 12, height: 4 },
  { id: "lamp-008", position: [-5, 0, 3], intensity: 1.5, radius: 12, height: 4 },
];

export const mockSigns: Sign[] = [
  {
    id: "sign-001",
    position: [8, 0, 6.5],
    type: "direction",
    content: "停车场 →",
    height: 2.5,
    width: 1.2,
  },
  {
    id: "sign-002",
    position: [20, 0, 6.5],
    type: "warning",
    content: "注意儿童",
    height: 2.0,
    width: 0.8,
  },
  {
    id: "sign-003",
    position: [-5, 0, 6],
    type: "information",
    content: "健身区",
    height: 2.2,
    width: 1.0,
  },
];

export const mockBenches: Bench[] = [
  { id: "bench-001", position: [15, 0, 10], rotation: 0, length: 1.8 },
  { id: "bench-002", position: [23, 0, 10], rotation: 0, length: 1.8 },
  { id: "bench-003", position: [8, 0, -10], rotation: Math.PI, length: 1.8 },
  { id: "bench-004", position: [-3, 0, 12], rotation: Math.PI / 4, length: 1.5 },
];

export const mockPowerLines: PowerLine[] = [
  {
    id: "line-001",
    start: [-10, 6, 15],
    end: [35, 6, 15],
    height: 6,
    voltage: "medium",
  },
  {
    id: "line-002",
    start: [30, 5.5, -15],
    end: [30, 5.5, 20],
    height: 5.5,
    voltage: "low",
  },
];

export const mockRoadSegments: RoadSegment[] = [
  { id: "road-001", start: [-10, 0, 0], end: [35, 0, 0], width: 6 },
  { id: "road-002", start: [0, 0, -12], end: [0, 0, 18], width: 4 },
  { id: "road-003", start: [30, 0, -12], end: [30, 0, 18], width: 4 },
];

export const mockUsers: User[] = [
  { id: "user-001", name: "张物业", email: "zhangwy@park.com", role: "admin", avatar: "🏢" },
  { id: "user-002", name: "李园林", email: "liyl@park.com", role: "gardener", avatar: "🌳" },
  { id: "user-003", name: "王主管", email: "wangzg@park.com", role: "supervisor", avatar: "👔" },
];

export const mockTasks: Task[] = [
  {
    id: "task-001",
    schemeId: "scheme-001",
    treeId: "tree-001",
    treeCode: "T-A-001",
    sideToPrune: "南侧下部，保持2.5米净空",
    photoRequirements: "修剪前后各拍1张，需包含路牌参照物",
    pruningBox: {
      position: [10, 1.25, 5],
      size: [6.4, 2.5, 6.4],
      rotation: [0, 0, 0],
      visible: true,
    },
    status: "pending",
    createdAt: new Date("2026-06-10"),
    assignee: "user-002",
    recheckDate: new Date("2026-06-17"),
    isRainReview: false,
    photos: [],
  },
  {
    id: "task-002",
    schemeId: "scheme-002",
    treeId: "tree-002",
    treeCode: "T-A-002",
    sideToPrune: "东侧树冠，避开路灯照射范围",
    photoRequirements: "全景照1张，局部特写2张",
    pruningBox: {
      position: [18, 2, 5],
      size: [8, 4, 8],
      rotation: [0, 0, 0],
      visible: true,
    },
    status: "in_progress",
    createdAt: new Date("2026-06-09"),
    assignee: "user-002",
    recheckDate: new Date("2026-06-16"),
    isRainReview: false,
    photos: [],
  },
  {
    id: "task-003",
    schemeId: "scheme-003",
    treeId: "tree-004",
    treeCode: "T-B-001",
    sideToPrune: "顶部修剪1米，保持树形美观",
    photoRequirements: "修剪后多角度拍摄3张",
    pruningBox: {
      position: [10, 4, -5],
      size: [7, 2, 7],
      rotation: [0, 0, 0],
      visible: true,
    },
    status: "completed",
    createdAt: new Date("2026-06-05"),
    assignee: "user-002",
    recheckDate: new Date("2026-06-12"),
    actualRecheckDate: new Date("2026-06-12"),
    isRainReview: false,
    photos: [],
  },
];

export const mockSchemes: PruningScheme[] = [
  {
    id: "scheme-001",
    name: "樟树T-A-001修剪方案",
    treeId: "tree-001",
    pruningBox: {
      position: [10, 1.25, 5],
      size: [6.4, 2.5, 6.4],
      rotation: [0, 0, 0],
      visible: true,
    },
    clearanceHeight: 2.5,
    lightingCoverage: 0.92,
    landscapeScore: 8.5,
    prunedVolume: 6.4 * 2.5 * 6.4,
    createdAt: new Date("2026-06-10"),
    createdBy: "张物业",
    taskIds: ["task-001"],
  },
  {
    id: "scheme-002",
    name: "悬铃木T-A-002修剪方案",
    treeId: "tree-002",
    pruningBox: {
      position: [18, 2, 5],
      size: [8, 4, 8],
      rotation: [0, 0, 0],
      visible: true,
    },
    clearanceHeight: 2.0,
    lightingCoverage: 0.88,
    landscapeScore: 7.8,
    prunedVolume: 8 * 4 * 8,
    createdAt: new Date("2026-06-09"),
    createdBy: "张物业",
    taskIds: ["task-002"],
  },
  {
    id: "scheme-003",
    name: "银杏T-B-001修剪方案",
    treeId: "tree-004",
    pruningBox: {
      position: [10, 4, -5],
      size: [7, 2, 7],
      rotation: [0, 0, 0],
      visible: true,
    },
    clearanceHeight: 3.0,
    lightingCoverage: 0.95,
    landscapeScore: 9.2,
    prunedVolume: 7 * 2 * 7,
    createdAt: new Date("2026-06-05"),
    createdBy: "张物业",
    taskIds: ["task-003"],
  },
];

export function getDefaultPruningBox(tree: Tree): {
  position: [number, number, number];
  size: [number, number, number];
  rotation: [number, number, number];
  visible: boolean;
} {
  return {
    position: [tree.positionX, tree.height * 0.3, tree.positionZ],
    size: [tree.crownRadius * 1.5, tree.height * 0.6, tree.crownRadius * 1.5],
    rotation: [0, 0, 0],
    visible: true,
  };
}
