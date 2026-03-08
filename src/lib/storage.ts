import { Recipe } from "@/types/recipe";

const STORAGE_KEY = "bread-planner-recipes";
const SEEDED_KEY = "bread-planner-seeded";

const SAMPLE_RECIPES: Recipe[] = [
  {
    id: "demo-sourdough",
    name: "Classic Sourdough",
    description: "A crusty, tangy sourdough with an open crumb. Perfect weekend bake using a mature levain.",
    tags: ["Sourdough"],
    bakeLog: [],
    ingredients: [
      { id: "i1", name: "Bread flour", amount: "500", unit: "g" },
      { id: "i2", name: "Water", amount: "375", unit: "g" },
      { id: "i3", name: "Sourdough starter", amount: "100", unit: "g" },
      { id: "i4", name: "Salt", amount: "10", unit: "g" },
    ],
    steps: [
      { id: "s1", name: "Autolyse", durationMinutes: 60, instructions: "Mix flour and water. Rest covered." },
      { id: "s2", name: "Add starter & salt", durationMinutes: 5, instructions: "Incorporate starter and salt with pinch-and-fold." },
      { id: "s3", name: "Bulk fermentation", durationMinutes: 240, instructions: "Stretch and fold every 30 min for the first 2 hours, then rest." },
      { id: "s4", name: "Pre-shape", durationMinutes: 20, instructions: "Gently shape into a round and bench rest." },
      { id: "s5", name: "Final shape", durationMinutes: 10, instructions: "Shape into a batard or boule and place in banneton." },
      { id: "s6", name: "Cold retard", durationMinutes: 720, instructions: "Refrigerate overnight (10-14 hours)." },
      { id: "s7", name: "Bake", durationMinutes: 45, instructions: "Bake in Dutch oven at 250°C lid on 20 min, lid off 25 min." },
    ],
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
  },
  {
    id: "demo-focaccia",
    name: "Overnight Focaccia",
    description: "Pillowy, olive-oil-drenched focaccia with a crispy golden bottom. No kneading required.",
    tags: ["Flatbread"],
    bakeLog: [],
    ingredients: [
      { id: "i5", name: "All-purpose flour", amount: "500", unit: "g" },
      { id: "i6", name: "Water", amount: "400", unit: "g" },
      { id: "i7", name: "Olive oil", amount: "60", unit: "ml" },
      { id: "i8", name: "Instant yeast", amount: "3", unit: "g" },
      { id: "i9", name: "Salt", amount: "10", unit: "g" },
      { id: "i10", name: "Flaky sea salt", amount: "5", unit: "g" },
    ],
    steps: [
      { id: "s8", name: "Mix dough", durationMinutes: 10, instructions: "Combine flour, water, yeast, salt. Stir until shaggy." },
      { id: "s9", name: "Overnight rise", durationMinutes: 720, instructions: "Cover and refrigerate 12-18 hours." },
      { id: "s10", name: "Oil the pan", durationMinutes: 5, instructions: "Pour olive oil into a sheet pan, transfer dough." },
      { id: "s11", name: "Second rise", durationMinutes: 120, instructions: "Let dough come to room temp and spread in pan." },
      { id: "s12", name: "Dimple & top", durationMinutes: 5, instructions: "Dimple with fingers, drizzle oil, sprinkle flaky salt." },
      { id: "s13", name: "Bake", durationMinutes: 25, instructions: "Bake at 220°C until golden and crispy." },
    ],
    createdAt: "2026-03-02T10:00:00.000Z",
    updatedAt: "2026-03-02T10:00:00.000Z",
  },
  {
    id: "demo-brioche",
    name: "French Brioche",
    description: "Rich, buttery brioche with a tender crumb. Great for toast, French toast, or burger buns.",
    tags: ["Enriched", "Sweet"],
    bakeLog: [],
    ingredients: [
      { id: "i11", name: "Bread flour", amount: "500", unit: "g" },
      { id: "i12", name: "Eggs", amount: "5", unit: "large" },
      { id: "i13", name: "Butter (cold)", amount: "200", unit: "g" },
      { id: "i14", name: "Sugar", amount: "60", unit: "g" },
      { id: "i15", name: "Salt", amount: "10", unit: "g" },
      { id: "i16", name: "Instant yeast", amount: "7", unit: "g" },
      { id: "i17", name: "Milk", amount: "60", unit: "ml" },
    ],
    steps: [
      { id: "s14", name: "Mix dough", durationMinutes: 15, instructions: "Combine flour, eggs, sugar, yeast, salt, milk. Knead until smooth." },
      { id: "s15", name: "Add butter", durationMinutes: 15, instructions: "Incorporate cold butter cubes gradually until silky and elastic." },
      { id: "s16", name: "Bulk fermentation", durationMinutes: 120, instructions: "Cover and rise at room temperature until doubled." },
      { id: "s17", name: "Chill dough", durationMinutes: 480, instructions: "Punch down, wrap, and refrigerate overnight." },
      { id: "s18", name: "Shape", durationMinutes: 15, instructions: "Divide and shape into rolls or loaf form." },
      { id: "s19", name: "Final proof", durationMinutes: 90, instructions: "Proof until puffy and jiggly." },
      { id: "s20", name: "Egg wash & bake", durationMinutes: 30, instructions: "Brush with egg wash. Bake at 180°C until deep golden." },
    ],
    createdAt: "2026-03-03T10:00:00.000Z",
    updatedAt: "2026-03-03T10:00:00.000Z",
  },
];

