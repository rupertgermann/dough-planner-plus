

# Bread Dough Planner — MVP

A clean, intuitive app to store bread recipes and generate step-by-step baking timetables.

## Pages & Features

### 1. Recipe Library (Home Page)
- Grid/list of saved recipes with name, bread type, and prep time
- "Add Recipe" button to create manually
- "Import Recipe" button to paste text from external sources
- Search/filter recipes by name

### 2. Add/Edit Recipe
- Simple form: name, description, ingredients list, and free-text instructions
- Ingredients as a dynamic list (ingredient name, amount, unit)
- Save to local storage (no backend needed for MVP)

### 3. Recipe Import + AI Conversion
- Paste raw recipe text (from websites, books, etc.) into a text area
- AI parses the text and extracts:
  - Structured ingredients list (name, amount, unit)
  - Step-by-step timetable with estimated durations (e.g., "Mix — 10 min", "Bulk ferment — 3 hrs", "Shape — 15 min")
- User reviews and edits the AI output before saving

### 4. Baking Timetable View
- For any saved recipe, generate a timeline working backward from a desired "bread ready" time
- Each step shown as a card with: step name, start time, duration, and instructions
- Simple, scrollable vertical timeline

## Design & Tech Approach
- **Data storage**: Browser local storage (simple, no backend for MVP)
- **AI integration**: OpenAI API via a Supabase edge function for recipe parsing
- **Styling**: Tailwind CSS with shadcn/ui components — clean, minimal, modern
- **Stack**: React + TypeScript + React Router (already set up)

## What's NOT in the MVP
- User accounts / authentication
- Sharing recipes
- Multiple timers / notifications
- Baker's percentage calculator
- Photo uploads

