import { create } from 'zustand';
import type { IngredientInput, CalculationResult, Recipe, RecipeVersion, Feedback } from '../engine';
import { createDefaultIngredients, generateId, calculateIceCream } from '../engine';
import * as storage from '../utils/storage';

interface RecipeState {
  ingredients: IngredientInput;
  currentResult: CalculationResult | null;
  recipes: Recipe[];
  currentRecipe: Recipe | null;
  currentVersion: RecipeVersion | null;
  versions: RecipeVersion[];
  feedbacks: Feedback[];
  mode: 'research' | 'kitchen';
  setMode: (mode: 'research' | 'kitchen') => void;
  setIngredient: <K extends keyof IngredientInput>(
    key: K,
    value: Partial<IngredientInput[K]>
  ) => void;
  calculate: () => void;
  loadRecipes: () => void;
  saveRecipe: (name: string, description: string, notes: string) => void;
  loadRecipe: (recipeId: string) => void;
  loadVersion: (versionId: string) => void;
  loadFeedbacks: (versionId: string) => void;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt'>) => void;
  deleteRecipe: (recipeId: string) => void;
  reset: () => void;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  ingredients: createDefaultIngredients(),
  currentResult: null,
  recipes: [],
  currentRecipe: null,
  currentVersion: null,
  versions: [],
  feedbacks: [],
  mode: 'research',

  setMode: (mode) => set({ mode }),

  setIngredient: (key, value) => {
    set((state) => ({
      ingredients: {
        ...state.ingredients,
        [key]: { ...state.ingredients[key], ...value },
      },
    }));
  },

  calculate: () => {
    const { ingredients } = get();
    const result = calculateIceCream(ingredients);
    set({ currentResult: result });
  },

  loadRecipes: () => {
    const recipes = storage.getRecipes();
    set({ recipes });
  },

  saveRecipe: (name, description, notes) => {
    const { ingredients, currentResult, currentRecipe } = get();
    
    if (!currentResult) return;

    let recipeId: string;
    let versionNumber: number;

    if (currentRecipe) {
      recipeId = currentRecipe.id;
      versionNumber = storage.getNextVersionNumber(recipeId);
      const updatedRecipe = { ...currentRecipe, name, description, updatedAt: new Date().toISOString() };
      storage.saveRecipe(updatedRecipe);
    } else {
      recipeId = generateId();
      versionNumber = 1;
      const newRecipe: Recipe = {
        id: recipeId,
        name,
        description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      storage.saveRecipe(newRecipe);
    }

    const newVersion: RecipeVersion = {
      id: generateId(),
      recipeId,
      versionNumber,
      ingredients: JSON.parse(JSON.stringify(ingredients)),
      calculationResult: currentResult,
      notes,
      createdAt: new Date().toISOString(),
    };
    storage.saveVersion(newVersion);

    get().loadRecipes();
    set({ currentRecipe: storage.getRecipes().find(r => r.id === recipeId) || null });
  },

  loadRecipe: (recipeId) => {
    const recipes = storage.getRecipes();
    const recipe = recipes.find(r => r.id === recipeId) || null;
    const versions = storage.getVersions(recipeId);
    
    set({ 
      currentRecipe: recipe,
      versions,
      currentVersion: versions[0] || null,
    });

    if (versions[0]) {
      set({
        ingredients: JSON.parse(JSON.stringify(versions[0].ingredients)),
        currentResult: versions[0].calculationResult,
      });
      get().loadFeedbacks(versions[0].id);
    }
  },

  loadVersion: (versionId) => {
    const allVersions = storage.getAllVersions();
    const version = allVersions.find(v => v.id === versionId) || null;
    
    if (version) {
      set({
        currentVersion: version,
        ingredients: JSON.parse(JSON.stringify(version.ingredients)),
        currentResult: version.calculationResult,
      });
      get().loadFeedbacks(versionId);
    }
  },

  loadFeedbacks: (versionId) => {
    const feedbacks = storage.getFeedbacks(versionId);
    set({ feedbacks });
  },

  addFeedback: (feedback) => {
    const newFeedback: Feedback = {
      ...feedback,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    storage.saveFeedback(newFeedback);
    get().loadFeedbacks(feedback.recipeVersionId);
  },

  deleteRecipe: (recipeId) => {
    storage.deleteRecipe(recipeId);
    get().loadRecipes();
    set({
      currentRecipe: null,
      currentVersion: null,
      versions: [],
      feedbacks: [],
    });
  },

  reset: () => {
    set({
      ingredients: createDefaultIngredients(),
      currentResult: null,
      currentRecipe: null,
      currentVersion: null,
      versions: [],
      feedbacks: [],
    });
  },
}));
