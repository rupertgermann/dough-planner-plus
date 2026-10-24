import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ExportImportDialog } from "@/components/ExportImportDialog";
import { RecipeStorageBoundary } from "@/components/RecipeStorageBoundary";
import { deleteRecipe, duplicateRecipe, getRecipes, importRecipesFromJSON, RecipeStorageError, saveRecipe } from "@/lib/storage";

const key = "bread-planner-recipes";
const recipe = {
  id: "bread", name: "Bread", description: "", tags: [],
  ingredients: [{ id: "flour", name: "Flour", amount: "500", unit: "g" }],
  steps: [{ id: "mix", name: "Mix", durationMinutes: 5, instructions: "Mix" }],
  notes: "", bakeLog: [], createdAt: "2026-10-24", updatedAt: "2026-10-24",
};

beforeEach(() => localStorage.clear());

describe("recipe storage", () => {
  it("skips malformed and duplicate backup records and migrates legacy defaults", () => {
    localStorage.setItem("bread-planner-seeded", "true");
    const { notes, bakeLog, ...legacy } = recipe;
    const records = [null, { id: "bad", name: "Bad", steps: [] },
      { ...recipe, tags: [null] }, { ...recipe, ingredients: [null] },
      { ...recipe, steps: [{ ...recipe.steps[0], durationMinutes: -1 }] },
      { ...recipe, bakeLog: [{ id: "log" }] }, legacy, recipe];
    expect(importRecipesFromJSON(JSON.stringify(records))).toEqual({ added: 1, skipped: 7 });
    expect(getRecipes()).toEqual([recipe]);
    expect(importRecipesFromJSON(JSON.stringify([recipe]))).toEqual({ added: 0, skipped: 1 });
  });

  it.each(["[{broken", "{}", "null", '[{"id":"bad"}]'])("preserves unreadable bytes %s through every mutation", (raw) => {
    localStorage.setItem(key, raw);
    expect(() => getRecipes()).toThrow(RecipeStorageError);
    for (const mutate of [() => saveRecipe(recipe), () => deleteRecipe("bread"),
      () => duplicateRecipe("bread"), () => importRecipesFromJSON(JSON.stringify([recipe]))]) {
      expect(mutate).toThrow(RecipeStorageError);
      expect(localStorage.getItem(key)).toBe(raw);
      expect(localStorage.getItem("bread-planner-seeded")).toBeNull();
    }
  });

  it("blocks writes when the browser refuses storage reads", () => {
    localStorage.setItem(key, JSON.stringify([recipe]));
    const raw = localStorage.getItem(key);
    const reads = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    try {
      expect(() => saveRecipe(recipe)).toThrow(RecipeStorageError);
      expect(() => deleteRecipe(recipe.id)).toThrow(RecipeStorageError);
      expect(() => importRecipesFromJSON("[]")).toThrow(RecipeStorageError);
    } finally {
      reads.mockRestore();
    }
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it.each([false, true])("rejects an invalid save before writing or seeding (existing storage: %s)", (hasExisting) => {
    if (hasExisting) localStorage.setItem(key, JSON.stringify([recipe]));
    const raw = localStorage.getItem(key);
    const invalid = { ...recipe, steps: [{ ...recipe.steps[0], durationMinutes: -1 }] };
    expect(() => saveRecipe(invalid)).toThrow(/Recipe could not be saved.*durationMinutes/);
    expect(localStorage.getItem(key)).toBe(raw);
    expect(localStorage.getItem("bread-planner-seeded")).toBeNull();
  });

  it("seeds absent storage and still supports valid saves and deletes", () => {
    expect(getRecipes()).toHaveLength(3);
    saveRecipe(recipe);
    expect(getRecipes().find((r) => r.id === recipe.id)).toEqual(recipe);
    deleteRecipe(recipe.id);
    expect(getRecipes()).toHaveLength(3);
  });

  it("restores a mixed backup through the file picker without poisoning the library", async () => {
    localStorage.setItem("bread-planner-seeded", "true");
    const imported = vi.fn();
    render(<ExportImportDialog onImported={imported} />);
    fireEvent.click(screen.getByRole("button", { name: "Backup" }));
    const picker = screen.getByRole("dialog").querySelector<HTMLInputElement>('input[type="file"]');
    expect(picker).not.toBeNull();
    const file = new File([JSON.stringify([null, { id: "bad", name: "Bad", steps: [] }, recipe])], "backup.json", { type: "application/json" });
    fireEvent.change(picker!, { target: { files: [file] } });
    await waitFor(() => expect(imported).toHaveBeenCalledOnce());
    expect(getRecipes()).toEqual([recipe]);
  });

  it("shows a preserved-data error and recovers after repair and Retry", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(key, "broken");
    function Library() { return <p>{getRecipes()[0]?.name}</p>; }
    render(<RecipeStorageBoundary><Library /></RecipeStorageBoundary>);
    expect(screen.getByRole("alert")).toHaveTextContent("saved data has been preserved");
    expect(localStorage.getItem(key)).toBe("broken");
    localStorage.setItem(key, JSON.stringify([recipe]));
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByText("Bread")).toBeInTheDocument();
    errors.mockRestore();
  });
});
