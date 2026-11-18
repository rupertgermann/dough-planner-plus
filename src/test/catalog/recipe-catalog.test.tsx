import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import App from "@/App";
import { DEMO_RECIPES } from "@/lib/demo-recipes";
import { getRecipes } from "@/lib/storage";
import type { Recipe } from "@/types/recipe";

function expectUsableRecipes(recipes: Omit<Recipe, "bakeLog">[], count: number) {
  expect(recipes).toHaveLength(count);
  expect(new Set(recipes.map(({ id }) => id)).size).toBe(count);

  for (const recipe of recipes) {
    expect(recipe.id.trim()).not.toBe("");
    expect(recipe.name.trim()).not.toBe("");
    expect(recipe.description.trim()).not.toBe("");
    expect(Number.isFinite(Date.parse(recipe.createdAt))).toBe(true);
    expect(Date.parse(recipe.updatedAt)).toBeGreaterThanOrEqual(Date.parse(recipe.createdAt));
    expect(recipe.tags.every((tag) => tag.trim() !== "")).toBe(true);
    expect(recipe.ingredients.length).toBeGreaterThan(0);
    expect(new Set(recipe.ingredients.map(({ id }) => id)).size).toBe(recipe.ingredients.length);
    for (const ingredient of recipe.ingredients) {
      expect(ingredient.id.trim()).not.toBe("");
      expect(ingredient.name.trim()).not.toBe("");
      expect(Number(ingredient.amount)).toBeGreaterThan(0);
      expect(ingredient.unit.trim()).not.toBe("");
    }
    expect(recipe.steps.length).toBeGreaterThan(0);
    expect(new Set(recipe.steps.map(({ id }) => id)).size).toBe(recipe.steps.length);
    for (const step of recipe.steps) {
      expect(step.id.trim()).not.toBe("");
      expect(step.name.trim()).not.toBe("");
      expect(step.durationMinutes).toBeGreaterThan(0);
      expect(step.instructions.trim()).not.toBe("");
    }
  }
}

beforeEach(() => localStorage.clear());

it("ships usable recipes in both the starter library and the optional demo catalog", () => {
  const starterRecipes = getRecipes();
  expectUsableRecipes(starterRecipes, 3);
  expect(starterRecipes.every(({ notes, bakeLog }) => notes.trim() !== "" && bakeLog.length === 0)).toBe(true);
  expectUsableRecipes(DEMO_RECIPES, 15);
  expect(DEMO_RECIPES.every(({ notes }) => notes === "")).toBe(true);
});

it("loads all demos into the library without replacing an existing recipe", () => {
  const [starter] = getRecipes();
  const custom = { ...starter, id: "custom-loaf", name: "My kitchen loaf", notes: "My own bake notes" };
  localStorage.setItem("bread-planner-recipes", JSON.stringify([custom]));
  const originalUrl = window.location.href;
  const originalState = window.history.state;
  window.history.replaceState(null, "", "/");

  try {
    const library = render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Load Demos" }));
    library.unmount();
    render(<App />);

    expect(screen.getByText("16 recipes")).toBeVisible();
    const [existing, ...demos] = getRecipes();
    expect(existing).toEqual(custom);
    expect(demos).toHaveLength(15);
    expect(demos.map(({ id }) => id)).toEqual(DEMO_RECIPES.map(({ id }) => id));
    expect(demos.every(({ bakeLog }) => bakeLog.length === 0)).toBe(true);
  } finally {
    window.history.replaceState(originalState, "", originalUrl);
  }
});
