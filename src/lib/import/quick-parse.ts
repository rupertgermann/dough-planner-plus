import { ImportedRecipeDraft } from "./import-schema";
import { normalizeImportedRecipeDraft } from "./normalize-import";

function parseDurationMinutes(line: string): number {
  const durationMatch = line.match(/(\d+)\s*(min|mins|minute|minutes|hour|hours|hr|hrs|h)\b/i);

  if (!durationMatch) {
    return 0;
  }

  const value = Number.parseInt(durationMatch[1], 10);
  const unit = durationMatch[2].toLowerCase();

  if (!Number.isFinite(value)) {
    return 0;
  }

  return unit.startsWith("h") ? value * 60 : value;
}

function looksLikeIngredientLine(line: string): boolean {
  return /^[-•*]/.test(line) || /^[\d½¼¾⅓⅔⅛]/.test(line) || /^\d+\s*\/\s*\d+/.test(line);
}

function inferRecipeName(lines: string[]): string {
  const candidate = lines.find((line) => {
    const lower = line.toLowerCase();

    return (
      line.length > 3 &&
      line.length < 80 &&
      !lower.includes("ingredient") &&
      !lower.includes("instruction") &&
      !lower.includes("direction") &&
      !lower.includes("method") &&
      !looksLikeIngredientLine(line)
    );
  });

  return candidate ?? "Imported Recipe";
}

function isIngredientHeader(line: string): boolean {
  return /^(ingredients?|what you need)\b/i.test(line);
}

function isInstructionHeader(line: string): boolean {
  return /^(instructions?|directions?|method|steps?)\b/i.test(line);
}

export function quickParseRecipeText(text: string): ImportedRecipeDraft {
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const ingredients: ImportedRecipeDraft["ingredients"] = [];
  const steps: ImportedRecipeDraft["steps"] = [];
  const warnings: string[] = [];

  let section: "unknown" | "ingredients" | "steps" = "unknown";

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (isIngredientHeader(line)) {
      section = "ingredients";
      continue;
    }

    if (isInstructionHeader(line)) {
      section = "steps";
      continue;
    }

    if (section === "ingredients" || (section === "unknown" && looksLikeIngredientLine(line) && !lower.includes("min"))) {
      const normalizedLine = line.replace(/^[-•*]\s*/, "");
      const match = normalizedLine.match(/^(\d+\s+\d+\/\d+|\d+(?:\.\d+)?\s*[½¼¾⅓⅔⅛]|[\d./½¼¾⅓⅔⅛]+)\s*([a-zA-Z]{1,8})?\s+(.+)/);

      if (match) {
        ingredients.push({
          name: match[3].replace(/^(of\s+)/i, "").trim(),
          amount: match[1].trim(),
          unit: (match[2] ?? "").trim(),
        });
      } else {
        ingredients.push({
          name: normalizedLine,
          amount: "",
          unit: "",
        });
      }

      continue;
    }

    if (section === "steps" || /^\d+[.)]\s+/.test(line)) {
      const instructions = line.replace(/^\d+[.)]\s*/, "").trim();

      steps.push({
        name: instructions.slice(0, 50) || "Step",
        durationMinutes: parseDurationMinutes(line),
        instructions,
      });
    }
  }

  if (ingredients.length === 0) {
    warnings.push("No ingredients were confidently detected.");
  }

  if (steps.length === 0) {
    warnings.push("No steps were confidently detected.");
  }

  return normalizeImportedRecipeDraft({
    name: inferRecipeName(lines),
    description: "Imported with quick parse",
    notes: "",
    tags: [],
    ingredients,
    steps,
    warnings,
  });
}
