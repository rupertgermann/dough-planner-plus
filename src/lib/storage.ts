import { Recipe } from "@/types/recipe";

const STORAGE_KEY = "bread-planner-recipes";

export function getRecipes(): Recipe[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getRecipe(id: string): Recipe | undefined {
  return getRecipes().find((r) => r.id === id);
}

export function saveRecipe(recipe: Recipe): void {
  const recipes = getRecipes();
  const index = recipes.findIndex((r) => r.id === recipe.id);
  if (index >= 0) {
    recipes[index] = { ...recipe, updatedAt: new Date().toISOString() };
  } else {
    recipes.push(recipe);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function deleteRecipe(id: string): void {
  const recipes = getRecipes().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function generateId(): string {
  return crypto.randomUUID();
}
