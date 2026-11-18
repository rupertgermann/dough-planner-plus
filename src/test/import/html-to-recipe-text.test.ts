import { expect, it } from "vitest";
import { htmlToRecipeText } from "../../../server/lib/html-to-recipe-text";

it("keeps the recipe's metadata and readable text but drops non-recipe markup", () => {
  const page = `<TITLE lang="en">Olive &amp; sea salt</TITLE>
    <META name='description' content='A &quot;quick&quot; loaf'>
    <SCRIPT>window.shouldNotBeRead = true;</SCRIPT>
    <STYLE>body { color: red; }</STYLE>
    <NOSCRIPT>Turn on JavaScript</NOSCRIPT>
    <SVG><text>Logo text</text></SVG>
    <article><h2>Ingredients</h2><ul><li>500&nbsp;g flour</li><li>10 g salt</li></ul>
    <h3>Instructions</h3><p>Don&#39;t rush. Baker&apos;s tip: keep dough &lt; 30&deg;C.<BR>
      Bake at &gt;   200&deg;C.</p></article>`;

  expect(htmlToRecipeText(page, "https://recipes.example/olive")).toBe([
    "Title: Olive & sea salt",
    'Description: A "quick" loaf',
    "Source URL: https://recipes.example/olive",
    "Olive & sea salt",
    "Ingredients",
    "500 g flour",
    "10 g salt",
    "Instructions",
    "Don't rush. Baker's tip: keep dough < 30°C.",
    "Bake at > 200°C.",
  ].join("\n"));
});

it("limits the extracted text by both nonempty line count and total characters", () => {
  const lines = Array.from({ length: 251 }, (_, index) => `Recipe line ${index + 1}`);
  const page = lines.map((line) => `<div>${line}</div>`).join("\n\n");
  expect(htmlToRecipeText(page)).toBe(lines.slice(0, 250).join("\n"));
  expect(htmlToRecipeText(`<p>${"x".repeat(16_001)}</p>`)).toBe("x".repeat(16_000));
});
