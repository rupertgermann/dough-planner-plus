## Dough Planner Plus product brief

Dough Planner Plus is a bread-planning application that turns rough recipe sources into structured baking workflows.

The product centers on four connected tasks:

- collect and organize bread recipes
- structure ingredients and timed steps
- import recipes from pasted text or recipe URLs
- generate an actionable timetable from a target ready time

## Product goals

- keep recipe planning local-first
- support fast recipe capture from messy real-world sources
- preserve an editable workflow after import instead of locking users into generated output
- keep the UI fast, direct, and practical on desktop and mobile
- keep the architecture small enough to deploy easily

## Product principles

- prefer reliable workflows over opaque automation
- keep imported data editable before it is saved
- favor schema-validated structured data over free-form parsing
- use server-side boundaries only where they create concrete value
- keep recipe storage in the browser for simplicity

## Current implementation notes

- recipes are stored locally in the browser
- recipe import supports pasted text and recipe page URLs
- the import pipeline uses shared Zod schemas and normalization rules
- URL imports are fetched server-side to avoid browser CORS constraints
- JSON-LD `Recipe` extraction is preferred when a page exposes structured recipe data
- AI extraction uses the Vercel AI SDK with `@ai-sdk/openai` and the OpenAI Responses API
- quick parse remains available as a fast fallback path
- the timetable is generated from the entered or imported step durations

## User workflow

1. Capture a recipe through manual entry or the import screen.
2. Review the imported draft and edit name, description, tags, ingredients, and steps.
3. Save the recipe locally.
4. Open the recipe in the editor for deeper changes if needed.
5. Generate a baking timetable by selecting the target ready time.

## Scope

- bread-first recipe planning
- local recipe persistence
- server-side import for URL fetching and AI extraction
- structured step timing for timetable generation

## Non-goals

- user accounts
- cloud recipe storage
- collaborative editing
- generic meal planning
- batch import pipelines

## Extension areas

- richer import heuristics for unusual recipe formats
- export and backup flows
- notifications and reminders for baking steps
- broader fixture coverage for real-world recipe pages
- deployment-specific server adapters
