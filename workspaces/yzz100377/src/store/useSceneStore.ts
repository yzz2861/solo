import { create } from 'zustand';
import type {
  SceneObject,
  Path,
  PathPoint,
  CollisionPoint,
  Scheme,
  ToolMode,
  DisplaySettings,
  ForkliftObject,
  RectificationItem,
  ShelfObject,
  ZoneObject,
} from '@/types/scene';
import { generateId } from '@/utils/id';
import {
  checkPathCollisions,
  checkZoneViolations,
  computePathTurningRadii,
  getPathMinTurnRadius,
  getPedestrianDistance,
} from '@/utils/collision';
import { formatDistance } from '@/utils/units';
import { polylineLength } from '@/utils/geometry';

interface SceneState {
  objects: SceneObject[];
  paths: Path[];
  currentPathId: string | null;
  isDrawingPath: boolean;

  selectedObjectId: string | null;
  toolMode: ToolMode;

  collisions: CollisionPoint[];
  zoneViolations: { zoneId: string; severity: 'danger' | 'warning' }[];

  schemes: Scheme[];
  currentSchemeId: string | null;
  isBriefingMode: boolean;
  briefingRiskIndex: number;

  displaySettings: DisplaySettings;

  addObject: (obj: SceneObject) => void;
  updateObject: (id: string, updates: Partial<SceneObject>) => void;
  removeObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  getSelectedObject: () => SceneObject | undefined;
  getObjectById: (id: string) => SceneObject | undefined;

  startPath: () => void;
  addPathPoint: (x: number, z: number) => void;
  finishPath: () => void;
  cancelPath: () => void;
  clearPaths: () => void;

  setToolMode: (mode: ToolMode) => void;

  computeAllCollisions: () => void;
  getPathStats: () => {
    totalLength: number;
    minTurnRadius: number | null;
    nearestObstacle: number | null;
    pedestrianClearance: number | null;
    dangerCount: number;
    warningCount: number;
  };

  saveScheme: (name: string) => void;
  loadScheme: (id: string) => void;
  deleteScheme: (id: string) => void;
  renameScheme: (id: string, name: string) => void;

  setDisplaySetting: <K extends keyof DisplaySettings>(
    key: K,
    value: DisplaySettings[K],
  ) => void;

  enterBriefingMode: () => void;
  exitBriefingMode: () => void;
  nextBriefingRisk: () => void;
  prevBriefingRisk: () => void;

  generateRectificationReport: () => RectificationItem[];
  exportReportText: () => string;

  loadFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
  initializeScene: () => void;
}

const defaultDisplaySettings: DisplaySettings = {
  showGrid: true,
  showTurnRadius: true,
  showCollisionZones: true,
  showMeasurements: true,
  unit: 'm',
};

function createDefaultObjects(): SceneObject[] {
  const objects: SceneObject[] = [];

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      objects.push({
        id: generateId('shelf'),
        type: 'shelf',
        position: {
          x: -6 + col * 6,
          y: 0,
          z: -8 + row * 12,
        },
        rotation: 0,
        width: 4,
        depth: 1,
        height: 5,
        levels: 5,
        hasPallet: true,
        palletOverhang: 0.15,
        name: `A${row + 1}-${col + 1}排`,
        label: `A${row + 1}-${col + 1}`,
      } as ShelfObject);
    }
  }

  objects.push({
    id: generateId('forklift'),
    type: 'forklift',
    position: { x: 0, y: 0, z: 8 },
    rotation: 180,
    forkLength: 1.2,
    wheelbase: 1.8,
    width: 1.2,
    turningRadius: 2.5,
    name: '1号叉车',
    model: '标准内燃叉车',
  } as ForkliftObject);

  objects.push({
    id: generateId('zone'),
    type: 'zone',
    position: { x: 8, y: 0, z: 0 },
    rotation: 0,
    zoneType: 'pedestrian',
    width: 2,
    depth: 15,
    name: '行人通道',
  } as ZoneObject);

  objects.push({
    id: generateId('zone'),
    type: 'zone',
    position: { x: -8, y: 0, z: -8 },
    rotation: 0,
    zoneType: 'forbidden',
    width: 3,
    depth: 3,
    name: '禁行区-配电房',
  } as ZoneObject);

  return objects;
}

function createDefaultPaths(): Path[] {
  return [
    {
      id: generateId('path'),
      name: '主通道行驶路径',
      forkliftId: null,
      points: [
        { x: 0, z: 8 },
        { x: 0, z: 2 },
        { x: 2.5, z: -2 },
        { x: 2.5, z: -6 },
        { x: -2, z: -10 },
        { x: -2, z: -14 },
      ],
    },
  ];
}

