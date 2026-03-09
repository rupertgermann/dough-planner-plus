# AI-Driven Recipe Import — Implementation Plan

## Overview

Replace the current regex-based recipe parser (`ImportRecipe.tsx`) with an AI-powered importer that can reliably extract structured recipe data from:

1. **Pasted text** — free-form recipe text, blog post copy-paste, unstructured notes
2. **URL input** — fetch and parse any recipe webpage (blogs, cooking sites, PDFs)

The AI will extract recipe name, description, tags, ingredients (with amounts/units), and baking steps (with durations) — mapping directly to the existing `Recipe` type.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  ImportRecipe Page                │
│                                                  │
│  ┌──────────┐  ┌──────────────┐                  │
│  │ URL Tab  │  │  Text Tab    │   (toggle)       │
│  └────┬─────┘  └──────┬───────┘                  │
│       │               │                          │
│       ▼               │                          │
│  ┌──────────┐         │                          │
│  │ Fetcher  │         │                          │
│  │ (proxy)  │         │                          │
│  └────┬─────┘         │                          │
│       │               │                          │
│       ▼               ▼                          │
│  ┌────────────────────────────┐                  │
│  │   AI Parsing Service      │                   │
│  │   (Claude API call)       │                   │
│  └────────────┬───────────────┘                  │
│               │                                  │
│               ▼                                  │
│  ┌────────────────────────────┐                  │
│  │   Parsed Recipe Preview   │                   │
│  │   (editable before save)  │                   │
│  └────────────┬───────────────┘                  │
│               │                                  │
│               ▼                                  │
│         Save to localStorage                     │
└──────────────────────────────────────────────────┘
```

---

## Phase 1: AI Parsing Service

### 1.1 API Key Management

**File:** `src/lib/ai-config.ts`

- Store the user's Claude API key in `localStorage` under key `bread-planner-ai-key`
- Provide `getApiKey()` / `setApiKey()` / `clearApiKey()` helpers
- The key is never sent anywhere except the Anthropic API
- Add a settings UI (small dialog/modal) accessible from the import page header to enter/update/remove the key

### 1.2 AI Parse Function

**File:** `src/lib/ai-import.ts`

Create an `aiParseRecipe(text: string): Promise<ParsedRecipe>` function that:

1. Sends the raw text to the Claude API (`claude-sonnet-4-6` for speed/cost balance)
2. Uses a structured system prompt instructing Claude to return JSON matching the app's schema
3. Returns a typed result matching the `Recipe` interface (minus `id`, `createdAt`, etc.)

**Prompt strategy:**

```
You are a recipe extraction assistant for a bread baking planner app.
Extract the following from the provided recipe text:

- name: Recipe title
- description: 1-2 sentence summary
- tags: Zero or more from [Sourdough, Enriched, Flatbread, Whole Grain, Rye, Quick Bread, Rolls, Sweet]
- ingredients: Array of { name, amount, unit }
  - Normalize units (g, kg, ml, L, tsp, tbsp, cup, oz, lb, piece)
  - Separate amount from unit (e.g. "500g" → amount: "500", unit: "g")
- steps: Array of { name (short label ≤50 chars), durationMinutes (integer, 0 if unknown), instructions (full text) }
  - Estimate durations from context when not explicitly stated (e.g. "let rise until doubled" → 60 min)

