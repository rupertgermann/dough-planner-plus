import { beforeEach, expect, it, vi } from "vitest";
import { ImportedRecipeDraftSchema } from "@/lib/import/import-schema";
import { parseRecipeWithAI } from "../../../server/lib/parse-recipe-with-ai";

const mocks = vi.hoisted(() => ({
  getServerEnv: vi.fn<(name: string) => string | undefined>(),
  createOpenAI: vi.fn(),
  responses: vi.fn(),
  generateObject: vi.fn(),
  logRecipeImportEvent: vi.fn(),
  logRecipeImportError: vi.fn(),
}));
vi.mock("../../../server/lib/server-env", () => ({ getServerEnv: mocks.getServerEnv }));
vi.mock("../../../server/lib/import-debug", () => ({
  logRecipeImportEvent: mocks.logRecipeImportEvent,
  logRecipeImportError: mocks.logRecipeImportError,
}));
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: mocks.createOpenAI }));
vi.mock("ai", () => ({ generateObject: mocks.generateObject }));

const source = "Ingredients\n2 cups flour\nInstructions\nMix and rest for 20 minutes.";
const draft = {
  name: "  Everyday loaf  ", description: "", notes: "", tags: ["Not a preset"],
  ingredients: [{ name: " Flour ", amount: "2", unit: "cups" }],
  steps: [{ name: "Mix", durationMinutes: 20, instructions: "Mix and rest." }],
  warnings: ["Check flour", " Check flour "],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getServerEnv.mockImplementation((name) => name === "OPENAI_API_KEY" ? "local-test-key" : undefined);
  mocks.createOpenAI.mockReturnValue({ responses: mocks.responses });
  mocks.responses.mockReturnValue("fixture-responses-model");
  mocks.generateObject.mockResolvedValue({ object: draft });
});

it("normalizes the extracted recipe and sends a cleaned, bounded request without storing it", async () => {
  const context = { requestId: "fixture", mode: "text" } as const;
  const longSource = `  ${source.replace(/\n/g, "  \r\n")}\n\n\n${"x".repeat(16_000)}  `;
  const result = await parseRecipeWithAI(longSource, context);

  expect(result).toMatchObject({
    name: "Everyday loaf", tags: [], warnings: ["Check flour"],
    ingredients: [{ name: "Flour", amount: "473", unit: "ml (2 cups)" }],
    steps: draft.steps,
  });
  expect(mocks.createOpenAI).toHaveBeenCalledExactlyOnceWith({ apiKey: "local-test-key" });
  expect(mocks.responses).toHaveBeenCalledExactlyOnceWith("gpt-5-mini");
  const prefix = `${source}\n\n`;
  expect(mocks.generateObject).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    model: "fixture-responses-model",
    prompt: prefix + "x".repeat(16_000 - prefix.length),
    schema: ImportedRecipeDraftSchema,
    providerOptions: { openai: { strictJsonSchema: true, store: false } },
  }));
  const request = mocks.generateObject.mock.calls[0][0];
  expect(request.system).toContain("Do not invent ingredients, timings, or tags");
  expect(request.system).toContain("Use durationMinutes = 0 when the timing is not stated");
  expect(mocks.logRecipeImportEvent).toHaveBeenNthCalledWith(1, context, "ai.parse.start", {
    modelId: "gpt-5-mini", hasApiKey: true, sourceLength: 16_000,
  });
  expect(mocks.logRecipeImportEvent).toHaveBeenNthCalledWith(2, context, "ai.parse.success", {
    ingredientCount: 1, stepCount: 1, warningCount: 1,
  });
});

it("uses the configured model when provided", async () => {
  mocks.getServerEnv.mockImplementation((name) => ({
    OPENAI_API_KEY: "local-test-key", OPENAI_RECIPE_IMPORT_MODEL: "custom-model",
  })[name]);
  await parseRecipeWithAI(source);
  expect(mocks.responses).toHaveBeenCalledExactlyOnceWith("custom-model");
});

it("reports missing credentials before initializing the provider", async () => {
  mocks.getServerEnv.mockReturnValue(undefined);
  await expect(parseRecipeWithAI(source)).rejects.toMatchObject({
    message: "OPENAI_API_KEY is not configured for AI import.", statusCode: 503, allowQuickParseFallback: false,
  });
  expect(mocks.createOpenAI).not.toHaveBeenCalled();
});

it.each([
  ["Invalid API key", 502, "OpenAI authentication failed. Check OPENAI_API_KEY.", false],
  ["AUTHENTICATION FAILED", 502, "OpenAI authentication failed. Check OPENAI_API_KEY.", false],
  ["Unauthorized", 502, "OpenAI authentication failed. Check OPENAI_API_KEY.", false],
  ["Model not found", 502, "The configured OpenAI recipe import model is not available.", false],
  ["Model does not exist", 502, "The configured OpenAI recipe import model is not available.", false],
  ["Rate limit exceeded", 429, "OpenAI rate limits prevented recipe import. Try again shortly.", false],
  ["Quota exhausted", 429, "OpenAI rate limits prevented recipe import. Try again shortly.", false],
  ["Malformed output", 502, "AI extraction failed for this recipe source.", true],
  ["Recipe not found", 502, "AI extraction failed for this recipe source.", true],
])("reports %s with the appropriate fallback policy", async (failure, statusCode, message, allowQuickParseFallback) => {
  const error = new Error(failure);
  const context = { requestId: "failure", mode: "url" } as const;
  mocks.generateObject.mockRejectedValue(error);
  await expect(parseRecipeWithAI(source, context)).rejects.toMatchObject({ statusCode, message, allowQuickParseFallback });
  expect(mocks.logRecipeImportError).toHaveBeenCalledExactlyOnceWith(context, "ai.parse.failure", error, {
    modelId: "gpt-5-mini", sourceLength: source.length,
  });
});
