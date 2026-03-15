import { describe, expect, it } from "vitest";
import { zodSchema } from "ai";
import { ImportedRecipeDraftSchema } from "@/lib/import/import-schema";

describe("ImportedRecipeDraftSchema", () => {
  it("produces a strict ingredient schema compatible with OpenAI structured outputs", () => {
    const schemaResult = zodSchema(ImportedRecipeDraftSchema, {
      useReferences: false,
    }) as { jsonSchema?: Record<string, unknown> } & Record<string, unknown>;

    const jsonSchema = (schemaResult.jsonSchema ?? schemaResult) as {
      properties?: {
        ingredients?: {
          items?: {
            required?: string[];
          };
        };
      };
      required?: string[];
    };

    expect(jsonSchema.required).toEqual([
      "name",
      "description",
      "notes",
      "tags",
      "ingredients",
      "steps",
      "warnings",
    ]);

    expect(jsonSchema.properties?.ingredients?.items?.required).toEqual([
      "name",
      "amount",
      "unit",
    ]);
  });
});
