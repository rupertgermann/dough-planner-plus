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
});
