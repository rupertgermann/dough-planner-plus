import { describe, expect, it } from "vitest";
import { extractJsonLdRecipe } from "../../../server/lib/extract-jsonld-recipe";

describe("extractJsonLdRecipe", () => {

  it.each([
    ["1½", "355"],
    ["1 ½", "355"],
    ["1 1/2", "355"],
    ["½", "118"],
    ["1/2", "118"],
  ])("preserves %s cups through metric normalization", (amount, metric) => {
    const result = extractJsonLdRecipe(`<script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe", name: "Test Loaf", recipeIngredient: [`${amount} cups water`], recipeInstructions: ["Mix water."],
    })}</script>`);
    expect(result?.ingredients[0]).toEqual({ name: "water", amount: metric, unit: `ml (${amount} cups)` });
  });

  it("maps schema.org recipe JSON-LD into an import draft", () => {
    const html = `
      <html>
        <head>
          <!-- <script type="application/ld+json">{"@type":"Recipe","name":"Commented recipe","recipeIngredient":["500 g flour"],"recipeInstructions":["Mix"]}</script> -->
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Pan Pizza",
              "description": "Crispy edge pizza dough",
              "keywords": "flatbread, pizza",
              "recipeIngredient": [
                "500 g bread flour",
                "375 g water",
                "10 g salt"
              ],
              "recipeInstructions": [
                { "@type": "HowToStep", "name": "Mix", "text": "Mix until shaggy.", "timeRequired": "PT10M" },
                { "@type": "HowToStep", "name": "Proof", "text": "Proof until bubbly.", "timeRequired": "PT2H" }
              ]
            }
          </script>
        </head>
      </html>
    `;

    const result = extractJsonLdRecipe(html);

    expect(result).not.toBeNull();
    expect(result?.name).toBe("Pan Pizza");
    expect(result?.notes).toBe("");
    expect(result?.tags).toEqual(["Flatbread"]);
    expect(result?.ingredients).toHaveLength(3);
    expect(result?.steps[1].durationMinutes).toBe(120);
  });

  it("skips unusable blocks and reads wrapped recipe data and nested instruction sections", () => {
    const step = "Let the dough rest overnight before you continue with shaping.";
    const wrapped = [null, { "@graph": [
      { "@type": "WebPage", name: "Not the recipe" },
      {
        "@type": ["Thing", "RECIPE"], name: { "@value": "  Country loaf  " },
        description: { "@value": " Slow fermentation " },
        keywords: [" rye bread, unknown ", { "@value": " levain " }],
        recipeCategory: { "@value": "  Flatbread " }, recipeCuisine: "Whole Grain",
        recipeIngredient: [{ "@value": "  • 500 g of flour " }, "- olive oil to taste", "* 2 eggs", null, " "],
        recipeInstructions: [
          null,
          { "@type": ["Thing", "HOWTOSECTION"], name: "Preparation", itemListElement: [
            "  Mix for 12 minutes.\n\n  Rest for 2 hrs. ",
            { name: "Cold ferment", text: { "@value": ` ${step} ` }, timeRequired: "p1dt2h3m40s" },
          ] },
          { itemListElement: { name: "Bake", timeRequired: "PT?", performTime: "25 MIN" } },
          { text: "  ", duration: "Not a duration" },
          { text: " Wrap tightly. ", timeRequired: "until cool" },
        ],
      },
    ] }];
    const html = `<script type="application/ld+json">{ invalid json </script>
      <script type="application/ld+json">{"@type":"Recipe","name":"Missing ingredients"}</script>
      <SCRIPT id="structured" type='application/ld+json'> ${JSON.stringify(wrapped)} </SCRIPT>`;

    expect(extractJsonLdRecipe(html)).toEqual({
      name: "Country loaf", description: "Slow fermentation", notes: "", warnings: [],
      tags: ["Sourdough", "Flatbread", "Whole Grain", "Rye"],
      ingredients: [
        { name: "flour", amount: "500", unit: "g" },
        { name: "olive oil to taste", amount: "", unit: "" },
        { name: "eggs", amount: "2", unit: "" },
      ],
      steps: [
        { name: "Mix for 12 minutes.", durationMinutes: 12, instructions: "Mix for 12 minutes." },
        { name: "Rest for 2 hrs.", durationMinutes: 120, instructions: "Rest for 2 hrs." },
        { name: "Cold ferment", durationMinutes: 1564, instructions: step },
        { name: "Bake", durationMinutes: 25, instructions: "Bake" },
        { name: "Wrap tightly.", durationMinutes: 0, instructions: "Wrap tightly." },
      ],
    });
  });

  it("defaults the name and accepts a single ingredient or instruction object", () => {
    const result = extractJsonLdRecipe(`<script type="application/ld+json">${JSON.stringify({
      "@type": "recipe", recipeIngredient: "500 g flour",
      recipeInstructions: { "@type": "HowToSection", itemListElement: { text: "Mix all of the ingredients and keep stirring until they are fully combined." } },
    })}</script>`);
    expect(result).toMatchObject({
      name: "Imported Recipe", ingredients: [{ name: "flour", amount: "500", unit: "g" }],
      steps: [{ name: "Mix all of the ingredients and keep stirring until", durationMinutes: 0 }],
    });
  });

  it("returns null when no usable recipe is present", () => {
    expect(extractJsonLdRecipe(`<script type="application/ld+json"> </script>
      <script type="application/ld+json">[null,9,{"@type":"WebPage"}]</script>
      <script>{"@type":"Recipe","recipeIngredient":["500 g flour"],"recipeInstructions":["Mix"]}</script>`)).toBeNull();
  });

  it("keeps mixed fractions and distinguishes full ISO durations from malformed durations", () => {
    const instructions = "Leave the dried culture to ferment in a covered container until active.";
    const result = extractJsonLdRecipe(`<script type="application/ld+json">${JSON.stringify({
      "@type": "Recipe",
      name: "Dried culture",
      recipeIngredient: ["• 12  11/16 cups OF   flour", "10½ cups water", "13/16 cup cream of tartar"],
      recipeInstructions: [
        { name: "Ferment", text: instructions, timeRequired: { "@value": " P10DT12H14M59S " } },
        { text: "Check the culture", timeRequired: "P1DT12M invalid", performTime: "PT14M" },
        { text: "Seal the jar", timeRequired: "P1DT32S" },
      ],
    })}</script>`);
    expect(result?.ingredients).toEqual([
      { name: "flour", amount: "3002", unit: "ml (12 11/16 cups)" },
      { name: "water", amount: "2484", unit: "ml (10½ cups)" },
      { name: "cream of tartar", amount: "192", unit: "ml (13/16 cup)" },
    ]);
    expect(result?.steps).toEqual([
      { name: "Ferment", instructions, durationMinutes: 15135 },
      { name: "Check the culture", instructions: "Check the culture", durationMinutes: 14 },
      { name: "Seal the jar", instructions: "Seal the jar", durationMinutes: 1441 },
    ]);
  });
});
