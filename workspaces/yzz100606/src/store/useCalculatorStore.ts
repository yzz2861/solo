import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Ingredient,
  Formula,
  NutritionStandard,
  CalculationResult,
  ComparisonPlan,
  ReportType,
  ReplacementImpact,
  FormulaItem,
} from '@/types';
import { defaultIngredients } from '@/data/defaultIngredients';
import { nutritionStandards } from '@/data/standards';
import { calculateNutrition, calculateDetails } from '@/engine/nutrition';
import { calculateInventory, calculateAvailableDays, calculateCost } from '@/engine/inventory';
import { calculatePlanScore } from '@/engine/comparison';

interface CalculatorState {
  ingredients: Ingredient[];
  standards: NutritionStandard[];
  currentFormula: Formula;
  selectedStandardIndex: number;
  comparisonPlans: ComparisonPlan[];
  reportType: ReportType;
  showReplaceImpact: boolean;
  replacementImpact: ReplacementImpact | null;
  currentResult: CalculationResult | null;

  updateIngredient: (id: string, updates: Partial<Ingredient>) => void;
  addIngredient: (ingredient: Ingredient) => void;
  removeIngredient: (id: string) => void;

  updateFormula: (updates: Partial<Formula>) => void;
  updateFormulaItem: (ingredientId: string, ratio: number) => void;
  addFormulaItem: (ingredientId: string) => void;
  removeFormulaItem: (ingredientId: string) => void;
  replaceFormulaItem: (oldId: string, newId: string) => void;

  setSelectedStandard: (index: number) => void;
  calculate: () => void;

  addComparisonPlan: () => void;
  removeComparisonPlan: (id: string) => void;
  updateComparisonPlan: (id: string, updates: Partial<ComparisonPlan>) => void;
  calculateComparisonPlan: (id: string) => void;

  setReportType: (type: ReportType) => void;
  setShowReplaceImpact: (show: boolean) => void;
  setReplacementImpact: (impact: ReplacementImpact | null) => void;

  resetToDefaults: () => void;
}

const createDefaultFormula = (): Formula => ({
  id: 'formula-1',
  name: '基础配方',
  items: [
    { ingredientId: 'corn', ratio: 60 },
    { ingredientId: 'soybean-meal', ratio: 25 },
    { ingredientId: 'wheat', ratio: 8 },
    { ingredientId: 'premix', ratio: 4 },
    { ingredientId: 'soybean-oil', ratio: 2 },
    { ingredientId: 'dicalcium-phosphate', ratio: 1 },
  ],
  dailyConsumption: 100,
  targetOutput: 500,
  animalType: 'pig',
});

const createDefaultComparisonPlan = (index: number): ComparisonPlan => ({
  id: `plan-${Date.now()}-${index}`,
  name: `方案${index + 1}`,
  formula: {
    ...createDefaultFormula(),
    id: `formula-plan-${Date.now()}-${index}`,
    name: `方案${index + 1}配方`,
  },
  result: null,
});

