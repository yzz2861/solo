import { create } from 'zustand';
import type { Ingredient, EnvironmentParams, ResultView, ConversionResult } from '@/types';
import {
  calculateConversion,
  defaultRecipe,
  defaultEnvParams,
  convertUnit,
  getCategoryByName,
  isWaterContained,
} from '@/utils/calculator';

interface RecipeState {
  recipe: Ingredient[];
  envParams: EnvironmentParams;
  activeView: ResultView;
  result: ConversionResult | null;
  isFullscreenWorkstation: boolean;

  setRecipe: (recipe: Ingredient[]) => void;
  updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
  addIngredient: () => void;
  removeIngredient: (id: string) => void;
  setEnvParams: (params: Partial<EnvironmentParams>) => void;
  setActiveView: (view: ResultView) => void;
  recalculate: () => void;
  toggleFullscreen: () => void;
  resetToDefault: () => void;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipe: defaultRecipe,
  envParams: defaultEnvParams,
  activeView: 'kitchen',
  result: calculateConversion(defaultRecipe, defaultEnvParams),
  isFullscreenWorkstation: false,

  setRecipe: (recipe) => {
    set({ recipe });
    get().recalculate();
  },

  updateIngredient: (id, updates) => {
    set((state) => {
      const newRecipe = state.recipe.map((ing) => {
        if (ing.id !== id) return ing;
        const merged = { ...ing, ...updates };

        if (updates.unit && updates.unit !== ing.unit) {
          const flourItem = state.recipe.find((i) => i.category === 'flour');
          const flourWeight = flourItem ? flourItem.value : 0;
          merged.value = convertUnit(ing.value, ing.unit, updates.unit, flourWeight);
        }

        if (updates.name) {
          merged.category = getCategoryByName(updates.name);
          merged.isHydrated = isWaterContained(updates.name);
          if (merged.isHydrated && !merged.hydrationRatio) {
            merged.hydrationRatio = state.envParams.starterHydration;
          }
        }

        return merged;
      });
      return { recipe: newRecipe };
    });
    get().recalculate();
  },

  addIngredient: () => {
    set((state) => ({
      recipe: [
        ...state.recipe,
        {
          id: generateId(),
          name: '新原料',
          value: 0,
          unit: 'g',
          category: 'other',
        },
      ],
    }));
    get().recalculate();
  },

  removeIngredient: (id) => {
    set((state) => ({
      recipe: state.recipe.filter((ing) => ing.id !== id),
    }));
    get().recalculate();
  },

  setEnvParams: (params) => {
    set((state) => ({
      envParams: { ...state.envParams, ...params },
    }));
    get().recalculate();
  },

  setActiveView: (view) => set({ activeView: view }),

  recalculate: () => {
    const { recipe, envParams } = get();
    try {
      const result = calculateConversion(recipe, envParams);
      set({ result });
    } catch {
      set({ result: null });
    }
  },

  toggleFullscreen: () => set((s) => ({ isFullscreenWorkstation: !s.isFullscreenWorkstation })),

  resetToDefault: () => {
    set({
      recipe: defaultRecipe,
      envParams: defaultEnvParams,
      result: calculateConversion(defaultRecipe, defaultEnvParams),
    });
  },
}));
