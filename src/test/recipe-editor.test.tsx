import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getRecipes } from "@/lib/storage";
import RecipeDetail from "@/pages/RecipeDetail";
import RecipeEditor from "@/pages/RecipeEditor";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bread-planner-seeded", "true");
  vi.clearAllMocks();
});

function openEditor(id = "new") {
  return render(<TooltipProvider><MemoryRouter initialEntries={[`/recipe/${id}`]}>
    <Routes>
      <Route path="/" element={<h1>Recipe library</h1>} />
      <Route path="/recipe/:id" element={<RecipeEditor />} />
      <Route path="/view/:id" element={<RecipeDetail />} />
    </Routes>
  </MemoryRouter></TooltipProvider>);
}

function fillIngredient(index: number, name: string, amount: string, unit: string, percentage: string) {
  for (const [label, value] of [["Ingredient name", name], ["Amt", amount], ["Unit", unit], ["%", percentage]]) {
    fireEvent.change(screen.getAllByPlaceholderText(label)[index], { target: { value } });
  }
}

function fillStep(index: number, name: string, minutes: string, instructions: string) {
  for (const [label, value] of [["Step name (e.g. Bulk ferment)", name], ["Min", minutes], ["Instructions for this step…", instructions]]) {
    fireEvent.change(screen.getAllByPlaceholderText(label)[index], { target: { value } });
  }
}

it("creates a recipe with the intended tags, ingredients, and ordered steps", () => {
  openEditor();
  expect(screen.getByRole("heading", { name: "New Recipe" })).toBeVisible();
  const save = screen.getByRole("button", { name: "Save Recipe" });
  const name = screen.getByRole("textbox", { name: "Recipe Name" });
  fireEvent.change(name, { target: { value: "   " } });
  fireEvent.click(save);
  expect(toast.error).toHaveBeenCalledWith("Please enter a recipe name");
  expect(getRecipes()).toEqual([]);
  fireEvent.change(name, { target: { value: "  Weekend rye  " } });
  fireEvent.change(screen.getByRole("textbox", { name: "Description" }), { target: { value: "  A seeded loaf  " } });
  fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), { target: { value: "  Mix gently.  " } });

  fireEvent.click(screen.getByText("Rye", { exact: true }));
  fireEvent.click(screen.getByText("Sweet", { exact: true }));
  fireEvent.click(screen.getByText("Sweet", { exact: true }));
  const tag = screen.getByPlaceholderText("Add custom tag…");
  for (const value of ["  Test bake  ", "Weekday", "Weekday", "   "]) {
    fireEvent.change(tag, { target: { value } });
    fireEvent.keyDown(tag, { key: "Enter" });
  }
  fireEvent.click(screen.getByText("Test bake ×"));

  const ingredients = within(screen.getByText("Ingredients", { exact: true }).parentElement!);
  fillIngredient(0, "Rye flour", "500", "g", "100");
  fireEvent.click(ingredients.getByRole("button", { name: "Add" }));
  fillIngredient(1, "Salt", "10", "g", "2");
  fireEvent.click(ingredients.getByRole("button", { name: "Add" }));
  fillIngredient(2, "Water", "365", "g", "73");
  fireEvent.click(screen.getByRole("button", { name: "Remove ingredient Salt" }));
  fireEvent.click(ingredients.getByRole("button", { name: "Add" }));

  fillStep(0, "Bake", "40", "Bake until golden.");
  fireEvent.click(screen.getByRole("button", { name: "Insert above" }));
  fillStep(0, "Mix", "12", "Mix gently.");
  fireEvent.click(screen.getByRole("button", { name: "Insert below" }));
  fillStep(2, "Cooling", "50", "Cool on a rack.");
  fireEvent.click(screen.getByRole("button", { name: "Remove step Bake" }));
  const steps = within(screen.getByText("Baking Steps", { exact: true }).parentElement!);
  fireEvent.click(steps.getByRole("button", { name: "Add" }));

  fireEvent.keyDown(window, { key: "s" });
  expect(getRecipes()).toEqual([]);
  fireEvent.keyDown(window, { key: "S", metaKey: true });

  expect(screen.getByRole("heading", { name: "Weekend rye" })).toBeVisible();
  const recipes = getRecipes();
  expect(recipes).toHaveLength(1);
  expect(recipes[0]).toMatchObject({
    name: "Weekend rye", description: "A seeded loaf", notes: "Mix gently.", tags: ["Rye", "Weekday"], bakeLog: [],
    ingredients: [
      { name: "Rye flour", amount: "500", unit: "g", percentage: "100" },
      { name: "Water", amount: "365", unit: "g", percentage: "73" },
    ],
    steps: [
      { name: "Mix", durationMinutes: 12, instructions: "Mix gently." },
      { name: "Cooling", durationMinutes: 50, instructions: "Cool on a rack." },
    ],
  });
});

