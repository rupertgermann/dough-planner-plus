import { describe, expect, it } from "vitest";
import {
  ImportedRecipeDraftSchema,
  RecipeImportRequestSchema,
  RecipeImportResponseSchema,
} from "@/lib/import/import-schema";
import {
  buildImportResponse,
  cleanImportSourceText,
  createRecipeFromImportDraft,
  normalizeImportedRecipeDraft,
  normalizeImportedTags,
} from "@/lib/import/normalize-import";

describe("normalizeImportedRecipeDraft", () => {
  it("trims fields, filters unsupported tags, and normalizes warnings", () => {
    const result = normalizeImportedRecipeDraft({
      name: "  Rustic Rye  ",
      description: "  Dark loaf \n\n with caraway  ",
      notes: "  ## Bake notes \n\n Proof until bubbly.  ",
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
    expect(result.name).toBe("Rustic Rye");
    expect(result.description).toBe("Dark loaf\nwith caraway");
    expect(result.notes).toBe("## Bake notes\nProof until bubbly.");
    expect(result.ingredients).toHaveLength(1);
    expect(result.steps[0].name).toBe("Mix and rest for 90 min");
    expect(result.steps[0].durationMinutes).toBe(90);
    expect(result.warnings).toEqual(["check hydration"]);
  });

  it("fills a missing name, removes empty steps, and keeps handwritten measurements if requested", () => {
    const instructions = "Proof in a 9-inch tin before baking. Watch the dough closely.";
    const result = normalizeImportedRecipeDraft({
      name: " ", description: "  Bake at 425°F.\r\n Cool before slicing. ", notes: " Use 2 tsp oil. ", tags: [],
      ingredients: [{ name: "Flour", amount: "2", unit: "cups" }],
      steps: [
        { name: " ", instructions: " ", durationMinutes: 0 },
        { name: " ", instructions, durationMinutes: -5 },
        { name: "  Bake  at  425°F  ", instructions: " Bake at 425°F. ", durationMinutes: Number.POSITIVE_INFINITY },
      ],
      warnings: [" Watch   the dough ", " "],
    }, {
      fallbackName: "  Tin   loaf  ", extraWarnings: ["Watch the dough", "Verify bake time"], convertMeasurements: false,
    });

    expect(result).toEqual({
      name: "Tin loaf", description: "Bake at 425°F.\nCool before slicing.", notes: "Use 2 tsp oil.", tags: [],
      ingredients: [{ name: "Flour", amount: "2", unit: "cups" }],
      steps: [
        { name: "Proof in a 9-inch tin before baking. Watch the dou", instructions, durationMinutes: 0 },
        { name: "Bake at 425°F", instructions: "Bake at 425°F.", durationMinutes: 0 },
      ],
      warnings: ["Watch the dough", "Verify bake time"],
    });

    const saved = createRecipeFromImportDraft(result);
    expect(saved).toMatchObject({
      name: result.name, description: result.description, notes: result.notes, tags: [], bakeLog: [],
      ingredients: result.ingredients, steps: result.steps,
    });
    const ids = [saved.id, ...saved.ingredients.map(({ id }) => id), ...saved.steps.map(({ id }) => id)];
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Number.isFinite(Date.parse(saved.createdAt))).toBe(true);
    expect(saved.updatedAt).toBe(saved.createdAt);
  });

  it.each([
    ["starter loaf", "Sourdough"], ["wild levain", "Sourdough"], ["sweet dough", "Sweet"],
    ["whole wheat", "Whole Grain"], ["wholemeal flour", "Whole Grain"], ["rye bread", "Rye"],
    [" small  rolls ", "Rolls"], ["FLATBREAD", "Flatbread"],
  ])("classifies %s as %s", (label, tag) => {
    expect(normalizeImportedTags([undefined, "", null, label, label, "unrecognized"])).toEqual([tag]);
  });
});

describe("import schemas", () => {
  it("keeps paragraph breaks while removing trailing whitespace from source text", () => {
    expect(cleanImportSourceText("  Rye loaf \t\r\n\r\n\r\nIngredients:\t\r\n500 g flour  "))
      .toBe("Rye loaf\n\nIngredients:\n500 g flour");
  });

  it("validates request and response payloads", () => {
    const request = RecipeImportRequestSchema.parse({
      mode: "url",
      url: "https://example.com/recipe",
    });

    const recipe = ImportedRecipeDraftSchema.parse({
      name: "Focaccia",
      description: "",
      notes: "",
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

  it("merges distinct server warnings and preserves classifications in independently saved drafts", () => {
    const draft = normalizeImportedRecipeDraft({
      name: "Rye pan loaf", description: "Whole grain", notes: "Cool before slicing", tags: ["rye bread", "whole wheat"],
      ingredients: [{ name: "Rye flour", amount: "500", unit: "g" }],
      steps: [{ name: "Mix", durationMinutes: 12, instructions: "Mix until combined" }],
      warnings: ["  Check hydration  "],
    });
    const response = buildImportResponse(draft, "ai", ["Check  hydration", "Check bake time"]);
    expect(response).toEqual({
      source: "ai", recipe: { ...draft, warnings: ["Check hydration", "Check bake time"] },
      warnings: ["Check hydration", "Check bake time"],
    });
    expect(draft.warnings).toEqual(["Check hydration"]);

    const first = createRecipeFromImportDraft(response.recipe);
    const second = createRecipeFromImportDraft(response.recipe);
    expect(first.tags).toEqual(["Whole Grain", "Rye"]);
    expect(second.id).not.toBe(first.id);
    expect(second.ingredients[0].id).not.toBe(first.ingredients[0].id);
    expect(second.steps[0].id).not.toBe(first.steps[0].id);
  });
});
