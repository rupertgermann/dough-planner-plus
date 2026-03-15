import {
  ImportedRecipeDraft,
  ImportedRecipeDraftSchema,
  RecipeImportResponse,
  RecipeImportResponseSchema,
  RecipeImportSource,
} from "./import-schema";
import { PRESET_TAGS, Recipe } from "../../types/recipe";

function generateImportId(): string {
  return crypto.randomUUID();
}

const PRESET_TAG_LOOKUP = new Map(
  PRESET_TAGS.map((tag) => [tag.toLowerCase(), tag]),
);

const PRESET_TAG_ALIASES: Array<[string, (typeof PRESET_TAGS)[number]]> = [
  ["starter", "Sourdough"],
  ["levain", "Sourdough"],
  ["sweet dough", "Sweet"],
  ["whole wheat", "Whole Grain"],
  ["wholemeal", "Whole Grain"],
  ["rye bread", "Rye"],
];

function normalizeText(value: string | undefined | null): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeMultilineText(value: string | undefined | null): string {
  return (value ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

export function cleanImportSourceText(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeImportWarnings(warnings: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      warnings
        .map((warning) => normalizeText(warning))
        .filter(Boolean),
    ),
  );
}

export function normalizeImportedTags(tags: Array<string | undefined | null>): string[] {
  const normalized = new Set<(typeof PRESET_TAGS)[number]>();

  for (const rawTag of tags) {
    const candidate = normalizeText(rawTag).toLowerCase();
    if (!candidate) continue;

    const directMatch = PRESET_TAG_LOOKUP.get(candidate);
    if (directMatch) {
      normalized.add(directMatch);
      continue;
    }

    for (const [keyword, tag] of PRESET_TAG_ALIASES) {
      if (candidate.includes(keyword)) {
        normalized.add(tag);
      }
    }

    for (const preset of PRESET_TAGS) {
      if (candidate.includes(preset.toLowerCase())) {
        normalized.add(preset);
      }
    }
  }

  return PRESET_TAGS.filter((tag) => normalized.has(tag));
}

export function normalizeImportedRecipeDraft(
  draft: ImportedRecipeDraft,
  options: { fallbackName?: string; extraWarnings?: string[] } = {},
): ImportedRecipeDraft {
  const fallbackName = normalizeText(options.fallbackName) || "Imported Recipe";

  const normalizedDraft: ImportedRecipeDraft = {
    name: normalizeText(draft.name) || fallbackName,
    description: normalizeMultilineText(draft.description),
    tags: normalizeImportedTags(draft.tags),
    ingredients: draft.ingredients
      .map((ingredient) => ({
        name: normalizeText(ingredient.name),
        amount: normalizeText(ingredient.amount),
        unit: normalizeText(ingredient.unit),
      }))
      .filter((ingredient) => ingredient.name),
    steps: draft.steps
      .map((step) => {
        const instructions = normalizeMultilineText(step.instructions);
        const normalizedName = normalizeText(step.name) || instructions.slice(0, 50);

        return {
          name: normalizedName.slice(0, 50),
          durationMinutes: Number.isFinite(step.durationMinutes)
            ? Math.max(0, Math.round(step.durationMinutes))
            : 0,
          instructions,
        };
      })
      .filter((step) => step.instructions),
    warnings: normalizeImportWarnings([
      ...(draft.warnings ?? []),
      ...(options.extraWarnings ?? []),
    ]),
  };

  if (normalizedDraft.steps.some((step) => !step.name)) {
    normalizedDraft.steps = normalizedDraft.steps.map((step) => ({
      ...step,
      name: step.name || step.instructions.slice(0, 50) || "Step",
    }));
  }

  return ImportedRecipeDraftSchema.parse(normalizedDraft);
}

export function buildImportResponse(
  recipe: ImportedRecipeDraft,
  source: RecipeImportSource,
  warnings: string[] = [],
): RecipeImportResponse {
  const mergedWarnings = normalizeImportWarnings([...recipe.warnings, ...warnings]);
  const normalizedRecipe = normalizeImportedRecipeDraft(recipe, {
    extraWarnings: mergedWarnings,
  });

  return RecipeImportResponseSchema.parse({
    recipe: normalizedRecipe,
    source,
    warnings: mergedWarnings,
  });
}

export function createRecipeFromImportDraft(draft: ImportedRecipeDraft): Recipe {
  const normalizedDraft = normalizeImportedRecipeDraft(draft);
  const now = new Date().toISOString();

  return {
    id: generateImportId(),
    name: normalizedDraft.name,
    description: normalizedDraft.description,
    tags: normalizedDraft.tags,
    bakeLog: [],
    ingredients: normalizedDraft.ingredients.map((ingredient) => ({
      id: generateImportId(),
      name: ingredient.name,
      amount: ingredient.amount,
      unit: ingredient.unit,
    })),
    steps: normalizedDraft.steps.map((step) => ({
      id: generateImportId(),
      name: step.name,
      durationMinutes: step.durationMinutes,
      instructions: step.instructions,
    })),
    createdAt: now,
    updatedAt: now,
  };
}
