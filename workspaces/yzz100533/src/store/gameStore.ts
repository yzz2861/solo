import { create } from 'zustand';
import type {
  PlantSlot,
  HabitRecord,
  Badge,
  EnvironmentState,
  WaterAmount,
  TeacherConfig,
  PlantType,
  PlantTemplateConfig,
  ErrorType,
} from '@/types';
import {
  generateEnvironment,
  advanceDay,
  waterPlant,
  drainPlant,
  checkUnderwaterError,
  checkDrainMissError,
  calculateBadges,
  createPlant,
} from '@/utils/gameEngine';
import { DEFAULT_TEMPLATES, PLANT_CONFIGS } from '@/data/plants';

interface GameState {
  playerName: string;
  currentDay: number;
  environment: EnvironmentState;
  plants: PlantSlot[];
  habits: HabitRecord[];
  badges: Badge[];
  lastTip: { errors: { type: ErrorType; explanation: string }[] } | null;
  newBadge: { plantType: PlantType; level: number } | null;
  hasSeenGuide: boolean;
  teacherConfig: TeacherConfig;
  isTeacherMode: boolean;
  parentMode: boolean;

  initGame: (name: string) => void;
  setPlayerName: (name: string) => void;
  advanceDays: (days: number) => void;
  doWater: (plantId: string, amount: WaterAmount) => void;
  doDrain: (plantId: string) => void;
  dismissTip: () => void;
  dismissNewBadge: () => void;
  setHasSeenGuide: (seen: boolean) => void;
  setTeacherMode: (on: boolean) => void;
  setParentMode: (on: boolean) => void;
  updateTeacherConfig: (config: Partial<TeacherConfig>) => void;
  addPlantTemplate: (template: PlantTemplateConfig) => void;
  removePlantTemplate: (index: number) => void;
  resetStudentProgress: () => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, data: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch { /* ignore */ }
}

const STORAGE_KEY = 'garden-watering-game';

const defaultTeacherConfig: TeacherConfig = {
  className: '园艺一班',
  password: '1234',
  plantTemplates: DEFAULT_TEMPLATES.map(type => ({
    plantType: type,
    customName: PLANT_CONFIGS[type].name,
    hasDrainHole: type !== 'seedling',
    initialMoisture: Math.round((PLANT_CONFIGS[type].moistureMin + PLANT_CONFIGS[type].moistureMax) / 2),
  })),
};

const defaultEnv = generateEnvironment(0);

function migratePlants(plants: PlantSlot[]): PlantSlot[] {
  return plants.map(plant => ({
    ...plant,
    consecutiveWaterDays: plant.consecutiveWaterDays ?? 0,
    lastWaterAmount: plant.lastWaterAmount ?? 0,
  }));
}

