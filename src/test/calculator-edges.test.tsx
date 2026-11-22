import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { BatchCost } from "@/components/BatchCost";
import { DDTCalculator } from "@/components/DDTCalculator";

beforeEach(() => localStorage.clear());

it("allows a manual levain override and flags only water temperatures outside the practical range", () => {
  render(<DDTCalculator />);
  const preferment = screen.getByRole("checkbox", { name: "Uses preferment / levain" });
  expect(preferment).not.toBeChecked();
  expect(screen.queryByText("Levain (°C)")).not.toBeInTheDocument();
  expect(screen.getByText("26.0°C")).toBeVisible();
  fireEvent.click(preferment);
  expect(preferment).toBeChecked();
  expect(screen.getByText(/Water = DDT×4/)).toBeVisible();

  const setTemperature = (label: string, value: string) => {
    fireEvent.change(within(screen.getByText(`${label} (°C)`).parentElement!).getByRole("spinbutton"), { target: { value } });
  };
  setTemperature("Room", "19");
  setTemperature("Flour", "21");
  setTemperature("Levain", "17");
  setTemperature("Friction", "3");
  expect(screen.getByText("36.0°C")).toBeVisible();

  const warning = /out of practical range/;
  for (const [target, water, flagged] of [
    ["30", "60.0°C", true], ["27.5", "50.0°C", false],
    ["12", "-12.0°C", true], ["15", "0.0°C", false],
  ] as const) {
    setTemperature("Target DDT", target);
    expect(screen.getByText(water)).toBeVisible();
    if (flagged) expect(screen.getByText(warning)).toBeVisible();
    else expect(screen.queryByText(warning)).not.toBeInTheDocument();
  }
  setTemperature("Target DDT", "25");
  fireEvent.click(preferment);
  expect(screen.queryByText("Levain (°C)")).not.toBeInTheDocument();
  expect(screen.getByText(/Water = DDT×3/)).toBeVisible();
  expect(screen.getByText("32.0°C")).toBeVisible();
});

it.each(["Sourdough", "Starter", "Preferment", "Pre-ferment", "Poolish", "Biga", "Sponge"])(
  "recognizes %s as a preferment in the recipe",
  (name) => {
    render(<DDTCalculator ingredients={[{ id: "preferment", name, amount: "100", unit: "g" }]} />);
    expect(screen.getByRole("checkbox", { name: "Uses preferment / levain" })).toBeChecked();
    expect(screen.getByText("28.0°C")).toBeVisible();
  },
);

it("recovers from damaged prices and remembers independent ingredient costs across batches", () => {
  localStorage.setItem("bread-planner-ingredient-costs", "{damaged");
  const ingredients = [
    { id: "f", name: "Bread flour", amount: "500", unit: "g" },
    { id: "s", name: "Salt", amount: "10", unit: "g" },
    { id: "c", name: "Caraway", amount: "to taste", unit: "" },
  ];
  const open = (scale: number) => render(<BatchCost ingredients={ingredients} recipeId="loaf" scale={scale} />);
  const initial = open(1);
  expect(screen.queryByText("Total cost")).not.toBeInTheDocument();
  const row = (name: string) => within(screen.getByText(name, { exact: true }).parentElement!);
  const price = (name: string) => row(name).getByRole("spinbutton");
  fireEvent.change(price("Bread flour"), { target: { value: "0.004" } });
  fireEvent.change(price("Salt"), { target: { value: "0.03" } });
  fireEvent.change(price("Caraway"), { target: { value: "0.50" } });
  expect(screen.getByText("2.30")).toBeVisible();
  initial.unmount();

  open(2);
  expect(screen.getByText("(2×)")).toBeVisible();
  expect(price("Bread flour")).toHaveValue(0.004);
  expect(price("Salt")).toHaveValue(0.03);
  expect(row("Bread flour").getByText("4.00")).toBeVisible();
  expect(row("Salt").getByText("0.60")).toBeVisible();
  expect(row("Caraway").getByText("—")).toBeVisible();
  expect(screen.getByText("4.60")).toBeVisible();

  fireEvent.change(price("Bread flour"), { target: { value: "" } });
  expect(row("Bread flour").getByText("—")).toBeVisible();
  expect(within(screen.getByText("Total cost").parentElement!).getByText("0.60")).toBeVisible();
  fireEvent.change(price("Salt"), { target: { value: "0" } });
  fireEvent.change(price("Caraway"), { target: { value: "" } });
  expect(screen.queryByText("Total cost")).not.toBeInTheDocument();
});