it("validates the flour weight and recalculates percentages only for positive amounts", () => {
  openEditor();
  const calculate = screen.getByRole("button", { name: "Calc %" });
  fillIngredient(0, "Water", "100", "g", "45");
  fireEvent.click(calculate);
  expect(toast.error).toHaveBeenLastCalledWith("No flour found! Add an ingredient with 'flour' in the name.");
  expect(screen.getByPlaceholderText("%")).toHaveValue("45");

  const ingredients = within(screen.getByText("Ingredients", { exact: true }).parentElement!);
  for (const [index, name, amount] of [
    [1, "Harina integral", "0"], [2, "Farine", ""], [3, "Salt", "0"],
  ] as const) {
    fireEvent.click(ingredients.getByRole("button", { name: "Add" }));
    fillIngredient(index, name, amount, "g", "88");
  }
  fireEvent.click(calculate);
  expect(toast.error).toHaveBeenLastCalledWith("Flour weight must be greater than 0");
  expect(screen.getAllByPlaceholderText("%").map((field) => field.getAttribute("value")))
    .toEqual(["45", "88", "88", "88"]);

  fillIngredient(1, "Harina integral", "200", "g", "88");
  fireEvent.click(calculate);
  expect(toast.success).toHaveBeenCalledWith("Calculated percentages based on 200g total flour");
  expect(screen.getAllByPlaceholderText("%").map((field) => field.getAttribute("value")))
    .toEqual(["50.0", "100.0", "", ""]);
});

it("lets a saved recipe with no ingredients or steps be edited and redirects missing recipes", () => {
  const saved = {
    id: "draft", name: "Unfinished loaf", description: "Waiting on the dough", notes: "", tags: [],
    ingredients: [], steps: [], bakeLog: [], createdAt: "2026-11-01", updatedAt: "2026-11-01",
  };
  localStorage.setItem("bread-planner-recipes", JSON.stringify([saved]));
  const editor = openEditor(saved.id);
  expect(screen.getByRole("textbox", { name: "Recipe Name" })).toHaveValue(saved.name);
  expect(screen.getByPlaceholderText("Ingredient name")).toHaveValue("");
  expect(screen.getByPlaceholderText("Step name (e.g. Bulk ferment)")).toHaveValue("");
  expect(screen.getByPlaceholderText("Min")).toHaveDisplayValue("");
  fillIngredient(0, "Wheat flour", "350", "g", "");
  fillStep(0, "Mix", "", "Combine with water");
  fireEvent.click(screen.getByRole("button", { name: "Save Recipe" }));
  expect(toast.success).toHaveBeenCalledWith("Recipe updated!");
  expect(getRecipes()).toEqual([expect.objectContaining({
    id: saved.id,
    createdAt: saved.createdAt,
    ingredients: [expect.objectContaining({ name: "Wheat flour", amount: "350" })],
    steps: [expect.objectContaining({ name: "Mix", durationMinutes: 0 })],
  })]);
  editor.unmount();

  openEditor("missing");
  expect(screen.getByRole("heading", { name: "Recipe library" })).toBeVisible();
  expect(getRecipes()).toHaveLength(1);
});

it.each([
  [new Error("Storage full"), "Storage full"],
  [new DOMException("Storage full", "QuotaExceededError"), "Could not update recipe storage."],
])("keeps a draft open when storage refuses the write (%s)", (error, message) => {
  openEditor();
  const name = screen.getByRole("textbox", { name: "Recipe Name" });
  fireEvent.change(name, { target: { value: "Unwritten loaf" } });
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw error;
  });
  try {
    fireEvent.click(screen.getByRole("button", { name: "Save Recipe" }));
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(name).toHaveValue("Unwritten loaf");
    expect(getRecipes()).toEqual([]);
  } finally {
    write.mockRestore();
  }
});
