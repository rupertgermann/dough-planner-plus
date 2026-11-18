import { Readable } from "node:stream";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "@/App";
import { getRecipes } from "@/lib/storage";
import handler from "../../../api/recipe-import";
import { RecipeImportError } from "../../../server/lib/recipe-import-error";

const { parseRecipeWithAI, fetchRecipeSource } = vi.hoisted(() => ({
  parseRecipeWithAI: vi.fn<typeof import("../../../server/lib/parse-recipe-with-ai").parseRecipeWithAI>(),
  fetchRecipeSource: vi.fn<typeof import("../../../server/lib/fetch-recipe-source").fetchRecipeSource>(),
}));
vi.mock("../../../server/lib/parse-recipe-with-ai", () => ({ parseRecipeWithAI }));
vi.mock("../../../server/lib/fetch-recipe-source", () => ({ fetchRecipeSource }));

const importFetch = vi.fn(async (url: string, init: RequestInit) => {
  const request = new Request(new URL(url, window.location.origin), init);
  const body = Readable.from([Buffer.from(await request.arrayBuffer())]);
  const headers = new Headers();
  let responseBody: string | null = null;
  const response = {
    statusCode: 200,
    setHeader: (name: string, value: string) => headers.set(name, value),
    end: (value: string) => { responseBody = value; },
  };

  await handler(Object.assign(body, { method: request.method }), response);
  return new Response(responseBody, { status: response.statusCode, headers });
});

async function expectImportResponse(status: number) {
  expect(importFetch).toHaveBeenCalledExactlyOnceWith("/api/recipe-import", expect.objectContaining({
    method: "POST",
    headers: { "content-type": "application/json" },
  }));
  const response = await importFetch.mock.results[0].value;
  expect(response.status).toBe(status);
  expect(response.headers.get("Content-Type")).toBe("application/json");
}

const originalUrl = window.location.href;
const originalHistoryState = window.history.state;

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/import");
  parseRecipeWithAI.mockReset();
  fetchRecipeSource.mockReset();
  importFetch.mockClear();
  vi.stubGlobal("fetch", importFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState(originalHistoryState, "", originalUrl);
});

it("reviews, edits, and saves a successful recipe import", async () => {
  const library = getRecipes();
  const draft = {
    name: "Pan loaf",
    description: "A simple pan loaf",
    notes: "Proof until puffy.",
    tags: [],
    ingredients: [{ name: "Flour", amount: "500", unit: "g" }, { name: "Water", amount: "350", unit: "g" }],
    steps: [{ name: "Mix", durationMinutes: 10, instructions: "Mix until smooth." }],
    warnings: ["Check the mixing time."],
  };
  parseRecipeWithAI.mockResolvedValue(draft);
  render(<App />);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Pan loaf\n500 g flour\n350 g water\nMix for 10 min" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import with AI" }));

  const name = await screen.findByRole("textbox", { name: "Recipe Name" });
  expect(name).toHaveValue("Pan loaf");
  expect(screen.getByText("Source: AI")).toBeVisible();
  expect(await screen.findByText("AI import complete. Review and save the draft.")).toBeVisible();
  expect(screen.getByText("Check the mixing time.")).toBeVisible();
  await expectImportResponse(200);
  expect(parseRecipeWithAI).toHaveBeenCalledExactlyOnceWith("Pan loaf\n500 g flour\n350 g water\nMix for 10 min", expect.objectContaining({ mode: "text" }));
  expect(getRecipes()).toEqual(library);

  const flourAmount = screen.getAllByPlaceholderText("Amount")[0];
  expect(flourAmount).toHaveValue("500");
  fireEvent.change(name, { target: { value: "Weekend pan loaf" } });
  fireEvent.change(flourAmount, { target: { value: "550" } });
  fireEvent.click(screen.getByRole("button", { name: "Save & Edit Recipe" }));

  const savedRecipes = getRecipes();
  expect(savedRecipes.slice(0, -1)).toEqual(library);
  const saved = savedRecipes.at(-1);
  expect(saved).toMatchObject({
    name: "Weekend pan loaf",
    ingredients: [{ name: "Flour", amount: "550", unit: "g" }, draft.ingredients[1]],
    steps: draft.steps,
  });
  expect(window.location.pathname).toBe(`/recipe/${saved?.id}`);
  expect(screen.getByRole("heading", { name: "Edit Recipe" })).toBeVisible();
  expect(await screen.findByText("Recipe saved.")).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Recipe Name" })).toHaveValue("Weekend pan loaf");
});

