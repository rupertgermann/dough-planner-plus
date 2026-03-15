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

export interface BakeLogEntry {
  id: string;
  date: string;
  rating: number; // 1-5
  notes: string;
  changes: string;
  crumbRating?: number; // 1-5
  crustColor?: string;
  ovenSpring?: number; // 1-5
  photos?: string[]; // base64 data URLs (resized)
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  notes: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: BakingStep[];
  bakeLog: BakeLogEntry[];
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
