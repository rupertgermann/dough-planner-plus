import { generateObject } from "ai";
import { openai, type OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { ImportedRecipeDraftSchema } from "../../src/lib/import/import-schema";
import { cleanImportSourceText, normalizeImportedRecipeDraft } from "../../src/lib/import/normalize-import";
import { RecipeImportError } from "./recipe-import-error";

const RECIPE_IMPORT_SYSTEM_PROMPT = [
  "Extract a bread or baking recipe from messy source text.",
  "Return only data that matches the schema.",
  "Prefer exact source values over inference.",
  "Do not invent ingredients, timings, or tags that are not supported.",
  "Split ingredient amount, unit, and name when possible.",
  "Use durationMinutes = 0 when the timing is not stated.",
  "Keep step names short and put the detailed wording in instructions.",
].join(" ");

const DEFAULT_MODEL = process.env.OPENAI_RECIPE_IMPORT_MODEL || "gpt-4.1-mini";

export async function parseRecipeWithAI(sourceText: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new RecipeImportError("OPENAI_API_KEY is not configured for AI import.", 503);
  }

  try {
    const { object } = await generateObject({
      model: openai.responses(DEFAULT_MODEL),
      schema: ImportedRecipeDraftSchema,
      system: RECIPE_IMPORT_SYSTEM_PROMPT,
      prompt: cleanImportSourceText(sourceText).slice(0, 16_000),
      providerOptions: {
        openai: {
          strictJsonSchema: true,
          store: false,
        } satisfies OpenAIResponsesProviderOptions,
      },
    });

    return normalizeImportedRecipeDraft(object);
  } catch {
    throw new RecipeImportError("AI extraction failed for this recipe source.", 502);
  }
}
