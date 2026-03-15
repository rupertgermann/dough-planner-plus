# AI Recipe Import Architecture

## Goal

The recipe import system accepts pasted text and recipe URLs, extracts a structured draft recipe, and saves the final recipe locally through the existing storage flow after user review.

The implementation is built around:

- a shared import schema
- a normalization layer
- a fast local quick-parse fallback
- a server route for URL fetching and AI extraction
- an editable client preview before save

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ImportRecipe Page                       │
│                                                             │
│  Text input / URL input                                     │
│          │                                                  │
│          ├──────────── Quick Parse ────────────┐            │
│          │                                      ▼           │
│          │                         Shared quick parser       │
│          │                                      │           │
│          ▼                                      │           │
│   POST /api/recipe-import                       │           │
│          │                                      │           │
└──────────┼──────────────────────────────────────┼───────────┘
           │                                      │
           ▼                                      │
┌─────────────────────────────────────────────────────────────┐
│                    Server Import Route                      │
│                                                             │
│  validate input                                             │
│  if URL: fetch HTML server-side                             │
│  try JSON-LD Recipe extraction first                        │
│  else clean source text                                     │
│  call AI SDK generateObject()                               │
│  model: openai.responses('gpt-5-mini')                    │
│  schema: ImportedRecipeDraftSchema                          │
│  normalize result                                           │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Parsed Recipe Draft Response                │
│        name, description, tags, ingredients, steps          │
│        source = 'jsonld' | 'ai' | 'quick-parse'            │
│        warnings[]                                           │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                 Editable Preview in the Client              │
│                 Save -> localStorage recipe flow            │
└─────────────────────────────────────────────────────────────┘
```

## Core design choices

### Shared draft shape

Import returns a draft recipe instead of the full persisted `Recipe` shape.

The draft excludes persistence-only fields such as:

- `id`
- `createdAt`
- `updatedAt`
- `bakeLog`

The client assigns those values when saving.

### Server-side AI boundary

The browser never calls OpenAI directly.

The server route handles:

- request validation
- URL fetching
- JSON-LD extraction
- AI invocation
- normalization
- final response validation

### Structured data first

URL imports prefer `schema.org/Recipe` JSON-LD whenever a page exposes it. That path is cheaper, faster, and usually more accurate than reconstructing recipe structure from visible text.

### Fallback resilience

Quick parse remains part of the product surface:

- directly as a user action for pasted text
- indirectly as a fallback when server-side AI extraction fails

## Shared contracts

Shared schema file:

- [src/lib/import/import-schema.ts](../src/lib/import/import-schema.ts)

Key types:

```ts
type RecipeImportRequest =
  | { mode: "text"; text: string }
  | { mode: "url"; url: string };

type RecipeImportResponse = {
  recipe: ImportedRecipeDraft;
  source: "jsonld" | "ai" | "quick-parse";
  warnings: string[];
};
```

Shared normalization file:

- [src/lib/import/normalize-import.ts](../src/lib/import/normalize-import.ts)

Normalization rules:

- trim whitespace
- collapse repeated blank lines in imported source text
- filter empty ingredients and steps
- clamp step names to 50 characters
- round `durationMinutes` to non-negative integers
- preserve unknown values as empty strings or `0`
- filter tags to supported preset tags
- deduplicate warnings

## Runtime flow

### Text import

1. Validate `{ mode: "text", text }`.
2. Send the source text to the AI extraction pipeline.
3. Validate and normalize the returned draft.
4. Fall back to quick parse if AI extraction fails.
5. Return the draft plus the import source.

### URL import

1. Validate `{ mode: "url", url }`.
2. Fetch the recipe page server-side.
3. Search JSON-LD scripts for a `Recipe` node.
4. Map structured ingredients and steps when possible.
5. If JSON-LD is insufficient, convert HTML to cleaned source text.
6. Run AI extraction against the cleaned text.
7. Fall back to quick parse if AI extraction fails.
8. Return the draft plus the import source.

## Server files

- [api/recipe-import.ts](../api/recipe-import.ts): production HTTP handler
- [server/lib/import-recipe.ts](../server/lib/import-recipe.ts): import orchestration
- [server/lib/fetch-recipe-source.ts](../server/lib/fetch-recipe-source.ts): server-side URL fetching
- [server/lib/extract-jsonld-recipe.ts](../server/lib/extract-jsonld-recipe.ts): JSON-LD recipe extraction
- [server/lib/html-to-recipe-text.ts](../server/lib/html-to-recipe-text.ts): HTML text cleanup
- [server/lib/parse-recipe-with-ai.ts](../server/lib/parse-recipe-with-ai.ts): AI SDK integration
- [server/vite-recipe-import-plugin.ts](../server/vite-recipe-import-plugin.ts): Vite dev middleware

## Client files

- [src/pages/ImportRecipe.tsx](../src/pages/ImportRecipe.tsx): import UI and editable preview
- [src/lib/import/quick-parse.ts](../src/lib/import/quick-parse.ts): quick text parser
- [src/lib/import/normalize-import.ts](../src/lib/import/normalize-import.ts): shared normalization and save mapping

## AI extraction

AI extraction uses:

- `ai`
- `@ai-sdk/openai`
- OpenAI Responses API
- `generateObject()`
- Zod schema validation

Model selection:

- `OPENAI_RECIPE_IMPORT_MODEL` chooses the model
- the default model is `gpt-5-mini`

The AI prompt is designed for structured extraction:

- extract a bread or baking recipe from messy input
- prefer exact values from the source
- avoid inventing ingredients or timings
- split amount, unit, and ingredient name when possible
- use `durationMinutes = 0` when unknown
- keep step names short and detailed instructions in `instructions`

## UI behavior

The import screen exposes:

- input mode toggle: `Paste Text` or `Import URL`
- primary AI import action
- secondary `Quick Parse` action for pasted text
- warnings from the import pipeline
- source badge showing `AI`, `JSON-LD`, or `Quick Parse`
- editable fields for recipe name, description, tags, ingredients, and steps
- save action that maps the draft into the persisted `Recipe` shape

## Storage mapping

Saving an imported draft assigns:

- recipe `id`
- ingredient `id`
- step `id`
- `createdAt`
- `updatedAt`
- `bakeLog = []`

The final saved recipe uses the same storage path as manually created recipes.

## Testing

Import-focused tests cover:

- quick parse behavior
- normalization rules
- JSON-LD extraction

Test files:

- [src/test/import/quick-parse.test.ts](../src/test/import/quick-parse.test.ts)
- [src/test/import/normalize-import.test.ts](../src/test/import/normalize-import.test.ts)
- [src/test/import/extract-jsonld-recipe.test.ts](../src/test/import/extract-jsonld-recipe.test.ts)

## Deployment expectations

Development:

- Vite serves the client
- the dev middleware exposes `/api/recipe-import`

Production:

- the platform serves [api/recipe-import.ts](../api/recipe-import.ts) as an HTTP endpoint
- the server environment provides `OPENAI_API_KEY`

## Scope boundaries

The current implementation covers:

- pasted recipe text
- standard HTML recipe pages
- JSON-LD extraction
- AI-assisted fallback parsing
- editable draft review before save

The current implementation does not cover:

- PDF import
- OCR or screenshot import
- batch URL import