export const useSceneStore = create<SceneState>((set, get) => ({
  objects: createDefaultObjects(),
  paths: createDefaultPaths(),
  currentPathId: null,
  isDrawingPath: false,

  selectedObjectId: null,
  toolMode: 'select',

  collisions: [],
  zoneViolations: [],

  schemes: [],
  currentSchemeId: null,
  isBriefingMode: false,
  briefingRiskIndex: 0,

  displaySettings: defaultDisplaySettings,

  addObject: (obj) => {
    set((state) => ({ objects: [...state.objects, obj] }));
    get().computeAllCollisions();
    get().saveToLocalStorage();
  },

  updateObject: (id, updates) => {
    set((state) => ({
      objects: state.objects.map((o) =>
        o.id === id ? ({ ...o, ...updates } as SceneObject) : o,
      ),
    }));
    get().computeAllCollisions();
    get().saveToLocalStorage();
  },

  removeObject: (id) => {
    set((state) => ({
      objects: state.objects.filter((o) => o.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
    }));
    get().computeAllCollisions();
    get().saveToLocalStorage();
  },

  selectObject: (id) => set({ selectedObjectId: id }),

  getSelectedObject: () => {
    const { objects, selectedObjectId } = get();
    return objects.find((o) => o.id === selectedObjectId);
  },

  getObjectById: (id) => {
    return get().objects.find((o) => o.id === id);
  },

  startPath: () => {
    const id = generateId('path');
    set({
      currentPathId: id,
      isDrawingPath: true,
      paths: [
        ...get().paths,
        {
          id,
          points: [],
          forkliftId: null,
          name: `路径 ${get().paths.length + 1}`,
        },
      ],
    });
  },

  addPathPoint: (x, z) => {
    const { currentPathId, paths } = get();
    if (!currentPathId) return;

    set({
      paths: paths.map((p) =>
        p.id === currentPathId
          ? { ...p, points: [...p.points, { x, z }] }
          : p,
      ),
    });

    get().computeAllCollisions();
  },

  finishPath: () => {
    const { paths, currentPathId } = get();
    if (!currentPathId) return;

    const path = paths.find((p) => p.id === currentPathId);
    if (!path || path.points.length < 2) {
      set((state) => ({
        paths: state.paths.filter((p) => p.id !== currentPathId),
        currentPathId: null,
        isDrawingPath: false,
      }));
      return;
    }

    const pointsWithRadii = computePathTurningRadii(path.points);
    set((state) => ({
      paths: state.paths.map((p) =>
        p.id === currentPathId ? { ...p, points: pointsWithRadii } : p,
      ),
      currentPathId: null,
      isDrawingPath: false,
    }));

    get().computeAllCollisions();
    get().saveToLocalStorage();
  },

  cancelPath: () => {
    set((state) => ({
      paths: state.paths.filter((p) => p.id !== state.currentPathId),
      currentPathId: null,
      isDrawingPath: false,
    }));
  },

  clearPaths: () => {
    set({ paths: [], collisions: [], zoneViolations: [] });
    get().saveToLocalStorage();
  },

  setToolMode: (mode) => {
    set({ toolMode: mode, selectedObjectId: null });
    if (mode !== 'path') {
      get().cancelPath();
    }
  },

  computeAllCollisions: () => {
    const { paths, objects } = get();
    const forklift = objects.find(
      (o) => o.type === 'forklift',
    ) as ForkliftObject | undefined;

    if (!forklift || paths.length === 0) {
      set({ collisions: [], zoneViolations: [] });
      return;
    }

    let allCollisions: CollisionPoint[] = [];
    const violations: { zoneId: string; severity: 'danger' }[] = [];

    for (const path of paths) {
      const pathCollisions = checkPathCollisions(path, objects, forklift);
      allCollisions = [...allCollisions, ...pathCollisions];

      const zones = objects.filter(
        (o) => o.type === 'zone',
      ) as ZoneObject[];
      const zoneViolations = checkZoneViolations(path, zones);
      for (const v of zoneViolations) {
        if (!violations.find((vi) => vi.zoneId === v.zone.id)) {
          violations.push({ zoneId: v.zone.id, severity: v.severity });
        }
      }
    }

    set({ collisions: allCollisions, zoneViolations: violations });
  },

  getPathStats: () => {
    const { paths, objects, collisions } = get();
    const forklift = objects.find((o) => o.type === 'forklift') as ForkliftObject | undefined;

    if (paths.length === 0) {
      return {
        totalLength: 0,
        minTurnRadius: null,
        nearestObstacle: null,
        pedestrianClearance: null,
        dangerCount: 0,
        warningCount: 0,
      };
    }

    const path = paths[0];
    const points2d = path.points.map((p) => ({ x: p.x, z: p.z }));
    const totalLength = polylineLength(points2d);
    const minTurnRadius = getPathMinTurnRadius(path.points);

    let nearestObstacle: number | null = null;
    if (collisions.length > 0) {
      nearestObstacle = Math.min(...collisions.map((c) => c.distance));
    }

    let pedestrianClearance: number | null = null;
    const zones = objects.filter((o) => o.type === 'zone') as ZoneObject[];
    const pedDistances = getPedestrianDistance(path, zones);
    if (pedDistances.length > 0) {
      pedestrianClearance = pedDistances[0].minDistance;
    }

    const dangerCount = collisions.filter((c) => c.severity === 'danger').length;
    const warningCount = collisions.filter((c) => c.severity === 'warning').length;

    return {
      totalLength,
      minTurnRadius,
      nearestObstacle,
      pedestrianClearance,
      dangerCount,
      warningCount,
    };
  },

  saveScheme: (name) => {
    const { objects, paths, currentSchemeId, schemes } = get();
    const id = currentSchemeId || generateId('scheme');

    const newScheme: Scheme = {
      id,
      name,
      createdAt: Date.now(),
      objects: JSON.parse(JSON.stringify(objects)),
      paths: JSON.parse(JSON.stringify(paths)),
    };

    const existingIndex = schemes.findIndex((s) => s.id === id);
    if (existingIndex >= 0) {
      schemes[existingIndex] = newScheme;
    } else {
      schemes.push(newScheme);
    }

    set({ schemes: [...schemes], currentSchemeId: id });
    get().saveToLocalStorage();
  },

  loadScheme: (id) => {
    const scheme = get().schemes.find((s) => s.id === id);
    if (!scheme) return;

    set({
      objects: JSON.parse(JSON.stringify(scheme.objects)),
      paths: JSON.parse(JSON.stringify(scheme.paths)),
      currentSchemeId: id,
      collisions: [],
    });

    get().computeAllCollisions();
  },

  deleteScheme: (id) => {
    set((state) => ({
      schemes: state.schemes.filter((s) => s.id !== id),
      currentSchemeId: state.currentSchemeId === id ? null : state.currentSchemeId,
    }));
    get().saveToLocalStorage();
  },

  renameScheme: (id, name) => {
    set((state) => ({
      schemes: state.schemes.map((s) =>
        s.id === id ? { ...s, name } : s,
      ),
    }));
    get().saveToLocalStorage();
  },

  setDisplaySetting: (key, value) => {
    set((state) => ({
      displaySettings: { ...state.displaySettings, [key]: value },
    }));
    get().saveToLocalStorage();
  },

  enterBriefingMode: () => {
    set({ isBriefingMode: true, briefingRiskIndex: 0 });
  },

  exitBriefingMode: () => {
    set({ isBriefingMode: false });
  },

  nextBriefingRisk: () => {
    const { briefingRiskIndex, collisions } = get();
    const risks = collisions.filter((c) => c.severity !== 'safe');
    if (risks.length === 0) return;
    set({ briefingRiskIndex: (briefingRiskIndex + 1) % risks.length });
  },

  prevBriefingRisk: () => {
    const { briefingRiskIndex, collisions } = get();
    const risks = collisions.filter((c) => c.severity !== 'safe');
    if (risks.length === 0) return;
    set({ briefingRiskIndex: (briefingRiskIndex - 1 + risks.length) % risks.length });
  },

  generateRectificationReport: () => {
    const { collisions, objects, paths } = get();
    const items: RectificationItem[] = [];

    const dangerCollisions = collisions.filter((c) => c.severity === 'danger');
    const warningCollisions = collisions.filter((c) => c.severity === 'warning');

    for (const collision of dangerCollisions) {
      const obj = objects.find((o) => o.id === collision.objectId);
      if (!obj) continue;

      if (obj.type === 'shelf') {
        items.push({
          type: 'move_shelf',
          location: obj.name || '未知货架',
          description: `路径与${obj.name}发生碰撞，需外移至少${Math.abs(collision.distance).toFixed(2)}m`,
          priority: 'high',
          distance: Math.abs(collision.distance),
          objectId: obj.id,
        });
      } else if (obj.type === 'zone' && (obj as ZoneObject).zoneType === 'forbidden') {
        items.push({
          type: 'adjust_path',
          location: obj.name || '禁行区',
          description: `路径穿过禁行区"${obj.name}"，需调整行驶路线`,
          priority: 'high',
          objectId: obj.id,
        });
      }
    }

    for (const collision of warningCollisions) {
      const obj = objects.find((o) => o.id === collision.objectId);
      if (!obj) continue;

      items.push({
        type: 'add_warning_line',
        location: obj.name || '未知位置',
        description: `${obj.name}附近净距仅${collision.distance.toFixed(2)}m，建议增设警示线`,
        priority: 'medium',
        distance: collision.distance,
        objectId: obj.id,
      });
    }

    const { minTurnRadius } = get().getPathStats();
    const forklift = objects.find((o) => o.type === 'forklift') as ForkliftObject | undefined;
    if (minTurnRadius && forklift && minTurnRadius < forklift.turningRadius) {
      items.push({
        type: 'widen_aisle',
        location: '窄道转弯处',
        description: `路径转弯半径${minTurnRadius.toFixed(2)}m小于叉车最小转弯半径${forklift.turningRadius.toFixed(2)}m，需加宽通道`,
        priority: 'high',
      });
    }

    const zones = objects.filter((o) => o.type === 'zone') as ZoneObject[];
    for (const path of paths) {
      const pedDistances = getPedestrianDistance(path, zones);
      for (const pd of pedDistances) {
        if (pd.minDistance < 1.0) {
          items.push({
            type: 'add_warning_line',
            location: pd.zone.name || '行人通道',
            description: `路径距${pd.zone.name}仅${pd.minDistance.toFixed(2)}m，需加装物理隔离或警示线`,
            priority: pd.minDistance < 0.5 ? 'high' : 'medium',
          });
        }
      }
    }

    items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return items;
  },

  exportReportText: () => {
    const items = get().generateRectificationReport();
    const stats = get().getPathStats();
    const { objects } = get();
    const forklift = objects.find((o) => o.type === 'forklift');

    const lines: string[] = [];
    lines.push('========================================');
    lines.push('  叉车窄道演练 - 整改清单报告');
    lines.push('========================================');
    lines.push('');
    lines.push(`生成时间: ${new Date().toLocaleString('zh-CN')}`);
    lines.push('');
    lines.push('--- 基本信息 ---');
    lines.push(`叉车: ${forklift?.name || '未设置'}`);
    lines.push(`路径总长度: ${formatDistance(stats.totalLength)}`);
    if (stats.minTurnRadius !== null) {
      lines.push(`最小转弯半径: ${formatDistance(stats.minTurnRadius)}`);
    }
    lines.push(`危险点数量: ${stats.dangerCount}`);
    lines.push(`警告点数量: ${stats.warningCount}`);
    lines.push('');
    lines.push('--- 整改项清单 ---');
    lines.push('');

    const priorityLabels = { high: '【高】', medium: '【中】', low: '【低】' };
    const typeLabels: Record<string, string> = {
      move_shelf: '移货架',
      add_warning_line: '加警示线',
      adjust_path: '调路径',
      remove_obstacle: '清障碍',
      widen_aisle: '扩通道',
    };

    items.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${priorityLabels[item.priority]} ${typeLabels[item.type]}`);
      lines.push(`   位置: ${item.location}`);
      lines.push(`   说明: ${item.description}`);
      lines.push('');
    });

    if (items.length === 0) {
      lines.push('无整改项，当前方案安全。');
      lines.push('');
    }

    lines.push('========================================');
    lines.push('  仓储经理审批: __________  日期: __________');
    lines.push('========================================');

    return lines.join('\n');
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem('forklift-scene-schemes');
      if (saved) {
        const data = JSON.parse(saved);
        set({ schemes: data.schemes || [] });
      }

      const settings = localStorage.getItem('forklift-scene-settings');
      if (settings) {
        set({ displaySettings: JSON.parse(settings) });
      }
    } catch (e) {
      console.warn('Failed to load from localStorage', e);
    }
  },

  saveToLocalStorage: () => {
    try {
      const { schemes, displaySettings } = get();
      localStorage.setItem(
        'forklift-scene-schemes',
        JSON.stringify({ schemes }),
      );
      localStorage.setItem(
        'forklift-scene-settings',
        JSON.stringify(displaySettings),
      );
    } catch (e) {
      console.warn('Failed to save to localStorage', e);
    }
  },

  initializeScene: () => {
    const { paths } = get();
    
    const pathsWithRadii = paths.map((path) => ({
      ...path,
      points: computePathTurningRadii(path.points),
    }));

    set({ paths: pathsWithRadii });
    
    setTimeout(() => {
      get().computeAllCollisions();
    }, 0);
  },
}));
