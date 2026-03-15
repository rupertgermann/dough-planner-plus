import { describe, expect, it } from "vitest";
import {
  convertIngredientMeasurementToMetric,
  convertTextMeasurementsToMetric,
} from "@/lib/import/measurement-conversion";
import { normalizeImportedRecipeDraft } from "@/lib/import/normalize-import";

describe("measurement conversion", () => {
  it("converts common imperial ingredient units to metric and keeps the original in brackets", () => {
    expect(convertIngredientMeasurementToMetric("2", "cups")).toEqual({
      amount: "473",
      unit: "ml (2 cups)",
    });

    expect(convertIngredientMeasurementToMetric("1 1/2", "lb")).toEqual({
      amount: "680",
      unit: "g (1 1/2 lb)",
    });
  });

  it("converts temperatures, lengths, and inline measurements in recipe text", () => {
    expect(
      convertTextMeasurementsToMetric(
        "Bake in a 10-inch pan at 450°F and brush with 1 tbsp butter.",
      ),
    ).toBe("Bake in a 25 cm (10-inch) pan at 232°C (450°F) and brush with 15 ml (1 tbsp) butter.");
  });

  it("applies metric conversion during import normalization", () => {
    const result = normalizeImportedRecipeDraft({
      name: "Test Loaf",
      description: "Use a 9-inch tin.",
      notes: "Shape in a 9-inch pan and finish at 425°F.",
      tags: [],
      ingredients: [
        { name: "Flour", amount: "2", unit: "lb" },
        { name: "Water", amount: "1", unit: "cup" },
      ],
      steps: [
        {
          name: "Bake at 425°F",
          durationMinutes: 30,
          instructions: "Bake at 425°F for 30 minutes in a 9-inch pan.",
        },
      ],
      warnings: [],
    });

    expect(result.description).toBe("Use a 23 cm (9-inch) tin.");
    expect(result.notes).toBe("Shape in a 23 cm (9-inch) pan and finish at 218°C (425°F).");
    expect(result.ingredients).toEqual([
      { name: "Flour", amount: "907", unit: "g (2 lb)" },
      { name: "Water", amount: "237", unit: "ml (1 cup)" },
    ]);
    expect(result.steps[0].name).toBe("Bake at 218°C (425°F)");
    expect(result.steps[0].instructions).toBe(
      "Bake at 218°C (425°F) for 30 minutes in a 23 cm (9-inch) pan.",
    );
  });
});
