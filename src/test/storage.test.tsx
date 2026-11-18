import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "@/App";
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
  it("keeps an existing pre-migration library and never repopulates it after deleting the last recipe", () => {
    localStorage.setItem(key, JSON.stringify([recipe]));
    expect(getRecipes()).toEqual([recipe]);
    expect(localStorage.getItem("bread-planner-seeded")).toBe("true");
    deleteRecipe(recipe.id);
    expect(getRecipes()).toEqual([]);
    expect(localStorage.getItem(key)).toBe("[]");
    localStorage.removeItem(key);
    expect(getRecipes()).toEqual([]);
  });

  it("seeds an empty first-run library and returns independent recipe objects", () => {
    localStorage.setItem(key, "[]");
    const recipes = getRecipes();
    expect(recipes).toHaveLength(3);
    const name = recipes[0].name;
    recipes[0].name = "An unsaved edit";
    recipes[0].ingredients[0].name = "An unsaved ingredient edit";
    localStorage.clear();
    const fresh = getRecipes();
    expect(fresh[0].name).toBe(name);
    expect(fresh[0].ingredients[0].name).not.toBe("An unsaved ingredient edit");
  });

  it("rejects invalid nested backup fields but restores valid bake photos and ratings", () => {
    const photo = "data:image/jpeg;base64,YmFrZQ==";
    const entry = { id: "entry", date: "2026-11-01", rating: 5, notes: "Good rise", changes: "",
      crumbRating: 4, ovenSpring: 3, crustColor: "Golden", photos: [photo] };
    const valid = { ...recipe, id: "restored", bakeLog: [entry] };
    const malformed = [
      { ...valid, id: "" }, { ...valid, name: "" }, { ...valid, description: null }, { ...valid, notes: 12 },
      { ...valid, createdAt: "not a date" }, { ...valid, updatedAt: "not a date" },
      ...[
        { id: "" }, { name: null }, { amount: 500 }, { unit: null }, { percentage: 50 },
      ].map((field) => ({ ...valid, ingredients: [{ ...recipe.ingredients[0], ...field }] })),
      ...[
        { id: "" }, { name: undefined }, { instructions: 42 }, { durationMinutes: "5" },
      ].map((field) => ({ ...valid, steps: [{ ...recipe.steps[0], ...field }] })),
      ...[
        { id: "" }, { date: "soon" }, { rating: "5" }, { notes: null }, { changes: null },
        { crumbRating: "4" }, { ovenSpring: "3" }, { crustColor: 0 }, { photos: [false] },
      ].map((field) => ({ ...valid, bakeLog: [{ ...entry, ...field }] })),
    ];
    localStorage.setItem(key, JSON.stringify([recipe]));
    const records = [...malformed.map((record, index) => ({ ...record, id: record.id && `invalid-${index}` })), valid];

    expect(importRecipesFromJSON(JSON.stringify(records))).toEqual({ added: 1, skipped: malformed.length });
    expect(getRecipes()).toEqual([recipe, valid]);
  });

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

  it("edits only the selected recipe and preserves its bake history after reload", () => {
    const selected = {
      ...recipe,
      id: "rye",
      name: "Rye bread",
      bakeLog: [{ id: "bake-1", date: "2026-10-25", rating: 4, notes: "Good crust", changes: "Longer proof" }],
    };
    const updatedAt = "2026-10-26T12:00:00.000Z";
    const originalUrl = window.location.href;
    localStorage.setItem("bread-planner-seeded", "true");
    localStorage.setItem(key, JSON.stringify([recipe, selected]));
    window.history.replaceState(null, "", `/recipe/${selected.id}`);
    vi.setSystemTime(new Date(updatedAt));

    try {
      const editor = render(<App />);
      const name = screen.getByRole("textbox", { name: "Recipe Name" });
      expect(name).toHaveValue(selected.name);
      fireEvent.change(name, { target: { value: "Seeded rye bread" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Recipe" }));
      expect(window.location.pathname).toBe(`/view/${selected.id}`);

      editor.unmount();
      render(<App />);
      expect(screen.getByRole("heading", { name: "Seeded rye bread" })).toBeVisible();
      expect(screen.getByText("Good crust")).toBeVisible();
      expect(getRecipes()).toEqual([recipe, { ...selected, name: "Seeded rye bread", updatedAt }]);
    } finally {
      vi.useRealTimers();
      window.history.replaceState(null, "", originalUrl);
    }
  });

  it("persists a new bake entry and deletes only the selected entry", () => {
    const originalEntry = { id: "bake-1", date: "2026-10-25", rating: 4, notes: "Good crust", changes: "Longer proof" };
    const newNotes = "Even crumb";
    const originalUrl = window.location.href;
    const originalState = window.history.state;
    localStorage.setItem("bread-planner-seeded", "true");
    localStorage.setItem(key, JSON.stringify([{ ...recipe, bakeLog: [originalEntry] }]));
    window.history.replaceState(null, "", `/view/${recipe.id}`);

    try {
      const initial = render(<App />);
      fireEvent.click(screen.getByRole("button", { name: "Log a Bake" }));
      fireEvent.change(screen.getByPlaceholderText(/How did this bake go/), { target: { value: newNotes } });
      fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
      initial.unmount();

      const reloaded = render(<App />);
      expect(screen.getByText(originalEntry.notes)).toBeVisible();
      const savedNotes = screen.getByText(newNotes);
      expect(savedNotes).toBeVisible();
      expect(getRecipes()[0].bakeLog).toHaveLength(2);
      fireEvent.click(within(savedNotes.parentElement!).getByRole("button", { name: "Delete bake entry" }));
      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
      reloaded.unmount();

      render(<App />);
      expect(screen.queryByText(newNotes)).not.toBeInTheDocument();
      expect(screen.getByText(originalEntry.notes)).toBeVisible();
      expect(getRecipes()[0].bakeLog).toEqual([originalEntry]);
    } finally {
      window.history.replaceState(originalState, "", originalUrl);
    }
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
