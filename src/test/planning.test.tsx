import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import RecipeDetail from "@/pages/RecipeDetail";
import TimetableView from "@/pages/TimetableView";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const recipe = {
  id: "test", name: "Test loaf", description: "", notes: "", tags: [], bakeLog: [],
  ingredients: [
    { id: "i1", name: "Yeast", amount: "1.5", unit: "g" },
    { id: "i2", name: "Salt", amount: "0.04", unit: "g" },
    { id: "i3", name: "Seeds", amount: "to taste", unit: "" },
  ],
  steps: [{ id: "s1", name: "Rest", durationMinutes: 1, instructions: "Rest dough" }],
  createdAt: "2026-10-24T00:00:00Z", updatedAt: "2026-10-24T00:00:00Z",
};

function show(view: "detail" | "timetable") {
  return render(
    <StrictMode><TooltipProvider><MemoryRouter initialEntries={["/test"]}>
      <Routes><Route path="/:id" element={view === "detail" ? <RecipeDetail /> : <TimetableView />} /></Routes>
    </MemoryRouter></TooltipProvider></StrictMode>,
  );
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bread-planner-seeded", "true");
  localStorage.setItem("bread-planner-recipes", JSON.stringify([recipe]));
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 24, 20, 30));
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe.each(["detail", "timetable"] as const)("%s scheduling", (view) => {
  it.each([
    [20, 30, "2026-10-25", "02:30"],
    [0, 30, "2026-10-24", "06:30"],
  ])("keeps the default date and time together at %s:%s", (hours, minutes, date, time) => {
    vi.setSystemTime(new Date(2026, 9, 24, hours, minutes));
    const { container } = show(view);
    expect(container.querySelector('input[type="date"]')).toHaveValue(date);
    expect(container.querySelector('input[type="time"]')).toHaveValue(time);
  });

  it("uses the selected local calendar date and subtracts the step duration", () => {
    vi.spyOn(Date.prototype, "toLocaleTimeString").mockImplementation(function (this: Date) {
      return `${this.getFullYear()}-${this.getMonth() + 1}-${this.getDate()} ${this.getHours()}:${this.getMinutes()}`;
    });
    const { container } = show(view);
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2026-10-24" } });
    fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: "12:00" } });
    expect(screen.getAllByText("2026-10-24 11:59").length).toBeGreaterThan(0);
  });
});

it("preserves decimal quantities for display and print and scales small amounts", () => {
  show("detail");
  expect(screen.getByText("1.5 g")).toBeVisible();
  expect(screen.getByText("0.04 g")).toBeVisible();
  expect(screen.getByText("to taste")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "0.5×" }));
  expect(screen.getByText("0.75 g")).toBeVisible();
  expect(screen.getByText("0.02 g")).toBeVisible();
  expect(screen.getByText("to taste")).toBeVisible();
});

it("tracks elapsed time through delayed callbacks, pause, resume and reset", () => {
  show("timetable");
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  const start = Date.now();
  vi.setSystemTime(start + 29_000);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("0:30")).toBeVisible();
  vi.setSystemTime(start + 30_500);
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  vi.setSystemTime(start + 600_000);
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("0:29")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.getByText("1:00")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  vi.setSystemTime(Date.now() + 120_000);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.getByText("✓ Done")).toBeVisible();
  expect(toast.success).toHaveBeenCalledTimes(1);
  act(() => vi.advanceTimersByTime(5000));
  expect(toast.success).toHaveBeenCalledTimes(1);
});

it("announces completion once when several overdue ticks occur before a render", () => {
  show("timetable");
  fireEvent.click(screen.getByRole("button", { name: "Start" }));
  act(() => vi.advanceTimersByTime(65_000));
  expect(screen.getByText("✓ Done")).toBeVisible();
  expect(toast.success).toHaveBeenCalledTimes(1);
});