it("shows the API error without saving a rejected recipe import", async () => {
  const library = getRecipes();
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Recipe URL" }), {
    target: { value: "not-a-url" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import from URL" }));

  expect(await screen.findByText("Invalid recipe import request.")).toBeVisible();
  await expectImportResponse(400);
  expect(screen.getByRole("button", { name: "Import from URL" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Save & Edit Recipe" })).not.toBeInTheDocument();
  expect(getRecipes()).toEqual(library);
});

it("corrects a quick-parse draft and retains the corrections when saving fails", async () => {
  const library = getRecipes();
  render(<App />);
  const pastedText = screen.getByRole("textbox");
  const quickParse = screen.getByRole("button", { name: "Quick Parse" });
  fireEvent.click(quickParse);
  expect(await screen.findByText("Paste a recipe first.")).toBeVisible();
  fireEvent.change(pastedText, { target: { value: "A note with no recipe" } });
  fireEvent.click(quickParse);
  expect(await screen.findByText("Quick parse could not find enough recipe structure.")).toBeVisible();
  fireEvent.change(pastedText, { target: { value: "Kitchen loaf\nIngredients\n500 g flour\nInstructions\nMix for 10 min" } });
  fireEvent.click(quickParse);
  expect(screen.getByText("Source: Quick Parse")).toBeVisible();
  expect(await screen.findByText("Quick parse complete. Review and save the draft.")).toBeVisible();
  expect(importFetch).not.toHaveBeenCalled();

  fireEvent.change(screen.getByRole("textbox", { name: "Description" }), { target: { value: "A light loaf" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), { target: { value: "Proof in the tin" } });
  fireEvent.click(screen.getByText("Sweet", { exact: true }));
  fireEvent.click(screen.getByText("Sweet", { exact: true }));
  fireEvent.click(screen.getByText("Rye", { exact: true }));

  fireEvent.click(screen.getByRole("button", { name: "Remove ingredient flour" }));
  expect(screen.getByPlaceholderText("Ingredient")).toHaveValue("");
  const addIngredient = within(screen.getByText("Ingredients (1)").parentElement!).getByRole("button", { name: "Add" });
  fireEvent.click(addIngredient);
  for (const [index, label, value] of [
    [0, "Ingredient", "Rye flour"], [0, "Amount", "470"], [0, "Unit", "g"],
    [1, "Ingredient", "Water"], [1, "Amount", "340"], [1, "Unit", "ml"],
  ] as const) {
    fireEvent.change(screen.getAllByPlaceholderText(label)[index], { target: { value } });
  }
  fireEvent.click(addIngredient);
  fireEvent.click(screen.getByRole("button", { name: "Remove unnamed ingredient" }));
  expect(screen.getByText("Ingredients (2)")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "Remove step Mix for 10 min" }));
  expect(screen.getByPlaceholderText("Step name")).toHaveValue("");
  const addStep = within(screen.getByText("Steps (1)").parentElement!).getByRole("button", { name: "Add" });
  fireEvent.click(addStep);
  for (const [index, label, value] of [
    [0, "Step name", "Mix"], [0, "Minutes", "14"], [0, "Instructions", "Mix thoroughly"],
    [1, "Step name", "Bake"], [1, "Minutes", "42"], [1, "Instructions", "Cool on a rack"],
  ] as const) {
    fireEvent.change(screen.getAllByPlaceholderText(label)[index], { target: { value } });
  }
  fireEvent.click(addStep);
  fireEvent.click(screen.getByRole("button", { name: "Remove unnamed step" }));
  expect(screen.getByText("Steps (2)")).toBeVisible();

  const save = screen.getByRole("button", { name: "Save & Edit Recipe" });
  const storage = vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new Error("Storage is full"); });
  try {
    fireEvent.click(save);
    expect(await screen.findByText("Storage is full")).toBeVisible();
    expect(window.location.pathname).toBe("/import");
    expect(getRecipes()).toEqual(library);
  } finally {
    storage.mockRestore();
  }
  fireEvent.click(save);
  expect(screen.getByRole("heading", { name: "Edit Recipe" })).toBeVisible();
  expect(getRecipes().at(-1)).toMatchObject({
    name: "Kitchen loaf", description: "A light loaf", notes: "Proof in the tin", tags: ["Rye"],
    ingredients: [{ name: "Rye flour", amount: "470", unit: "g" }, { name: "Water", amount: "340", unit: "ml" }],
    steps: [
      { name: "Mix", durationMinutes: 14, instructions: "Mix thoroughly" },
      { name: "Bake", durationMinutes: 42, instructions: "Cool on a rack" },
    ],
  });
});

it("shows progress and then a JSON-LD preview when importing a URL", async () => {
  const url = "https://recipes.example/bread";
  fetchRecipeSource.mockResolvedValue({ url, contentType: "text/html", html:
    '<script type="application/ld+json">{"@type":"Recipe","name":"URL loaf","recipeIngredient":["500 g flour"],"recipeInstructions":["Mix - 12 min"]}</script>',
  });
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));
  expect(screen.queryByRole("button", { name: "Quick Parse" })).not.toBeInTheDocument();
  const submit = screen.getByRole("button", { name: "Import from URL" });
  fireEvent.click(submit);
  expect(await screen.findByText("Enter a recipe URL first.")).toBeVisible();
  expect(importFetch).not.toHaveBeenCalled();

  fireEvent.change(screen.getByRole("textbox", { name: "Recipe URL" }), { target: { value: `  ${url}  ` } });
  fireEvent.click(submit);
  expect(screen.getByRole("button", { name: "Importing..." })).toBeDisabled();
  expect(screen.getByText("Fetching the recipe page and building a structured draft.")).toBeVisible();
  expect(await screen.findByRole("textbox", { name: "Recipe Name" })).toHaveValue("URL loaf");
  expect(screen.getByText("Source: JSON-LD")).toBeVisible();
  expect(await screen.findByText("Imported from structured recipe data.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Import from URL" })).toBeEnabled();
  expect(fetchRecipeSource).toHaveBeenCalledExactlyOnceWith(url);
  expect(parseRecipeWithAI).not.toHaveBeenCalled();
});

