import { ImportedRecipeDraft } from "../../src/lib/import/import-schema";
import { normalizeImportedRecipeDraft } from "../../src/lib/import/normalize-import";

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value == null ? [] : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (isRecord(value) && typeof value["@value"] === "string") {
    return value["@value"].trim();
  }

  return "";
}

function parseIsoDurationMinutes(value: string): number {
  const match = value.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i,
  );

  if (!match) {
    return 0;
  }

  const days = Number.parseInt(match[1] ?? "0", 10);
  const hours = Number.parseInt(match[2] ?? "0", 10);
  const minutes = Number.parseInt(match[3] ?? "0", 10);
  const seconds = Number.parseInt(match[4] ?? "0", 10);

  return days * 24 * 60 + hours * 60 + minutes + Math.round(seconds / 60);
}

function parseDurationMinutes(value: unknown): number {
  const text = getString(value);

  if (!text) {
    return 0;
  }

  if (/^P/i.test(text)) {
    return parseIsoDurationMinutes(text);
  }

  const match = text.match(/(\d+)\s*(min|mins|minute|minutes|hour|hours|hr|hrs|h)\b/i);
  if (!match) {
    return 0;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  return unit.startsWith("h") ? amount * 60 : amount;
}

function parseIngredientEntry(entry: string) {
  const cleaned = entry.replace(/^[-•*]\s*/, "").trim();
  const match = cleaned.match(/^([\d./½¼¾⅓⅔⅛]+)\s*([a-zA-Z]{1,8})?\s+(.+)/);

  if (!match) {
    return {
      name: cleaned,
      amount: "",
      unit: "",
    };
  }

  return {
    name: match[3].replace(/^(of\s+)/i, "").trim(),
    amount: match[1].trim(),
    unit: (match[2] ?? "").trim(),
  };
}

function getRecipeNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => getRecipeNodes(entry));
  }

  if (!isRecord(value)) {
    return [];
  }

  const nodes = [value];

  if (Array.isArray(value["@graph"])) {
    nodes.push(...value["@graph"].flatMap((entry) => getRecipeNodes(entry)));
  }

  return nodes.filter((node) => {
    const typeValue = node["@type"];
    const types = Array.isArray(typeValue) ? typeValue : [typeValue];
    return types.some((type) => typeof type === "string" && type.toLowerCase() === "recipe");
  });
}

function createStep(entry: Record<string, unknown> | string) {
  if (typeof entry === "string") {
    const instructions = entry.trim();
    if (!instructions) return null;

    return {
      name: instructions.slice(0, 50),
      durationMinutes: parseDurationMinutes(instructions),
      instructions,
    };
  }

  const instructions = getString(entry.text) || getString(entry.name);
  if (!instructions) {
    return null;
  }

  return {
    name: getString(entry.name).slice(0, 50) || instructions.slice(0, 50),
    durationMinutes: parseDurationMinutes(entry.timeRequired) || parseDurationMinutes(entry.performTime),
    instructions,
  };
}

function extractSteps(value: unknown): Array<{
  name: string;
  durationMinutes: number;
  instructions: string;
}> {
  if (typeof value === "string") {
    return value
      .split(/\n+/)
      .map((line) => createStep(line))
      .filter((step): step is NonNullable<typeof step> => Boolean(step));
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractSteps(entry));
  }

  if (!isRecord(value)) {
    return [];
  }

  const typeValue = value["@type"];
  const types = Array.isArray(typeValue) ? typeValue : [typeValue];

  if (types.some((type) => typeof type === "string" && type.toLowerCase() === "howtosection")) {
    return asArray(value.itemListElement).flatMap((entry) => extractSteps(entry));
  }

  const step = createStep(value);
  if (step) {
    return [step];
  }

  return asArray(value.itemListElement).flatMap((entry) => extractSteps(entry));
}

export function extractJsonLdRecipe(html: string): ImportedRecipeDraft | null {
  const blocks = Array.from(
    html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ).map((match) => match[1]?.trim()).filter(Boolean) as string[];

  for (const block of blocks) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(block);
    } catch {
      continue;
    }

    const recipeNode = getRecipeNodes(parsed)[0];
    if (!recipeNode) {
      continue;
    }

    const keywordValues = [
      ...asArray(recipeNode.keywords),
      ...asArray(recipeNode.recipeCategory),
      ...asArray(recipeNode.recipeCuisine),
    ]
      .flatMap((entry) => getString(entry).split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);

    const draft = {
      name: getString(recipeNode.name) || "Imported Recipe",
      description: getString(recipeNode.description),
      tags: keywordValues,
      ingredients: asArray(recipeNode.recipeIngredient)
        .map((entry) => getString(entry))
        .filter(Boolean)
        .map((entry) => parseIngredientEntry(entry)),
      steps: extractSteps(recipeNode.recipeInstructions),
      warnings: [],
    };

    try {
      return normalizeImportedRecipeDraft(draft);
    } catch {
      continue;
    }
  }

  return null;
}
