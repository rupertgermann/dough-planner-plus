import { generateObject } from "ai";
import { createOpenAI, type OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { ImportedRecipeDraftSchema } from "../../src/lib/import/import-schema";
import { cleanImportSourceText, normalizeImportedRecipeDraft } from "../../src/lib/import/normalize-import";
import { logRecipeImportError, logRecipeImportEvent, RecipeImportDebugContext } from "./import-debug";
import { RecipeImportError } from "./recipe-import-error";
import { getServerEnv } from "./server-env";

const RECIPE_IMPORT_SYSTEM_PROMPT = [
  "Extract a bread or baking recipe from messy source text.",
  "Return only data that matches the schema.",
  "Prefer exact source values over inference.",
  "Do not invent ingredients, timings, or tags that are not supported.",
  "Put supporting context that does not fit description, ingredients, or steps into notes.",
  "Use markdown in notes for lists or short headings when helpful.",
  "Split ingredient amount, unit, and name when possible.",
  "Use durationMinutes = 0 when the timing is not stated.",
  "Keep step names short and put the detailed wording in instructions.",
].join(" ");

const DEFAULT_MODEL = "gpt-4.1-mini";

function classifyAIImportFailure(error: unknown): RecipeImportError {
  const message = error instanceof Error ? error.message : "AI extraction failed for this recipe source.";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("authentication") ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("incorrect api key")
  ) {
    return new RecipeImportError("OpenAI authentication failed. Check OPENAI_API_KEY.", 502);
  }

  if (
    normalizedMessage.includes("model") &&
    (normalizedMessage.includes("not found") || normalizedMessage.includes("does not exist"))
  ) {
    return new RecipeImportError("The configured OpenAI recipe import model is not available.", 502);
  }

  if (
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("quota")
  ) {
    return new RecipeImportError("OpenAI rate limits prevented recipe import. Try again shortly.", 429);
  }

  return new RecipeImportError("AI extraction failed for this recipe source.", 502, {
    allowQuickParseFallback: true,
  });
}

export async function parseRecipeWithAI(
  sourceText: string,
  context?: RecipeImportDebugContext,
) {
  const apiKey = getServerEnv("OPENAI_API_KEY");
  const modelId = getServerEnv("OPENAI_RECIPE_IMPORT_MODEL") || DEFAULT_MODEL;
  const cleanedSourceText = cleanImportSourceText(sourceText).slice(0, 16_000);

  if (context) {
    logRecipeImportEvent(context, "ai.parse.start", {
      modelId,
      hasApiKey: Boolean(apiKey),
      sourceLength: cleanedSourceText.length,
    });
  }

  if (!apiKey) {
    throw new RecipeImportError("OPENAI_API_KEY is not configured for AI import.", 503);
  }

  try {
    const openai = createOpenAI({ apiKey });
    const { object } = await generateObject({
      model: openai.responses(modelId),
      schema: ImportedRecipeDraftSchema,
      system: RECIPE_IMPORT_SYSTEM_PROMPT,
      prompt: cleanedSourceText,
      providerOptions: {
        openai: {
          strictJsonSchema: true,
          store: false,
        } satisfies OpenAIResponsesProviderOptions,
      },
    });

    const normalized = normalizeImportedRecipeDraft(object);

    if (context) {
      logRecipeImportEvent(context, "ai.parse.success", {
        ingredientCount: normalized.ingredients.length,
        stepCount: normalized.steps.length,
        warningCount: normalized.warnings.length,
      });
    }

    return normalized;
  } catch (error) {
    if (context) {
      logRecipeImportError(context, "ai.parse.failure", error, {
        modelId,
        sourceLength: cleanedSourceText.length,
      });
    }

    throw classifyAIImportFailure(error);
  }
}
