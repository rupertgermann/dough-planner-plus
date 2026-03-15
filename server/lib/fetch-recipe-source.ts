import { RecipeImportError } from "./recipe-import-error";

export interface FetchedRecipeSource {
  url: string;
  html: string;
  contentType: string;
}

const FETCH_TIMEOUT_MS = 12_000;

export async function fetchRecipeSource(url: string): Promise<FetchedRecipeSource> {
  let response: Response;

  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
        "user-agent": "DoughPlannerPlus/1.0 (+recipe import)",
      },
    });
  } catch {
    throw new RecipeImportError("Could not reach that URL.", 502);
  }

  if (!response.ok) {
    throw new RecipeImportError(`Recipe page request failed with status ${response.status}.`, 502);
  }

  const html = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!html.trim()) {
    throw new RecipeImportError("The recipe page did not return any readable content.", 422);
  }

  return {
    url: response.url || url,
    html,
    contentType,
  };
}
