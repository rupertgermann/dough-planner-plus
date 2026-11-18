import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import RecipeDetail from "@/pages/RecipeDetail";
import RecipeEditor from "@/pages/RecipeEditor";
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

function show(view: "detail" | "timetable", path = "/test") {
  return render(
    <StrictMode><TooltipProvider><MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<h1>Recipe library</h1>} />
        <Route path="/:id" element={view === "detail" ? <RecipeDetail /> : <TimetableView />} />
      </Routes>
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

it.each(["detail", "timetable"] as const)("schedules three steps in order across midnight in %s", (view) => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{
    ...recipe,
    steps: [
      { id: "mix", name: "Mix dough", durationMinutes: 95, instructions: "Mix until smooth" },
      { id: "bulk", name: "Bulk ferment", durationMinutes: 47, instructions: "Let the dough rise" },
      { id: "bake", name: "Bake loaf", durationMinutes: 11, instructions: "Bake until golden" },
    ],
  }]));
  vi.spyOn(Date.prototype, "toLocaleTimeString").mockImplementation(function (this: Date) {
    const [month, day, hour, minute] = [this.getMonth() + 1, this.getDate(), this.getHours(), this.getMinutes()]
      .map((part) => String(part).padStart(2, "0"));
    return `${this.getFullYear()}-${month}-${day} ${hour}:${minute}`;
  });

  const { container } = show(view);
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2026-11-18" } });
  fireEvent.change(container.querySelector('input[type="time"]')!, { target: { value: "00:20" } });

  const labels = screen.getAllByText(/^(?:\d{4}-\d{2}-\d{2} \d{2}:\d{2}|Mix dough|Bulk ferment|Bake loaf)$/);
  for (const label of labels) expect(label).toBeVisible();
  expect(labels.map((label) => label.textContent)).toEqual([
    "2026-11-17 21:47", // Start-at summary
    "2026-11-17 21:47", "Mix dough",
    "2026-11-17 23:22", "Bulk ferment",
    "2026-11-18 00:09", "Bake loaf",
  ]);
  if (view === "detail") {
    expect(screen.getByText("Ready: 2026-11-18 at 00:20 • Start at 2026-11-17 21:47")).toBeInTheDocument();
  }
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

it("calculates the water temperature without levain", () => {
  show("detail");
  expect(screen.getByRole("checkbox", { name: "Uses preferment / levain" })).not.toBeChecked();
  const target = within(screen.getByText("Target DDT (°C)").parentElement!).getByRole("spinbutton");
  fireEvent.change(target, { target: { value: "25.5" } });
  expect(screen.getByText("30.5°C")).toBeVisible();
});

it("includes the levain temperature when the recipe contains levain", () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{
    ...recipe,
    ingredients: [...recipe.ingredients, { id: "levain", name: "Rye Levain", amount: "100", unit: "g" }],
  }]));

  show("detail");
  expect(screen.getByRole("checkbox", { name: "Uses preferment / levain" })).toBeChecked();
  const levain = within(screen.getByText("Levain (°C)").parentElement!).getByRole("spinbutton");
  fireEvent.change(levain, { target: { value: "18.5" } });
  expect(screen.getByText("31.5°C")).toBeVisible();
});

const mixedFlourIngredients = [
  { id: "wheat", name: "Bread Flour", amount: "350", unit: "g" },
  { id: "rye", name: "Roggenmehl", amount: "150", unit: "g" },
  { id: "water", name: "Water", amount: "300", unit: "g" },
  { id: "milk", name: "Milk", amount: "50", unit: "g" },
  ...recipe.ingredients,
];

it("displays hydration from both flours and liquids at either batch size", () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{ ...recipe, ingredients: mixedFlourIngredients }]));
  show("detail");
  const summary = within(screen.getByText("7 ingredients").parentElement!);
  expect(summary.getByText("70.0%")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "0.5×" }));
  expect(summary.getByText("70.0%")).toBeVisible();
});

it("calculates baker's percentages using both flours and keeps them after saving", () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{ ...recipe, ingredients: mixedFlourIngredients }]));
  const openEditor = () => render(
    <TooltipProvider><MemoryRouter initialEntries={["/recipe/test"]}>
      <Routes>
        <Route path="/recipe/:id" element={<RecipeEditor />} />
        <Route path="/view/:id" element={<h1>Saved recipe</h1>} />
      </Routes>
    </MemoryRouter></TooltipProvider>,
  );
  const percentages = () => screen.getAllByPlaceholderText("%").map((input) => input.getAttribute("value"));
  const editor = openEditor();
  fireEvent.click(screen.getByRole("button", { name: "Calc %" }));
  expect(percentages()).toEqual(["70.0", "30.0", "60.0", "10.0", "0.3", "0.0", ""]);
  fireEvent.click(screen.getByRole("button", { name: "Save Recipe" }));
  expect(screen.getByRole("heading", { name: "Saved recipe" })).toBeVisible();
  editor.unmount();

  openEditor();
  expect(percentages()).toEqual(["70.0", "30.0", "60.0", "10.0", "0.3", "0.0", ""]);
});

