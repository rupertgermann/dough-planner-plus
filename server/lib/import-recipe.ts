import { ZodError } from "zod";
import {
  RecipeImportRequest,
  RecipeImportRequestSchema,
  RecipeImportResponse,
} from "../../src/lib/import/import-schema";
import { buildImportResponse } from "../../src/lib/import/normalize-import";
import { quickParseRecipeText } from "../../src/lib/import/quick-parse";
import { extractJsonLdRecipe } from "./extract-jsonld-recipe";
import { fetchRecipeSource } from "./fetch-recipe-source";
import { htmlToRecipeText } from "./html-to-recipe-text";
import {
  logRecipeImportError,
  logRecipeImportEvent,
  RecipeImportDebugContext,
} from "./import-debug";
import { parseRecipeWithAI } from "./parse-recipe-with-ai";
import { RecipeImportError, getRecipeImportErrorDetails } from "./recipe-import-error";

export async function importRecipe(request: RecipeImportRequest): Promise<RecipeImportResponse> {
  const context: RecipeImportDebugContext = {
    requestId: crypto.randomUUID().slice(0, 8),
    mode: request.mode,
  };

  logRecipeImportEvent(context, "request.accepted", {
    mode: request.mode,
    textLength: request.mode === "text" ? request.text.length : undefined,
    url: request.mode === "url" ? request.url : undefined,
  });

  if (request.mode === "text") {
    return importTextRecipe(request.text, context);
  }

  return importUrlRecipe(request.url, context);
}

async function importTextRecipe(
  text: string,
  context: RecipeImportDebugContext,
): Promise<RecipeImportResponse> {
  try {
    const recipe = await parseRecipeWithAI(text, context);
    const response = buildImportResponse(recipe, "ai");
    logRecipeImportEvent(context, "request.completed", {
      source: response.source,
      warningCount: response.warnings.length,
    });
    return response;
  } catch (error) {
    if (error instanceof RecipeImportError && !error.allowQuickParseFallback) {
      logRecipeImportError(context, "request.failed.non_recoverable", error);
      throw error;
    }

    try {
      const fallback = quickParseRecipeText(text);
      const response = buildImportResponse(fallback, "quick-parse", [
        "AI import failed, so quick parse was used instead.",
      ]);
      logRecipeImportEvent(context, "request.completed.fallback", {
        source: response.source,
        warningCount: response.warnings.length,
      });
      return response;
    } catch {
      throw error;
    }
  }
}

async function importUrlRecipe(
  url: string,
  context: RecipeImportDebugContext,
): Promise<RecipeImportResponse> {
  const fetched = await fetchRecipeSource(url);
  logRecipeImportEvent(context, "url.fetch.success", {
    finalUrl: fetched.url,
    contentType: fetched.contentType,
    htmlLength: fetched.html.length,
  });
  const structuredRecipe = extractJsonLdRecipe(fetched.html);

  if (structuredRecipe) {
    const response = buildImportResponse(structuredRecipe, "jsonld");
    logRecipeImportEvent(context, "request.completed", {
      source: response.source,
      warningCount: response.warnings.length,
    });
    return response;
  }

  logRecipeImportEvent(context, "jsonld.miss");
  const sourceText = htmlToRecipeText(fetched.html, fetched.url);

  try {
    const recipe = await parseRecipeWithAI(sourceText, context);
    const response = buildImportResponse(recipe, "ai", [
      "No usable Recipe JSON-LD was found, so AI extracted the page content.",
    ]);
    logRecipeImportEvent(context, "request.completed", {
      source: response.source,
      warningCount: response.warnings.length,
    });
    return response;
  } catch (error) {
    if (error instanceof RecipeImportError && !error.allowQuickParseFallback) {
      logRecipeImportError(context, "request.failed.non_recoverable", error);
      throw error;
    }

    try {
      const fallback = quickParseRecipeText(sourceText);
      const response = buildImportResponse(fallback, "quick-parse", [
        "Structured recipe data was not available.",
        "AI import failed, so quick parse was used instead.",
      ]);
      logRecipeImportEvent(context, "request.completed.fallback", {
        source: response.source,
        warningCount: response.warnings.length,
      });
      return response;
    } catch {
      throw error;
    }
  }
}

export async function importRecipeFromUnknown(body: unknown): Promise<RecipeImportResponse> {
  let request: RecipeImportRequest;

  try {
    request = RecipeImportRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new RecipeImportError("Invalid recipe import request.", 400);
    }

    throw error;
  }

  return importRecipe(request);
}

export function serializeRecipeImportError(error: unknown): {
  statusCode: number;
  body: { error: string };
} {
  const details = getRecipeImportErrorDetails(error);

  return {
    statusCode: details.statusCode,
    body: {
      error: details.message,
    },
  };
}
