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
import { parseRecipeWithAI } from "./parse-recipe-with-ai";
import { RecipeImportError, getRecipeImportErrorDetails } from "./recipe-import-error";

export async function importRecipe(request: RecipeImportRequest): Promise<RecipeImportResponse> {
  if (request.mode === "text") {
    return importTextRecipe(request.text);
  }

  return importUrlRecipe(request.url);
}

async function importTextRecipe(text: string): Promise<RecipeImportResponse> {
  try {
    const recipe = await parseRecipeWithAI(text);
    return buildImportResponse(recipe, "ai");
  } catch (error) {
    try {
      const fallback = quickParseRecipeText(text);
      return buildImportResponse(fallback, "quick-parse", [
        "AI import failed, so quick parse was used instead.",
      ]);
    } catch {
      throw error;
    }
  }
}

async function importUrlRecipe(url: string): Promise<RecipeImportResponse> {
  const fetched = await fetchRecipeSource(url);
  const structuredRecipe = extractJsonLdRecipe(fetched.html);

  if (structuredRecipe) {
    return buildImportResponse(structuredRecipe, "jsonld");
  }

  const sourceText = htmlToRecipeText(fetched.html, fetched.url);

  try {
    const recipe = await parseRecipeWithAI(sourceText);
    return buildImportResponse(recipe, "ai", [
      "No usable Recipe JSON-LD was found, so AI extracted the page content.",
    ]);
  } catch (error) {
    try {
      const fallback = quickParseRecipeText(sourceText);
      return buildImportResponse(fallback, "quick-parse", [
        "Structured recipe data was not available.",
        "AI import failed, so quick parse was used instead.",
      ]);
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
