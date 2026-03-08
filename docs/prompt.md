## Dough Planner Plus product brief

Dough Planner Plus is a simple app for planning bread baking.

The core idea is to help bakers move from an unstructured recipe to an actionable baking schedule.

## MVP goals

- store bread recipes locally
- define ingredients and timed baking steps
- generate a step-by-step timetable working backward from a target ready time
- import recipe text and turn it into an editable ingredient list and baking workflow
- keep the implementation simple, reliable, and easy to extend

## Product principles

- prefer simple solutions over complex automation
- keep the UI modern, intuitive, and fast
- use modern JavaScript tooling
- use Tailwind CSS for styling
- focus on a useful MVP before expanding the feature set

## Current implementation notes

- recipes are stored locally in the browser
- the import flow uses lightweight parsing instead of an external AI service
- the timetable is generated from the entered step durations
- the app is designed as a local-first frontend MVP

## Possible future improvements

- better recipe import accuracy
- optional AI-assisted recipe structuring
- export and backup options
- cloud sync or multi-device support
- notifications and reminders for baking steps