it("updates the total cost when the batch is scaled", () => {
  show("detail");
  const [yeastCost, saltCost] = screen.getAllByPlaceholderText("0.00");
  fireEvent.change(yeastCost, { target: { value: "0.8" } });
  fireEvent.change(saltCost, { target: { value: "3" } });
  expect(within(screen.getByText("Total cost").parentElement!).getByText("1.32")).toBeVisible();

  fireEvent.click(screen.getByRole("button", { name: "0.5×" }));
  expect(within(screen.getByText("Total cost").parentElement!).getByText("0.66")).toBeVisible();
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

it("requests notification permission and completes two independent timers", async () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{
    ...recipe,
    steps: [...recipe.steps, { id: "proof", name: "Proof", durationMinutes: 61, instructions: "Wait until airy" }],
  }]));
  const notifications = Object.assign(vi.fn(function () {}), {
    permission: "default",
    requestPermission: vi.fn().mockResolvedValueOnce("denied").mockImplementation(async () => {
      notifications.permission = "granted";
      return "granted";
    }),
  });
  vi.stubGlobal("Notification", notifications);

  try {
    show("timetable");
    const enable = screen.getByRole("button", { name: /Enable Notifications/ });
    await act(async () => fireEvent.click(enable));
    expect(toast.error).toHaveBeenCalledWith("Notification permission denied");
    expect(enable).toBeVisible();
    await act(async () => fireEvent.click(enable));
    expect(screen.getByText("On", { exact: true })).toBeVisible();
    expect(toast.success).toHaveBeenCalledWith("Notifications enabled!");
    expect(screen.queryByRole("button", { name: /Enable Notifications/ })).not.toBeInTheDocument();

    const [startRest, startProof] = screen.getAllByRole("button", { name: "Start" });
    fireEvent.click(startRest);
    fireEvent.click(startProof);
    expect(screen.getByText("1:01:00")).toBeVisible();
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getAllByText("✓ Done")).toHaveLength(1);
    expect(screen.getByText("1:00:00")).toBeVisible();
    expect(notifications).toHaveBeenCalledExactlyOnceWith("🍞 Step Complete!", {
      body: '"Rest" is done. Time for the next step!', icon: "/favicon.ico",
    });

    notifications.permission = "denied";
    vi.setSystemTime(Date.now() + 3_599_000);
    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getAllByText("✓ Done")).toHaveLength(2);
    expect(notifications).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledWith('"Proof" timer finished!');
  } finally {
    vi.unstubAllGlobals();
  }
});

it("offers a way to add steps when the timetable is empty", () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{ ...recipe, steps: [] }]));
  show("timetable");
  expect(screen.getByText("No steps defined yet.")).toBeVisible();
  expect(screen.getByRole("link", { name: /Add baking steps/ })).toHaveAttribute("href", "/recipe/test");
  expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
});

it("redirects a missing timetable to the recipe library", () => {
  show("timetable", "/missing");
  expect(screen.getByRole("heading", { name: "Recipe library" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
});

it("formats long countdowns and can restart a finished step without browser notifications", () => {
  localStorage.setItem("bread-planner-recipes", JSON.stringify([{
    ...recipe,
    steps: [
      { id: "proof", name: "Proof", durationMinutes: 65, instructions: "Wait until airy" },
      { id: "bake", name: "Bake", durationMinutes: 60, instructions: "" },
    ],
  }]));
  show("timetable");
  expect(screen.getByText("1h 5m")).toBeVisible();
  expect(screen.getByText("1h")).toBeVisible();
  expect(screen.getByText("Wait until airy")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Enable Notifications/ })).not.toBeInTheDocument();

  const [startProof] = screen.getAllByRole("button", { name: "Start" });
  const startedAt = Date.now();
  fireEvent.click(startProof);
  expect(screen.getByText("1:05:00")).toBeVisible();
  act(() => vi.advanceTimersByTime(1_000));
  expect(screen.getByText("1:04:59")).toBeVisible();

  vi.setSystemTime(startedAt + 65 * 60_000 - 2_000);
  act(() => vi.advanceTimersByTime(1_000));
  expect(screen.queryByText("✓ Done")).not.toBeInTheDocument();
  expect(screen.getByText("0:01")).toBeVisible();
  act(() => vi.advanceTimersByTime(1_000));
  expect(screen.getByText("✓ Done")).toBeVisible();
  expect(toast.success).toHaveBeenCalledExactlyOnceWith('"Proof" timer finished!');
  expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Resume" })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(screen.queryByText("✓ Done")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Resume" }));
  expect(screen.getByText("1:05:00")).toBeVisible();
});
