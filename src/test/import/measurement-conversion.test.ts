import { describe, expect, it } from "vitest";
import {
  convertIngredientMeasurementToMetric,
  convertTextMeasurementsToMetric,
} from "@/lib/import/measurement-conversion";
import { normalizeImportedRecipeDraft } from "@/lib/import/normalize-import";

describe("measurement conversion", () => {

  it.each([
    ["1½", "355"],
    ["1 ½", "355"],
    ["1 1/2", "355"],
    ["½", "118"],
    ["1/2", "118"],
  ])("preserves %s cups through metric normalization", (amount, metric) => {
    expect(convertIngredientMeasurementToMetric(amount, "cups")).toEqual({
      amount: metric,
      unit: `ml (${amount} cups)`,
    });
    expect(convertTextMeasurementsToMetric(`Add ${amount} cups water.`)).toBe(
      `Add ${metric} ml (${amount} cups) water.`,
    );
  });

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

  it.each([
    ["¼", "cup", "59", "ml"],
    ["¾", "cup", "177", "ml"],
    ["⅓", "cup", "79", "ml"],
    ["⅔", "cup", "158", "ml"],
    ["⅛", "cup", "30", "ml"],
    ["2", "teaspoons", "10", "ml"],
    ["1,5", "TSP. ", "7", "ml"],
    ["2", "tsps.", "10", "ml"],
    ["2", "tablespoons", "30", "ml"],
    ["2", "tbsps.", "30", "ml"],
    ["2", "fluid ounces", "59", "ml"],
    ["2", "fl. oz.", "59", "ml"],
    ["1.5", "pints", "710", "ml"],
    ["1", "pt.", "473", "ml"],
    ["1", "quart", "946", "ml"],
    ["1", "qt.", "946", "ml"],
    ["1", "gallon", "3.79", "l"],
    ["3", "gal.", "11.4", "l"],
    ["1", "ounces", "28", "g"],
    ["2", "oz.", "57", "g"],
    ["1", "pounds", "454", "g"],
    ["2", "lbs.", "907", "g"],
  ])("converts %s %s without losing the original measurement", (amount, unit, metricAmount, metricUnit) => {
    expect(convertIngredientMeasurementToMetric(amount, unit)).toEqual({
      amount: metricAmount,
      unit: `${metricUnit} (${amount} ${unit.trimEnd()})`,
    });
  });

  it.each([
    ["", "cups"], ["2", ""], ["2", "pinches"], ["250", "g"], ["to taste", "tsp"],
    ["1-2", "cups"], ["-1", "cup"], ["0", "cup"], ["1/0", "cup"], ["1/", "cup"],
    ["x/2", "cup"], ["Infinity", "cup"], ["  ", "cup"], ["2 (packed)", "cups"], ["473", "ml (2 cups)"],
  ])("leaves %j %j intact when there is no safe conversion", (amount, unit) => {
    expect(convertIngredientMeasurementToMetric(amount, unit)).toEqual({ amount, unit });
  });

  it("preserves alternatives in parentheses and does not reconvert metric annotations", () => {
    const converted = convertTextMeasurementsToMetric("Use a 2-inch cutter at 95.5 f. Add 2 fl oz water (or ¼ cup milk).");
    expect(converted).toBe("Use a 5.1 cm (2-inch) cutter at 35°C (95.5 f). Add 59 ml (2 fl oz) water (or 59 ml (¼ cup) milk).");
    expect(convertTextMeasurementsToMetric(converted)).toBe(converted);
    expect(convertTextMeasurementsToMetric("Try (½ cup), (2 inch), or (350 F).")).toBe("Try (½ cup), (2 inch), or (350 F).");
    expect(convertTextMeasurementsToMetric("500 g (1.1 lb) flour")).toBe("500 g (1.1 lb) flour");
  });

  it.each([
    ["1 teaspoon", "5 ml (1 teaspoon)"],
    ["2 tsps", "10 ml (2 tsps)"],
    ["2 tsp", "10 ml (2 tsp)"],
    ["1 tablespoon", "15 ml (1 tablespoon)"],
    ["2 tbsps", "30 ml (2 tbsps)"],
    ["1 fluid ounce", "30 ml (1 fluid ounce)"],
    ["1 fl.oz", "30 ml (1 fl.oz)"],
    ["2 ounces", "57 g (2 ounces)"],
    ["1 oz", "28 g (1 oz)"],
    ["1 pound", "454 g (1 pound)"],
    ["1 lb", "454 g (1 lb)"],
    ["2 lbs", "907 g (2 lbs)"],
    ["¼ cup", "59 ml (¼ cup)"],
    ["2.5 cups", "591 ml (2.5 cups)"],
  ])("recognizes %s inside an instruction", (imperial, metric) => {
    expect(convertTextMeasurementsToMetric(`Stir in ${imperial} before resting.`)).toBe(`Stir in ${metric} before resting.`);
  });

  it("does not convert unit prefixes in words or dimensions with non-finite values", () => {
    const oversized = "9".repeat(310);
    const text = `Keep batch A1 cup separate. Store in the 2 cupboards. Ignore ${oversized} F and ${oversized} inch.`;
    expect(convertTextMeasurementsToMetric(text)).toBe(text);
    expect(convertIngredientMeasurementToMetric("2", "cupfuls")).toEqual({ amount: "2", unit: "cupfuls" });
    expect(convertIngredientMeasurementToMetric("1", "US gallon jug")).toEqual({ amount: "1", unit: "US gallon jug" });
  });

  it.each([
    ["tablespoon", "15", "ml"], ["tbsps", "15", "ml"],
    ["teaspoon", "5", "ml"], ["tsps", "5", "ml"],
    ["fluid ounce", "30", "ml"], ["fl oz", "30", "ml"],
    ["pint", "473", "ml"], ["pt", "473", "ml"],
    ["quarts", "946", "ml"], ["qt", "946", "ml"],
    ["gallons", "3.79", "l"], ["gal", "3.79", "l"],
    ["ounce", "28", "g"], ["oz", "28", "g"],
    ["pound", "454", "g"], ["lbs", "454", "g"],
  ])("converts %s as a complete unit, preserving qualified units", (unit, amount, metricUnit) => {
    expect(convertIngredientMeasurementToMetric("1", unit)).toEqual({
      amount, unit: `${metricUnit} (1 ${unit})`,
    });
    for (const qualifiedUnit of [`heaped ${unit}`, `${unit} equivalent`]) {
      expect(convertIngredientMeasurementToMetric("1", qualifiedUnit)).toEqual({
        amount: "1", unit: qualifiedUnit,
      });
    }
  });

  it("normalizes precise dimensions and temperatures and keeps the source spelling", () => {
    expect(convertTextMeasurementsToMetric("Bake at 429.75 ° F in a 1.18in mold."))
      .toBe("Bake at 221°C (429.75 ° F) in a 3 cm (1.18in) mold.");
    expect(convertIngredientMeasurementToMetric("26.4172", "gal")).toEqual({
      amount: "100", unit: "l (26.4172 gal)",
    });
  });

  it("keeps fractions with multiple digits and uneven spacing intact in instructions", () => {
    expect(convertTextMeasurementsToMetric("Add 12  11/16  cups water and 13/16 cup milk."))
      .toBe("Add 3002 ml (12  11/16 cups) water and 192 ml (13/16 cup) milk.");
    expect(convertTextMeasurementsToMetric("Add 10.25 cups flour and 1/0 cup milk."))
      .toBe("Add 2425 ml (10.25 cups) flour and 1/0 cup milk.");
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
