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
  ingredients: Ingredient[];
  steps: BakingStep[];
  createdAt: string;
  updatedAt: string;
}
