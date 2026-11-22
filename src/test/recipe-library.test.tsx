import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { DEMO_RECIPES } from "@/lib/demo-recipes";
import Index from "@/pages/Index";
import { getRecipes } from "@/lib/storage";
import type { Recipe } from "@/types/recipe";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const recipe = {
  id: "amber", name: "Amber Rye", description: "A slow loaf", notes: "", tags: ["Rye"],
  ingredients: [{ id: "flour", name: "Rye flour", amount: "500", unit: "g" }],
  steps: [{ id: "mix", name: "Mix", durationMinutes: 15, instructions: "Mix" },
    { id: "rest", name: "Rest", durationMinutes: 75, instructions: "Let the dough rise" }],
  bakeLog: [], createdAt: "2026-11-01", updatedAt: "2026-11-14",
} satisfies Recipe;
const oat = {
  ...recipe, id: "oat", name: "Oat Tin", tags: ["Whole Grain"], createdAt: "2026-11-10", updatedAt: "2026-11-12",
  steps: [{ ...recipe.steps[0], durationMinutes: 60 }],
};
const zebra = {
  ...recipe, id: "zebra", name: "Zebra Rye", tags: ["Whole Grain"], createdAt: "2026-11-02", updatedAt: "2026-11-15",
  steps: [{ ...recipe.steps[0], durationMinutes: 25 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("bread-planner-seeded", "true");
});

function openLibrary(recipes: Recipe[]) {
  localStorage.setItem("bread-planner-recipes", JSON.stringify(recipes));
  return render(<MemoryRouter><Routes>
    <Route path="/" element={<Index />} />
    <Route path="/recipe/oat" element={<h1>Edit Oat Tin</h1>} />
    <Route path="/timetable/oat" element={<h1>Oat Tin timetable</h1>} />
    <Route path="/view/oat" element={<h1>Oat Tin recipe</h1>} />
  </Routes></MemoryRouter>);
}

function visibleRecipeIds() {
  return screen.getAllByRole("link").map((link) => link.getAttribute("href"))
    .filter((target) => target?.startsWith("/view/")).map((target) => target?.replace("/view/", ""));
}

it("resets pagination when searching and combines text and tag filters", () => {
  const rolls = Array.from({ length: 14 }, (_, i) => ({ ...recipe, id: `roll-${i}`, name: `Roll ${i}`, tags: [] }));
  openLibrary([zebra, ...rolls, recipe]);
  const next = screen.getByRole("button", { name: "Next →" });
  const prev = screen.getByRole("button", { name: "← Prev" });
  expect(prev).toBeDisabled();
  expect(visibleRecipeIds()).toHaveLength(15);
  expect(screen.getByText("16 recipes")).toBeVisible();
  fireEvent.click(next);
  expect(visibleRecipeIds()).toEqual(["zebra"]);
  expect(next).toBeDisabled();
  fireEvent.click(prev);
  expect(visibleRecipeIds()[0]).toBe("amber");
  fireEvent.click(screen.getByRole("button", { name: "2" }));
  expect(visibleRecipeIds()).toEqual(["zebra"]);

  const search = screen.getByPlaceholderText("Search recipes…");
  fireEvent.change(search, { target: { value: "RYE" } });
  expect(visibleRecipeIds()).toEqual(["amber", "zebra"]);
  const tags = within(screen.getByText("All", { exact: true }).parentElement!);
  fireEvent.click(tags.getByText("Whole Grain"));
  expect(visibleRecipeIds()).toEqual(["zebra"]);
  fireEvent.click(tags.getByText("Whole Grain"));
  expect(visibleRecipeIds()).toEqual(["amber", "zebra"]);
  fireEvent.click(tags.getByText("Rye"));
  expect(visibleRecipeIds()).toEqual(["amber"]);
  fireEvent.click(tags.getByText("All"));
  expect(visibleRecipeIds()).toEqual(["amber", "zebra"]);
  fireEvent.change(search, { target: { value: "pumpernickel" } });
  expect(screen.getByText("No matches")).toBeVisible();
  expect(screen.getByText("Try a different search or filter.")).toBeVisible();
});

it("offers the first-recipe actions and loads demos without a page reload", () => {
  openLibrary([]);
  expect(screen.queryByPlaceholderText("Search recipes…")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next →" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "No recipes yet" })).toBeVisible();
  const emptyState = within(screen.getByRole("main"));
  expect(emptyState.getByRole("link", { name: "Import Recipe" })).toHaveAttribute("href", "/import");
  expect(emptyState.getByRole("link", { name: "Add Recipe" })).toHaveAttribute("href", "/recipe/new");
  fireEvent.click(screen.getByRole("button", { name: "Load Demos" }));
  const demos = getRecipes();
  expect(demos.map(({ id }) => id)).toEqual(DEMO_RECIPES.map(({ id }) => id));
  expect(demos.every(({ bakeLog }) => bakeLog.length === 0)).toBe(true);
  expect(screen.queryByRole("heading", { name: "No recipes yet" })).toBeNull();
  expect(visibleRecipeIds()).not.toHaveLength(0);
});

it("refreshes the library after restoring a backup and keeps the original for a duplicate ID", async () => {
  openLibrary([recipe]);
  fireEvent.click(screen.getByRole("button", { name: "Backup" }));
  const dialog = screen.getByRole("dialog", { name: "Backup & Restore" });
  const picker = dialog.querySelector<HTMLInputElement>('input[type="file"]')!;
  const file = new File([JSON.stringify([{ ...recipe, name: "Do not replace this loaf" }, oat])],
    "recipes.json", { type: "application/json" });
  fireEvent.change(picker, { target: { files: [file] } });

  const restored = await screen.findByRole("link", { name: /Oat Tin/ });
  expect(restored).toHaveAttribute("href", "/view/oat");
  expect(within(restored).getByText("Whole Grain")).toBeVisible();
  expect(screen.getByRole("link", { name: /Amber Rye/ })).toBeVisible();
  expect(screen.queryByText("Do not replace this loaf")).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(toast.success).toHaveBeenCalledWith("Imported 1 recipe (1 skipped)");
  expect(getRecipes()).toEqual([recipe, oat]);
});

it.each([
  ["Edit Oat Tin", "Edit Oat Tin"],
  ["Timetable for Oat Tin", "Oat Tin timetable"],
])("opens the selected recipe from its %s control", (action, heading) => {
  openLibrary([recipe, { ...oat, description: "", tags: [], steps: [] }]);
  const card = within(screen.getByRole("link", { name: /Oat Tin/ }));
  expect(card.getByText("No description")).toBeVisible();
  expect(card.getByText("1 ingredient")).toBeVisible();
  expect(card.getByText("0 steps")).toBeVisible();
  fireEvent.click(card.getByRole("button", { name: action }));
  expect(screen.getByRole("heading", { name: heading })).toBeVisible();
});

it("keeps the recipe card when storage rejects deletion", () => {
  openLibrary([recipe, oat]);
  const write = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("Storage is read-only");
  });
  try {
    fireEvent.click(screen.getByRole("button", { name: "Delete Oat Tin" }));
    const confirmation = within(screen.getByRole("alertdialog", { name: 'Delete "Oat Tin"?' }));
    expect(confirmation.getByText(/permanently removed/)).toBeVisible();
    fireEvent.click(confirmation.getByRole("button", { name: "Delete" }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/storage/i));
    expect(visibleRecipeIds()).toEqual(["amber", "oat"]);
    expect(getRecipes()).toEqual([recipe, oat]);
  } finally {
    write.mockRestore();
  }
});

