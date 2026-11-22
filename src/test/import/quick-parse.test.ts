import { describe, expect, it } from "vitest";
import { quickParseRecipeText } from "@/lib/import/quick-parse";

describe("quickParseRecipeText", () => {

  it.each([
    ["1½", "355"],
    ["1 ½", "355"],
    ["1 1/2", "355"],
    ["½", "118"],
    ["1/2", "118"],
  ])("preserves %s cups through metric normalization", (amount, metric) => {
    const result = quickParseRecipeText(`Test Loaf
Ingredients
${amount} cups water
Instructions
Mix water.`);
    expect(result.ingredients[0]).toEqual({ name: "water", amount: metric, unit: `ml (${amount} cups)` });
  });

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

  it.each(["Method", "Directions", "Steps", "Instruction"])(
    "finds ingredients and numbered steps with the %s heading",
    (heading) => {
      const result = quickParseRecipeText([
        "Country loaf", "WHAT YOU NEED", "* 500 g of flour", "• ¼ cup water", "- oil to taste", "2 eggs",
        heading, "1) Knead - 12 mins", "2. Proof - 2 hrs", "3) Bake - 30 minutes", "4) Cool",
      ].join("\r\n"));
      expect(result).toEqual({
        name: "Country loaf", description: "Imported with quick parse", notes: "", tags: [], warnings: [],
        ingredients: [
          { name: "flour", amount: "500", unit: "g" },
          { name: "water", amount: "59", unit: "ml (¼ cup)" },
          { name: "oil to taste", amount: "", unit: "" },
          { name: "eggs", amount: "2", unit: "" },
        ],
        steps: [
          { name: "Knead - 12 mins", instructions: "Knead - 12 mins", durationMinutes: 12 },
          { name: "Proof - 2 hrs", instructions: "Proof - 2 hrs", durationMinutes: 120 },
          { name: "Bake - 30 minutes", instructions: "Bake - 30 minutes", durationMinutes: 30 },
          { name: "Cool", instructions: "Cool", durationMinutes: 0 },
        ],
      });
    },
  );

  it("uses a default name when pasted ingredients and timed steps have no headings", () => {
    const result = quickParseRecipeText([
      "rye", "* 350 g flour", "• 210 g water", "- 8 g salt", "1) Fold for 11 min",
      "2. Proof for 1 hour", "3) Bake for 2 h",
    ].join("\n"));
    expect(result.name).toBe("Imported Recipe");
    expect(result.ingredients.map(({ name }) => name)).toEqual(["flour", "water", "salt"]);
    expect(result.steps.map(({ durationMinutes }) => durationMinutes)).toEqual([11, 60, 120]);
  });

  it("keeps ingredient names and step numbering separate in a longer recipe", () => {
    const longInstruction = "Shape each dough piece gently and place it on a floured board for 45 min.";
    const result = quickParseRecipeText([
      "Multigrain Tin",
      "Ingredient",
      "12  11/16 cups OF   flour",
      "13/16 cup cream of tartar",
      "10½ cups water",
      "Step",
      "10)  Mix for 25mins at speed 2.",
      `11.${longInstruction}`,
    ].join("\n"));
    expect(result.ingredients).toEqual([
      { name: "flour", amount: "3002", unit: "ml (12 11/16 cups)" },
      { name: "cream of tartar", amount: "192", unit: "ml (13/16 cup)" },
      { name: "water", amount: "2484", unit: "ml (10½ cups)" },
    ]);
    expect(result.steps).toEqual([
      { name: "Mix for 25mins at speed 2.", instructions: "Mix for 25mins at speed 2.", durationMinutes: 25 },
      { name: "Shape each dough piece gently and place it on a fl", instructions: longInstruction, durationMinutes: 45 },
    ]);
  });

  it.each(["Ingredients\n500 g flour", "Instructions\nMix for 10 min"])(
    "rejects a draft missing either ingredients or instructions (%s)",
    (source) => expect(() => quickParseRecipeText(source)).toThrow(),
  );
});