it("shows an editable fallback draft and keeps both source inputs when switching modes", async () => {
  const library = getRecipes();
  const text = "Weeknight loaf\nIngredients\n400 g flour\nMethod\nMix for 15 min";
  parseRecipeWithAI.mockRejectedValue(new RecipeImportError("Extraction unavailable", 502, {
    allowQuickParseFallback: true,
  }));
  render(<App />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Recipe URL" }), {
    target: { value: "https://recipes.example/other" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Paste Text" }));
  expect(screen.getByRole("textbox")).toHaveValue(text);
  fireEvent.click(screen.getByRole("button", { name: "Import with AI" }));

  expect(await screen.findByText("AI import fell back to quick parse.")).toBeVisible();
  expect(screen.getByText("AI import failed, so quick parse was used instead.")).toBeVisible();
  expect(screen.getByText("Source: Quick Parse")).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Recipe Name" })).toHaveValue("Weeknight loaf");
  await expectImportResponse(200);
  expect(getRecipes()).toEqual(library);

  fireEvent.click(screen.getByRole("button", { name: "Import URL" }));
  expect(screen.getByRole("textbox", { name: "Recipe URL" })).toHaveValue("https://recipes.example/other");
});

it("allows retry after a non-JSON response from the import endpoint", async () => {
  importFetch.mockResolvedValueOnce(new Response("Upstream error", { status: 502 }));
  render(<App />);
  const submit = screen.getByRole("button", { name: "Import with AI" });
  fireEvent.click(submit);
  expect(await screen.findByText("Paste a recipe first.")).toBeVisible();
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "A loaf recipe" } });
  fireEvent.click(submit);
  expect(screen.getByText("Extracting ingredients and steps from your pasted recipe text.")).toBeVisible();
  expect(await screen.findByText("Recipe import failed.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Import with AI" })).toBeEnabled();
  expect(screen.queryByText("Imported Draft")).not.toBeInTheDocument();
});

it("advertises POST when the import API rejects a different method", async () => {
  const response = await importFetch("/api/recipe-import", { method: "GET" });
  expect(response.status).toBe(405);
  expect(response.headers.get("Allow")).toBe("POST");
  expect(response.headers.get("Content-Type")).toBe("application/json");
  expect(await response.json()).toEqual({ error: "Method not allowed" });
});
