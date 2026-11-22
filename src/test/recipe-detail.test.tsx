import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getRecipes } from "@/lib/storage";
import RecipeDetail from "@/pages/RecipeDetail";
import RecipeEditor from "@/pages/RecipeEditor";
import type { Recipe } from "@/types/recipe";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const original = {
  id: "rye", name: "Kitchen rye", description: "A seeded loaf", notes: "A **warm** proof.", tags: ["Rye"],
  ingredients: [{ id: "flour", name: "Rye flour", amount: "500", unit: "g" }],
  steps: [{ id: "mix", name: "Mix", durationMinutes: 60, instructions: "Mix the dough" }],
  bakeLog: [{ id: "bake-1", date: "2026-11-03", rating: 4, notes: "Good rise", changes: "" }],
  createdAt: "2026-11-01", updatedAt: "2026-11-02",
} satisfies Recipe;
const oat = { ...original, id: "oat", name: "Oat tin", bakeLog: [] };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("bread-planner-seeded", "true");
  localStorage.setItem("bread-planner-recipes", JSON.stringify([original, oat]));
});

it("shows total duration and scales quantities while preserving baker's percentages", () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{
    ...original,
    ingredients: [
      ...original.ingredients,
      { id: "second", name: "FARINE de blé", amount: "250", unit: "g" },
      { id: "water", name: "Water", amount: "525", unit: "g" },
      { id: "spice", name: "Caraway", amount: "to taste", unit: "" },
      { id: "salt", name: "Salt", amount: "0", unit: "g" },
      { id: "seeds", name: "Seeds", amount: "", unit: "g" },
    ],
    steps: [
      ...original.steps,
      { id: "bulk", name: "Ferment", durationMinutes: 75, instructions: "Cover and rest" },
      { id: "shape", name: "Shape", durationMinutes: 8, instructions: "" },
    ],
  }]));
  openDetail(original.id);

  for (const label of ["A seeded loaf", "Total: 2h 23min", "6 ingredients", "3 steps",
    "(1h)", "(1h 15m)", "(8 min)", "Cover and rest", "(baker's %)"]) {
    expect(screen.getByText(label)).toBeVisible();
  }
  fireEvent.click(screen.getByRole("button", { name: "1.5×" }));
  expect(screen.getByText("Scaled: 1.5×")).toBeInTheDocument();
  for (const [name, amount, percentage] of [
    ["Rye flour", "750 g", "66.7%"],
    ["FARINE de blé", "375 g", "33.3%"],
    ["Water", "787.5 g", "70.0%"],
    ["Caraway", "to taste", null],
    ["Salt", "0 g", null],
    ["Seeds", "g", null],
  ] as const) {
    const row = within(screen.getByText(name, { selector: "li > span" }).closest("li")!);
    expect(row.getByText(amount)).toBeVisible();
    if (percentage) expect(row.getByText(percentage)).toBeVisible();
    else expect(row.queryByText(/%$/)).toBeNull();
  }

  fireEvent.click(screen.getByRole("button", { name: "1×" }));
  expect(screen.getByText("525 g", { selector: "li > span" })).toBeVisible();
  expect(screen.queryByText(/Scaled:/)).toBeNull();
});

it("omits empty recipe sections and redirects a missing recipe to the library", () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{
    ...original, description: "", notes: "", ingredients: [], steps: [],
  }]));
  const detail = openDetail(original.id);
  for (const label of ["Total: 0min", "0 ingredients", "0 steps"]) {
    expect(screen.getByText(label)).toBeVisible();
  }
  expect(screen.queryByText(/Start at|Bread ready!|baker's %/)).toBeNull();
  expect(screen.queryByText("Notes", { exact: true })).toBeNull();
  detail.unmount();
  expect(document.title).toBe("Bread Scheduler");

  openDetail("missing");
  expect(screen.getByRole("heading", { name: "Recipe library" })).toBeVisible();
});

it.each(["Duplicate", "Delete"])("keeps the recipe open when %s cannot write to storage", (action) => {
  openDetail(original.id);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("Storage is read-only");
  });
  try {
    fireEvent.click(screen.getByRole("button", { name: action }));
    if (action === "Delete") {
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    }
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/storage/i));
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: original.name })).toBeVisible();
    expect(getRecipes()).toEqual([original, oat]);
  } finally {
    write.mockRestore();
  }
});

function openDetail(id: string) {
  return render(<TooltipProvider><MemoryRouter initialEntries={[`/view/${id}`]}>
    <Routes>
      <Route path="/" element={<h1>Recipe library</h1>} />
      <Route path="/view/:id" element={<RecipeDetail />} />
      <Route path="/recipe/:id" element={<RecipeEditor />} />
    </Routes>
  </MemoryRouter></TooltipProvider>);
}

it("duplicates a recipe without inheriting its bake history and deletes only the copy", () => {
  const detail = openDetail(original.id);
  expect(screen.getByText("Good rise")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
  expect(screen.getByRole("heading", { name: "Edit Recipe" })).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Recipe Name" })).toHaveValue("Kitchen rye (Copy)");
  const recipes = getRecipes();
  expect(recipes).toHaveLength(3);
  const [rye, second, copy] = recipes;
  expect(rye).toEqual(original);
  expect(second).toEqual(oat);
  expect(copy).toMatchObject({ name: "Kitchen rye (Copy)", description: original.description,
    notes: original.notes, tags: original.tags, bakeLog: [] });
  expect(copy.id).not.toBe(rye.id);
  expect(copy.ingredients).toEqual([{ ...original.ingredients[0], id: expect.any(String) }]);
  expect(copy.ingredients[0].id).not.toBe(original.ingredients[0].id);
  expect(copy.steps).toEqual([{ ...original.steps[0], id: expect.any(String) }]);
  expect(copy.steps[0].id).not.toBe(original.steps[0].id);
  expect(Date.parse(copy.createdAt)).toBeGreaterThan(Date.parse(original.createdAt));
  expect(copy.updatedAt).toBe(copy.createdAt);
  detail.unmount();

  openDetail(copy.id);
  fireEvent.click(screen.getByRole("button", { name: "Delete" }));
  const confirm = within(screen.getByRole("alertdialog", { name: 'Delete "Kitchen rye (Copy)"?' }));
  fireEvent.click(confirm.getByRole("button", { name: "Delete" }));
  expect(screen.getByRole("heading", { name: "Recipe library" })).toBeVisible();
  expect(getRecipes()).toEqual([original, oat]);
});

it("browses adjacent recipes without wrapping and prints from both controls", () => {
  const print = vi.spyOn(window, "print").mockImplementation(() => {});
  const keyboardErrors: unknown[] = [];
  const recordError = (event: ErrorEvent) => {
    keyboardErrors.push(event.error);
    event.preventDefault();
  };
  window.addEventListener("error", recordError);
  try {
    openDetail(original.id);
    expect(document.title).toBe("Kitchen rye");
    expect(screen.getByText("warm", { selector: "strong" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/recipe/rye");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Kitchen rye" })).toBeVisible();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Oat tin" })).toBeVisible();
    expect(document.title).toBe("Oat tin");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { name: "Oat tin" })).toBeVisible();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { name: "Kitchen rye" })).toBeVisible();

    fireEvent.keyDown(window, { key: "p" });
    expect(print).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "P", ctrlKey: true });
    expect(print).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Print" }));
    expect(print).toHaveBeenCalledTimes(2);
    expect(keyboardErrors).toEqual([]);
  } finally {
    window.removeEventListener("error", recordError);
    print.mockRestore();
  }
});
