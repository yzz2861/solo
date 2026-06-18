import type { Recipe, RecipeVersion, Feedback } from '../engine';

const STORAGE_KEYS = {
  recipes: 'icecream_recipes',
  versions: 'icecream_recipe_versions',
  feedbacks: 'icecream_feedbacks',
} as const;

function getFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function getRecipes(): Recipe[] {
  return getFromStorage<Recipe>(STORAGE_KEYS.recipes);
}

export function saveRecipe(recipe: Recipe): void {
  const recipes = getRecipes();
  const existingIndex = recipes.findIndex(r => r.id === recipe.id);
  if (existingIndex >= 0) {
    recipes[existingIndex] = { ...recipe, updatedAt: new Date().toISOString() };
  } else {
    recipes.push({ ...recipe, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  saveToStorage(STORAGE_KEYS.recipes, recipes);
}

export function deleteRecipe(recipeId: string): void {
  const recipes = getRecipes().filter(r => r.id !== recipeId);
  saveToStorage(STORAGE_KEYS.recipes, recipes);
  
  const versions = getVersions(recipeId);
  versions.forEach(v => deleteFeedback(v.id));
  
  const allVersions = getFromStorage<RecipeVersion>(STORAGE_KEYS.versions);
  const filteredVersions = allVersions.filter(v => v.recipeId !== recipeId);
  saveToStorage(STORAGE_KEYS.versions, filteredVersions);
}

export function getVersions(recipeId: string): RecipeVersion[] {
  const allVersions = getFromStorage<RecipeVersion>(STORAGE_KEYS.versions);
  return allVersions
    .filter(v => v.recipeId === recipeId)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

export function getAllVersions(): RecipeVersion[] {
  return getFromStorage<RecipeVersion>(STORAGE_KEYS.versions);
}

export function saveVersion(version: RecipeVersion): void {
  const allVersions = getFromStorage<RecipeVersion>(STORAGE_KEYS.versions);
  const existingIndex = allVersions.findIndex(v => v.id === version.id);
  if (existingIndex >= 0) {
    allVersions[existingIndex] = version;
  } else {
    allVersions.push({ ...version, createdAt: new Date().toISOString() });
  }
  saveToStorage(STORAGE_KEYS.versions, allVersions);
}

export function getNextVersionNumber(recipeId: string): number {
  const versions = getVersions(recipeId);
  return versions.length > 0 ? versions[0].versionNumber + 1 : 1;
}

export function getFeedbacks(versionId: string): Feedback[] {
  const allFeedbacks = getFromStorage<Feedback>(STORAGE_KEYS.feedbacks);
  return allFeedbacks
    .filter(f => f.recipeVersionId === versionId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function saveFeedback(feedback: Feedback): void {
  const allFeedbacks = getFromStorage<Feedback>(STORAGE_KEYS.feedbacks);
  allFeedbacks.push({ ...feedback, createdAt: new Date().toISOString() });
  saveToStorage(STORAGE_KEYS.feedbacks, allFeedbacks);
}

export function deleteFeedback(versionId: string): void {
  const allFeedbacks = getFromStorage<Feedback>(STORAGE_KEYS.feedbacks);
  const filtered = allFeedbacks.filter(f => f.recipeVersionId !== versionId);
  saveToStorage(STORAGE_KEYS.feedbacks, filtered);
}
