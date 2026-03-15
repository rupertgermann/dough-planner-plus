import { describe, expect, it } from "vitest";
import { quickParseRecipeText } from "@/lib/import/quick-parse";

describe("quickParseRecipeText", () => {
  it("extracts ingredients and steps from structured pasted text", () => {
    const result = quickParseRecipeText(`
      Weekend Sourdough

      Ingredients
      500 g bread flour
      350 g water
      10 g salt

      Instructions
      1. Mix all ingredients - 10 min
      2. Bulk ferment - 2 hours
      3. Bake - 35 min
    `);

    expect(result.name).toBe("Weekend Sourdough");
    expect(result.ingredients).toHaveLength(3);
    expect(result.ingredients[0]).toEqual({
      name: "bread flour",
      amount: "500",
      unit: "g",
    });
    expect(result.steps).toHaveLength(3);
    expect(result.steps[1].durationMinutes).toBe(120);
  });

  it("throws when no usable ingredients or steps can be found", () => {
    expect(() => quickParseRecipeText("Just a loose baking note with no structure.")).toThrow();
  });
});
