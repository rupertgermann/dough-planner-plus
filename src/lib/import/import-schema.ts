import { z } from "zod";

const ImportedIngredientSchema = z.object({
  name: z.string().trim().min(1),
  amount: z.string().default(""),
  unit: z.string().default(""),
});

const ImportedStepSchema = z.object({
  name: z.string().trim().min(1).max(50),
  durationMinutes: z.number().int().min(0),
  instructions: z.string().trim().min(1),
});

export const ImportedRecipeDraftSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(""),
  tags: z.array(z.string()).default([]),
  ingredients: z.array(ImportedIngredientSchema).min(1),
  steps: z.array(ImportedStepSchema).min(1),
  warnings: z.array(z.string()).default([]),
});

const HttpUrlSchema = z.string().url().refine((value) => /^https?:\/\//i.test(value), {
  message: "URL must use http or https",
});

export const RecipeImportRequestSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("text"),
    text: z.string().trim().min(1),
  }),
  z.object({
    mode: z.literal("url"),
    url: HttpUrlSchema,
  }),
]);

export const RecipeImportSourceSchema = z.enum(["jsonld", "ai", "quick-parse"]);

export const RecipeImportResponseSchema = z.object({
  recipe: ImportedRecipeDraftSchema,
  source: RecipeImportSourceSchema,
  warnings: z.array(z.string()).default([]),
});

export type ImportedIngredient = z.infer<typeof ImportedIngredientSchema>;
export type ImportedStep = z.infer<typeof ImportedStepSchema>;
export type ImportedRecipeDraft = z.infer<typeof ImportedRecipeDraftSchema>;
export type RecipeImportRequest = z.infer<typeof RecipeImportRequestSchema>;
export type RecipeImportSource = z.infer<typeof RecipeImportSourceSchema>;
export type RecipeImportResponse = z.infer<typeof RecipeImportResponseSchema>;
