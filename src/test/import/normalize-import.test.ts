import { describe, expect, it } from "vitest";
import {
  ImportedRecipeDraftSchema,
  RecipeImportRequestSchema,
  RecipeImportResponseSchema,
} from "@/lib/import/import-schema";
import {
  buildImportResponse,
  normalizeImportedRecipeDraft,
} from "@/lib/import/normalize-import";

describe("normalizeImportedRecipeDraft", () => {
  it("trims fields, filters unsupported tags, and normalizes warnings", () => {
    const result = normalizeImportedRecipeDraft({
      name: "  Rustic Rye  ",
      description: "  Dark loaf \n\n with caraway  ",
      tags: ["rye bread", "weeknight"],
      ingredients: [
        { name: "  Rye flour ", amount: " 500 ", unit: " g " },
        { name: " ", amount: "", unit: "" },
      ],
      steps: [
        {
          name: "  ",
          durationMinutes: 89.6,
          instructions: "  Mix and rest for 90 min  ",
        },
      ],
      warnings: ["  check hydration ", "check hydration"],
    });

    expect(result.tags).toEqual(["Rye"]);
    expect(result.ingredients).toHaveLength(1);
    expect(result.steps[0].name).toBe("Mix and rest for 90 min");
    expect(result.steps[0].durationMinutes).toBe(90);
    expect(result.warnings).toEqual(["check hydration"]);
  });
});

describe("import schemas", () => {
  it("validates request and response payloads", () => {
    const request = RecipeImportRequestSchema.parse({
      mode: "url",
      url: "https://example.com/recipe",
    });

    const recipe = ImportedRecipeDraftSchema.parse({
      name: "Focaccia",
      description: "",
      tags: ["Flatbread"],
      ingredients: [{ name: "Flour", amount: "500", unit: "g" }],
      steps: [{ name: "Bake", durationMinutes: 25, instructions: "Bake until golden." }],
      warnings: [],
    });

    const response = RecipeImportResponseSchema.parse(
      buildImportResponse(recipe, "jsonld"),
    );

    expect(request.mode).toBe("url");
    expect(response.source).toBe("jsonld");
  });
});
