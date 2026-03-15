import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecipeImportError } from "../../../server/lib/recipe-import-error";

const parseRecipeWithAI = vi.fn();

vi.mock("../../../server/lib/parse-recipe-with-ai", () => ({
  parseRecipeWithAI,
}));

describe("importRecipe fallback policy", () => {
  beforeEach(() => {
    parseRecipeWithAI.mockReset();
  });

  it("returns quick parse fallback for recoverable AI extraction failures", async () => {
    parseRecipeWithAI.mockRejectedValue(
      new RecipeImportError("AI extraction failed for this recipe source.", 502, {
        allowQuickParseFallback: true,
      }),
    );

    const { importRecipeFromUnknown } = await import("../../../server/lib/import-recipe");
    const result = await importRecipeFromUnknown({
      mode: "text",
      text: "Ingredients\n500 g flour\n300 g water\n\nInstructions\n1. Mix - 10 min",
    });

    expect(result.source).toBe("quick-parse");
    expect(result.warnings).toContain("AI import failed, so quick parse was used instead.");
  });

  it("surfaces non-recoverable AI configuration failures instead of masking them", async () => {
    parseRecipeWithAI.mockRejectedValue(
      new RecipeImportError("OPENAI_API_KEY is not configured for AI import.", 503),
    );

    const { importRecipeFromUnknown } = await import("../../../server/lib/import-recipe");

    await expect(
      importRecipeFromUnknown({
        mode: "text",
        text: "Ingredients\n500 g flour\n300 g water\n\nInstructions\n1. Mix - 10 min",
      }),
    ).rejects.toMatchObject({
      message: "OPENAI_API_KEY is not configured for AI import.",
      statusCode: 503,
    });
  });
});