it("sorts by name, baking time, and both recipe dates", () => {
  openLibrary([oat, recipe, zebra]);
  expect(visibleRecipeIds()).toEqual(["amber", "oat", "zebra"]);
  const tags = within(screen.getByText("All", { exact: true }).parentElement!);
  expect(tags.getByText("Rye").compareDocumentPosition(tags.getByText("Whole Grain")))
    .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(screen.getByText("1h 30m")).toBeVisible();
  expect(screen.getByText("1h")).toBeVisible();
  expect(screen.getByText("25 min")).toBeVisible();

  for (const [label, ids] of [
    ["Duration", ["zebra", "oat", "amber"]],
    ["Newest first", ["oat", "zebra", "amber"]],
    ["Last updated", ["zebra", "amber", "oat"]],
    ["Name", ["amber", "oat", "zebra"]],
  ] as const) {
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    fireEvent.click(screen.getByRole("option", { name: label }));
    expect(visibleRecipeIds()).toEqual(ids);
  }
});

it("deletes only the selected recipe after confirmation", () => {
  openLibrary([recipe, zebra]);
  fireEvent.click(screen.getByRole("button", { name: "Delete Zebra Rye" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
  expect(getRecipes()).toEqual([recipe, zebra]);

  fireEvent.click(screen.getByRole("button", { name: "Delete Zebra Rye" }));
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
  expect(getRecipes()).toEqual([recipe]);
  expect(visibleRecipeIds()).toEqual(["amber"]);
});