export const useGameStore = create<GameState>((set, get) => {
  const saved = loadFromStorage<Partial<GameState>>(STORAGE_KEY, {});
  const migratedPlants = saved.plants ? migratePlants(saved.plants) : [];

  return {
    playerName: saved.playerName || '',
    currentDay: saved.currentDay || 0,
    environment: saved.environment || defaultEnv,
    plants: migratedPlants,
    habits: saved.habits || [],
    badges: saved.badges || [],
    lastTip: null,
    newBadge: null,
    hasSeenGuide: saved.hasSeenGuide || false,
    teacherConfig: saved.teacherConfig || defaultTeacherConfig,
    isTeacherMode: false,
    parentMode: false,

    initGame: (name: string) => {
      const templates = get().teacherConfig.plantTemplates;
      const plants = templates.map(t => createPlant(t.plantType, t.customName, t.hasDrainHole, t.initialMoisture));
      set({ playerName: name, currentDay: 0, plants, habits: [], badges: [], environment: generateEnvironment(0) });
    },

    setPlayerName: (name) => set({ playerName: name }),

    advanceDays: (days: number) => {
      const state = get();
      let currentDay = state.currentDay;
      let plants = [...state.plants];
      let habits = [...state.habits];
      let env = state.environment;

      for (let i = 0; i < days; i++) {
        currentDay += 1;
        env = generateEnvironment(currentDay);
        plants = plants.map(plant => advanceDay(plant, env));

        for (const plant of plants) {
          const uwError = checkUnderwaterError(plant, currentDay);
          if (uwError) habits.push(uwError);
          const dmError = checkDrainMissError(plant, currentDay);
          if (dmError) habits.push(dmError);
        }
      }

      const oldBadges = state.badges;
      const badges = calculateBadges(plants, state.badges, currentDay);
      let newBadge: { plantType: PlantType; level: number } | null = null;

      for (const badge of badges) {
        const oldBadge = oldBadges.find(b => b.plantType === badge.plantType);
        if (!oldBadge || oldBadge.level < badge.level) {
          newBadge = { plantType: badge.plantType, level: badge.level };
          break;
        }
      }

      const newState = { currentDay, plants, habits, badges, environment: env, newBadge };
      set(newState);
      saveToStorage(STORAGE_KEY, { ...get(), ...newState, newBadge: null });
    },

    doWater: (plantId: string, amount: WaterAmount) => {
      const state = get();
      const plantIndex = state.plants.findIndex(p => p.id === plantId);
      if (plantIndex < 0) return;

      const plant = state.plants[plantIndex];
      const { plant: newPlant, result } = waterPlant(plant, amount, state.environment, state.currentDay);

      const newHabits = [...state.habits];
      for (const err of result.errors) {
        newHabits.push({
          id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          errorType: err.type,
          plantType: plant.plantType,
          day: state.currentDay,
          explanation: err.explanation,
          timestamp: Date.now(),
        });
      }

      const newPlants = [...state.plants];
      newPlants[plantIndex] = newPlant;

      const oldBadges = state.badges;
      const badges = calculateBadges(newPlants, state.badges, state.currentDay);
      let newBadge: { plantType: PlantType; level: number } | null = null;

      for (const badge of badges) {
        const oldBadge = oldBadges.find(b => b.plantType === badge.plantType);
        if (!oldBadge || oldBadge.level < badge.level) {
          newBadge = { plantType: badge.plantType, level: badge.level };
          break;
        }
      }

      const newState = {
        plants: newPlants,
        habits: newHabits,
        badges,
        lastTip: result.errors.length > 0 ? { errors: result.errors } : null,
        newBadge,
      };
      set(newState);
      saveToStorage(STORAGE_KEY, { ...get(), ...newState, newBadge: null });
    },

    doDrain: (plantId: string) => {
      const state = get();
      const plantIndex = state.plants.findIndex(p => p.id === plantId);
      if (plantIndex < 0) return;

      const newPlants = [...state.plants];
      newPlants[plantIndex] = drainPlant(newPlants[plantIndex]);
      set({ plants: newPlants });
      saveToStorage(STORAGE_KEY, { ...get(), plants: newPlants });
    },

    dismissTip: () => set({ lastTip: null }),
    dismissNewBadge: () => set({ newBadge: null }),
    setHasSeenGuide: (seen: boolean) => {
      set({ hasSeenGuide: seen });
      saveToStorage(STORAGE_KEY, { ...get(), hasSeenGuide: seen });
    },

    setTeacherMode: (on) => set({ isTeacherMode: on }),
    setParentMode: (on) => set({ parentMode: on }),

    updateTeacherConfig: (config) => {
      const newConfig = { ...get().teacherConfig, ...config };
      set({ teacherConfig: newConfig });
      saveToStorage(STORAGE_KEY, { ...get(), teacherConfig: newConfig });
    },

    addPlantTemplate: (template) => {
      const templates = [...get().teacherConfig.plantTemplates, template];
      const newConfig = { ...get().teacherConfig, plantTemplates: templates };
      set({ teacherConfig: newConfig });
      saveToStorage(STORAGE_KEY, { ...get(), teacherConfig: newConfig });
    },

    removePlantTemplate: (index) => {
      const templates = get().teacherConfig.plantTemplates.filter((_, i) => i !== index);
      const newConfig = { ...get().teacherConfig, plantTemplates: templates };
      set({ teacherConfig: newConfig });
      saveToStorage(STORAGE_KEY, { ...get(), teacherConfig: newConfig });
    },

    resetStudentProgress: () => {
      const templates = get().teacherConfig.plantTemplates;
      const plants = templates.map(t => createPlant(t.plantType, t.customName, t.hasDrainHole, t.initialMoisture));
      set({ currentDay: 0, plants, habits: [], badges: [], environment: generateEnvironment(0) });
      saveToStorage(STORAGE_KEY, { ...get(), currentDay: 0, plants, habits: [], badges: [] });
    },
  };
});