Return ONLY valid JSON, no markdown fences, no explanation.
```

**Response parsing:**
- Parse JSON from response
- Validate with Zod schema (reuse/extend existing types)
- Assign `generateId()` to each ingredient and step
- Fall back to the existing regex parser if the API call fails (network error, no key configured)

### 1.3 Zod Validation Schema

**File:** `src/lib/ai-import.ts` (co-located)

```ts
const AIParsedRecipeSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string(),
    unit: z.string(),
  })),
  steps: z.array(z.object({
    name: z.string().max(50),
    durationMinutes: z.number().int().min(0),
    instructions: z.string(),
  })),
});
```

---

## Phase 2: URL Fetching

### 2.1 URL-to-Text Extraction

**File:** `src/lib/url-fetcher.ts`

Fetching external URLs from the browser is blocked by CORS. Options (in order of preference):

**Option A — Client-side with a CORS proxy (recommended for local-first):**

- Use a lightweight public CORS proxy (e.g. `allorigins.win`, or self-hostable `cors-anywhere`)
- Fetch the HTML through the proxy
- Extract meaningful text client-side using a `DOMParser`:
  - Look for JSON-LD `<script type="application/ld+json">` containing `schema.org/Recipe` — this is the gold standard for recipe sites and contains pre-structured data
  - Fall back to extracting from `<article>`, `<main>`, or `<body>` with HTML tag stripping
  - Strip nav, footer, sidebar, ads, script, style elements

**Option B — User paste fallback:**

- If the proxy fails or the user prefers not to use one, show instructions: "Open the URL, select all text (Ctrl+A), copy, and paste here"
- This gracefully degrades to the text-paste flow

### 2.2 Schema.org/Recipe Shortcut

Many recipe sites embed structured data in JSON-LD format. When detected:

- Parse directly into the app's `Recipe` format without AI
- Map `recipeIngredient[]` → `ingredients[]`
- Map `recipeInstructions[]` → `steps[]`
- Map `cookTime`/`prepTime` (ISO 8601 duration) → step durations
- Only call the AI if the structured data is incomplete or missing

This saves API calls and provides instant parsing for most popular recipe sites.

---

## Phase 3: UI Updates

### 3.1 Revamped Import Page

**File:** `src/pages/ImportRecipe.tsx` (modify existing)

**Layout changes:**

1. **Input mode toggle** — Tabs or segmented control: `URL` | `Text`
2. **URL mode:**
   - URL input field with "Fetch & Parse" button
   - Loading state with spinner during fetch + AI parse
   - Error state if URL is unreachable
3. **Text mode:**
   - Keep existing `<Textarea>` for pasted text
   - "Parse with AI" button (primary) — uses Claude API
   - "Quick Parse" link/button (secondary) — uses existing regex parser as fallback
4. **Preview section** (shared by both modes):
   - Editable recipe name and description fields
   - Tag selector (from `PRESET_TAGS`)
   - Ingredient list with inline edit (amount, unit, name per row)
   - Step list with inline edit (name, duration, instructions per row)
   - Drag-and-drop reorder for steps (reuse `SortableStep`)
5. **Save button** — creates `Recipe`, saves to `localStorage`, navigates to editor

### 3.2 API Key Settings

**Component:** `src/components/ApiKeyDialog.tsx`

- Small dialog triggered by a "Settings" / gear icon on the import page
- Input field for Claude API key (masked, with show/hide toggle)
- "Save" / "Clear" buttons
- Status indicator: key configured (green dot) or not (gray dot)
- Link to Anthropic's API key page for users who don't have one yet

### 3.3 Loading & Error States

- Skeleton loaders during AI parsing (ingredient/step card placeholders)
- Toast notifications for errors: invalid URL, fetch failure, AI parse failure, rate limit
- Graceful fallback: "AI parsing failed — try the quick parser instead"

---

## Phase 4: Refinements

### 4.1 Prompt Caching / Token Optimization

- The system prompt is static — use Claude's prompt caching if available via the API
- Trim input text to ~4000 tokens max to keep costs low (recipe text rarely exceeds this)
- Use `claude-haiku-4-5` as an even cheaper alternative (configurable in settings)

### 4.2 Duplicate Detection

- Before saving an AI-imported recipe, check existing recipes for name similarity
- Warn if a likely duplicate exists: "You already have a recipe called 'Sourdough Country Loaf'. Import anyway?"

### 4.3 Batch Import (Stretch Goal)

- Allow pasting multiple recipes separated by a delimiter (`---`)
- AI parses each independently
- Preview all, select which to import

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/ai-config.ts` | **New** | API key storage helpers |
| `src/lib/ai-import.ts` | **New** | AI parsing function + Zod schema |
| `src/lib/url-fetcher.ts` | **New** | URL fetch + HTML-to-text extraction + JSON-LD parser |
| `src/pages/ImportRecipe.tsx` | **Modify** | Add URL tab, AI parse button, editable preview |
| `src/components/ApiKeyDialog.tsx` | **New** | API key configuration dialog |
| `src/types/recipe.ts` | **No change** | Existing types are sufficient |
| `src/lib/storage.ts` | **No change** | Existing save/import functions work as-is |

### New Dependencies

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Claude API client (official SDK) |

No other new dependencies required — Zod is already installed, DOMParser is built into browsers.

---

## Implementation Order

1. `ai-config.ts` + `ApiKeyDialog.tsx` — API key management (testable independently)
2. `ai-import.ts` — AI parsing function (test with hardcoded text)
3. Update `ImportRecipe.tsx` — wire in AI parse, add editable preview
4. `url-fetcher.ts` — URL fetching + JSON-LD extraction
5. Update `ImportRecipe.tsx` — add URL tab, wire in fetcher
6. Polish: loading states, error handling, fallback to regex parser
7. Duplicate detection + settings for model selection

---

## Security Considerations

- API key stored only in `localStorage` (same security model as recipes)
- API key never logged, never sent to any endpoint other than `api.anthropic.com`
- URL fetcher proxy is read-only (GET requests only)
- AI responses validated with Zod before use — no raw `eval()` or `innerHTML`
- User-provided URLs are sanitized (must start with `http://` or `https://`)

## Cost Estimate

- Typical recipe text: ~500-1500 tokens input, ~300-800 tokens output
- Using `claude-sonnet-4-6`: ~$0.003-0.008 per recipe import
- Using `claude-haiku-4-5`: ~$0.0003-0.0008 per recipe import
- Users importing 10 recipes/month: < $0.10/month with Sonnet
