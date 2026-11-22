import { expect, it } from "vitest";
import { htmlToRecipeText } from "../../../server/lib/html-to-recipe-text";

it("keeps recipe metadata and text while ignoring nested SVG content", () => {
  const html = `<title>Olive &amp; sea salt</title>
    <meta name="description" content="A quick loaf">
    <svg><svg><text>Nested icon</text></svg><title>Bakery logo</title></svg>
    <p>Mix flour &amp; water.</p>`;
  expect(htmlToRecipeText(html, "https://recipes.example/olive")).toBe([
    "Title: Olive & sea salt",
    "Description: A quick loaf",
    "Source URL: https://recipes.example/olive",
    "Olive & sea salt",
    "Mix flour & water.",
  ].join("\n"));
});

it("preserves recipe text before an unfinished SVG and skips graphic content", () => {
  const html = "<p>Mix flour and water.</p><svg/><p>Let the dough rest.</p><svg><text>Logo text";
  expect(htmlToRecipeText(html)).toBe("Mix flour and water.\nLet the dough rest.");
});