export const useCalculatorStore = create<CalculatorState>()(
  persist(
    (set, get) => ({
      ingredients: [...defaultIngredients],
      standards: [...nutritionStandards],
      currentFormula: createDefaultFormula(),
      selectedStandardIndex: 0,
      comparisonPlans: [],
      reportType: 'farmer',
      showReplaceImpact: false,
      replacementImpact: null,
      currentResult: null,

      updateIngredient: (id, updates) =>
        set((state) => ({
          ingredients: state.ingredients.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),

      addIngredient: (ingredient) =>
        set((state) => ({
          ingredients: [...state.ingredients, ingredient],
        })),

      removeIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((i) => i.id !== id),
          currentFormula: {
            ...state.currentFormula,
            items: state.currentFormula.items.filter((i) => i.ingredientId !== id),
          },
        })),

      updateFormula: (updates) =>
        set((state) => ({
          currentFormula: { ...state.currentFormula, ...updates },
        })),

      updateFormulaItem: (ingredientId, ratio) =>
        set((state) => ({
          currentFormula: {
            ...state.currentFormula,
            items: state.currentFormula.items.map((item) =>
              item.ingredientId === ingredientId ? { ...item, ratio } : item
            ),
          },
        })),

      addFormulaItem: (ingredientId) =>
        set((state) => {
          const existing = state.currentFormula.items.find(
            (i) => i.ingredientId === ingredientId
          );
          if (existing) return state;

          const newItems: FormulaItem[] = [
            ...state.currentFormula.items,
            { ingredientId, ratio: 5 },
          ];
          const total = newItems.reduce((sum, i) => sum + i.ratio, 0);

          if (total > 100) {
            const scale = 100 / total;
            return {
              currentFormula: {
                ...state.currentFormula,
                items: newItems.map((i) => ({
                  ...i,
                  ratio: Number((i.ratio * scale).toFixed(1)),
                })),
              },
            };
          }

          return {
            currentFormula: {
              ...state.currentFormula,
              items: newItems,
            },
          };
        }),

      removeFormulaItem: (ingredientId) =>
        set((state) => ({
          currentFormula: {
            ...state.currentFormula,
            items: state.currentFormula.items.filter(
              (i) => i.ingredientId !== ingredientId
            ),
          },
        })),

      replaceFormulaItem: (oldId, newId) =>
        set((state) => {
          const oldItem = state.currentFormula.items.find(
            (i) => i.ingredientId === oldId
          );
          if (!oldItem) return state;

          return {
            currentFormula: {
              ...state.currentFormula,
              items: state.currentFormula.items.map((item) =>
                item.ingredientId === oldId
                  ? { ...item, ingredientId: newId, replacedBy: oldId }
                  : item
              ),
            },
          };
        }),

      setSelectedStandard: (index) =>
        set({ selectedStandardIndex: index }),

      calculate: () => {
        const state = get();
        const standard = state.standards[state.selectedStandardIndex];
        if (!standard) return;

        const nutrition = calculateNutrition(
          state.currentFormula,
          state.ingredients,
          standard
        );
        const inventory = calculateInventory(
          state.currentFormula,
          state.ingredients
        );
        const availableDays = calculateAvailableDays(
          state.currentFormula,
          inventory
        );
        const { totalCost, costPerKg } = calculateCost(
          state.currentFormula,
          state.ingredients
        );
        const calculationDetails = calculateDetails(
          state.currentFormula,
          state.ingredients,
          standard
        );

        const tempResult: CalculationResult = {
          nutrition,
          inventory,
          availableDays,
          totalCost,
          costPerKg,
          score: 0,
          calculationDetails,
        };

        const allResults = [...state.comparisonPlans.map((p) => p.result), tempResult].filter(
          (r): r is CalculationResult => r !== null
        );
        const score = calculatePlanScore(tempResult, allResults);

        set({
          currentResult: {
            ...tempResult,
            score,
          },
        });
      },

      addComparisonPlan: () =>
        set((state) => {
          const newIndex = state.comparisonPlans.length;
          if (newIndex >= 3) return state;
          return {
            comparisonPlans: [
              ...state.comparisonPlans,
              createDefaultComparisonPlan(newIndex),
            ],
          };
        }),

      removeComparisonPlan: (id) =>
        set((state) => ({
          comparisonPlans: state.comparisonPlans.filter((p) => p.id !== id),
        })),

      updateComparisonPlan: (id, updates) =>
        set((state) => ({
          comparisonPlans: state.comparisonPlans.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      calculateComparisonPlan: (id) => {
        const state = get();
        const plan = state.comparisonPlans.find((p) => p.id === id);
        if (!plan) return;

        const standard = state.standards[state.selectedStandardIndex];
        if (!standard) return;

        const nutrition = calculateNutrition(
          plan.formula,
          state.ingredients,
          standard
        );
        const inventory = calculateInventory(
          plan.formula,
          state.ingredients
        );
        const availableDays = calculateAvailableDays(
          plan.formula,
          inventory
        );
        const { totalCost, costPerKg } = calculateCost(
          plan.formula,
          state.ingredients
        );
        const calculationDetails = calculateDetails(
          plan.formula,
          state.ingredients,
          standard
        );

        const tempResult: CalculationResult = {
          nutrition,
          inventory,
          availableDays,
          totalCost,
          costPerKg,
          score: 0,
          calculationDetails,
        };

        const allResults = [
          ...state.comparisonPlans.map((p) => p.id === id ? tempResult : p.result),
          state.currentResult,
        ].filter((r): r is CalculationResult => r !== null);

        const score = calculatePlanScore(tempResult, allResults);

        set((state) => ({
          comparisonPlans: state.comparisonPlans.map((p) =>
            p.id === id
              ? { ...p, result: { ...tempResult, score } }
              : p
          ),
        }));
      },

      setReportType: (type) => set({ reportType: type }),
      setShowReplaceImpact: (show) => set({ showReplaceImpact: show }),
      setReplacementImpact: (impact) => set({ replacementImpact: impact }),

      resetToDefaults: () =>
        set({
          ingredients: [...defaultIngredients],
          currentFormula: createDefaultFormula(),
          selectedStandardIndex: 0,
          comparisonPlans: [],
          currentResult: null,
        }),
    }),
    {
      name: 'feed-calculator-storage',
      partialize: (state) => ({
        ingredients: state.ingredients,
        currentFormula: state.currentFormula,
        selectedStandardIndex: state.selectedStandardIndex,
        comparisonPlans: state.comparisonPlans,
      }),
    }
  )
);