function seedIfNeeded(): void {
  if (!localStorage.getItem(SEEDED_KEY)) {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing || JSON.parse(existing).length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_RECIPES));
    }
    localStorage.setItem(SEEDED_KEY, "true");
  }
}

// Migrate old recipes that don't have bakeLog
function migrateRecipes(recipes: Recipe[]): Recipe[] {
  return recipes.map((r) => ({
    ...r,
    bakeLog: r.bakeLog || [],
  }));
}

export function getRecipes(): Recipe[] {
  try {
    seedIfNeeded();
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? migrateRecipes(JSON.parse(data)) : [];
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
    recipes.push({ ...recipe, bakeLog: recipe.bakeLog || [] });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function deleteRecipe(id: string): void {
  const recipes = getRecipes().filter((r) => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

export function duplicateRecipe(id: string): Recipe | null {
  const recipe = getRecipe(id);
  if (!recipe) return null;
  const now = new Date().toISOString();
  const newRecipe: Recipe = {
    ...recipe,
    id: generateId(),
    name: `${recipe.name} (Copy)`,
    bakeLog: [],
    ingredients: recipe.ingredients.map((ing) => ({ ...ing, id: generateId() })),
    steps: recipe.steps.map((s) => ({ ...s, id: generateId() })),
    createdAt: now,
    updatedAt: now,
  };
  saveRecipe(newRecipe);
  return newRecipe;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function exportRecipesJSON(): string {
  return JSON.stringify(getRecipes(), null, 2);
}

export function importRecipesFromJSON(json: string): { added: number; skipped: number } {
  const incoming: Recipe[] = JSON.parse(json);
  if (!Array.isArray(incoming)) throw new Error("Invalid format: expected an array");
  const existing = getRecipes();
  const existingIds = new Set(existing.map((r) => r.id));
  let added = 0;
  let skipped = 0;
  for (const recipe of incoming) {
    if (!recipe.id || !recipe.name || !Array.isArray(recipe.steps)) {
      skipped++;
      continue;
    }
    if (existingIds.has(recipe.id)) {
      skipped++;
      continue;
    }
    existing.push({ ...recipe, bakeLog: recipe.bakeLog || [] });
    existingIds.add(recipe.id);
    added++;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  return { added, skipped };
}
