export interface Ingredient {
  id: string;
  name: string;
  amount: string;
  unit: string;
  percentage?: string;
}

export interface BakingStep {
  id: string;
  name: string;
  durationMinutes: number;
  instructions: string;
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: BakingStep[];
  createdAt: string;
  updatedAt: string;
}

export const PRESET_TAGS = [
  "Sourdough",
  "Enriched",
  "Flatbread",
  "Whole Grain",
  "Rye",
  "Quick Bread",
  "Rolls",
  "Sweet",
] as const;
