import { describe, expect, it } from "vitest";
import { zodSchema } from "ai";
import { ImportedRecipeDraftSchema } from "@/lib/import/import-schema";

describe("ImportedRecipeDraftSchema", () => {
  it("produces a strict ingredient schema compatible with OpenAI structured outputs", async () => {
    const jsonSchema = await zodSchema(ImportedRecipeDraftSchema, {
      useReferences: false,
    }).jsonSchema;

    expect(jsonSchema.required).toEqual([
      "name",
      "description",
      "notes",
      "tags",
      "ingredients",
      "steps",
      "warnings",
    ]);

    expect(jsonSchema).toMatchObject({
      properties: {
        ingredients: { items: { required: ["name", "amount", "unit"] } },
      },
    });
  });
});
