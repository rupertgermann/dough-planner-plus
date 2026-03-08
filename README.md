# Dough Planner Plus

Dough Planner Plus is a local-first baking planner for bread recipes.

It helps you store recipes, structure ingredients and baking steps, import rough recipe text, and generate a backward-planned timetable so you know exactly when to start mixing, fermenting, shaping, proofing, and baking.

## Why this project exists

Home baking recipes are often scattered across notes, bookmarks, and screenshots.

This app turns them into a simple workflow:

- save a recipe
- define ingredients and timed steps
- choose when the bread should be ready
- get a clear baking schedule working backward from that target time

## Features

- recipe library with search and quick actions
- recipe editor for ingredients and timed baking steps
- backward-planned baking timetable based on a target ready date and time
- recipe text import with automatic parsing of ingredients and step durations
- local-first data storage in the browser using `localStorage`
- responsive React UI built with shadcn/ui and Tailwind CSS

## Screenshots

### Recipe library

![Recipe library](docs/screenshots/recipe-library-2026-03-08T18-52-57-673Z.png)

### Recipe editor

![Recipe editor](docs/screenshots/recipe-editor-2026-03-08T18-53-07-173Z.png)

### Baking timetable

![Baking timetable](docs/screenshots/baking-timetable-2026-03-08T18-53-18-845Z.png)

### Recipe import

![Recipe import](docs/screenshots/recipe-import-2026-03-08T18-53-46-995Z.png)

## Tech stack

- Vite
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query
- Vitest

## Getting started

### Requirements

- Node.js
- npm

### Install

```sh
git clone <YOUR_GITHUB_REPO_URL>
cd dough-planner-plus
npm install
```

### Run locally

```sh
npm run dev
```

The Vite dev server is configured to run on port `8080`.

### Build for production

```sh
npm run build
```

### Preview the production build locally

```sh
npm run preview
```

## Testing and linting

```sh
npm run test
npm run lint
```

## How the app stores data

Recipes are currently stored in the browser under the `bread-planner-recipes` key in `localStorage`.

That means:

- data stays on your device
- there is no backend required for the current MVP
- clearing browser storage removes saved recipes

## Project structure

```text
src/
  components/    UI building blocks
  lib/           storage helpers and utilities
  pages/         route-level screens
  test/          test setup
  types/         shared TypeScript types
docs/
  prompt.md      product brief and scope
  screenshots/   README screenshots
```

## Current scope

This repository is intentionally focused on a simple and reliable MVP:

- no user accounts
- no backend database
- no cloud sync
- no external AI API dependency

The import flow uses lightweight local parsing to turn pasted recipe text into editable ingredients and baking steps.

## Contributing

Contributions are welcome.

If you want to help, good areas to improve are:

- better import parsing accuracy
- recipe export and backup flows
- richer timetable controls and reminders
- accessibility and mobile UX polish
- automated end-to-end coverage

Please open an issue or pull request with a clear description of the problem or improvement.

## Open source publishing checklist

Before publishing this repository on GitHub, you may still want to add:

- a `LICENSE` file
- repository topics and a short GitHub description
- an issue template and pull request template
- a deployment target if you want a public demo URL

## Status

This project is a polished MVP for planning bread baking workflows and is ready to be shared publicly as an open-source repository.
