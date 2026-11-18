import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BakeLog } from "@/components/BakeLog";
import { getRecipes } from "@/lib/storage";
import type { Recipe } from "@/types/recipe";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const recipe = {
  id: "test-bake", name: "Test bake", description: "", notes: "", tags: [], bakeLog: [],
  ingredients: [], steps: [], createdAt: "2026-11-01", updatedAt: "2026-11-01",
} satisfies Recipe;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("bread-planner-seeded", "true");
  localStorage.setItem("bread-planner-recipes", JSON.stringify([recipe]));
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function openForm() {
  const view = render(<BakeLog recipe={recipe} onUpdated={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Log a Bake" }));
  return view;
}

function pickRating(label: string, rating: number) {
  const section = screen.getByText(label, { exact: true }).parentElement!;
  // The UI draws each selectable star as an SVG.
  fireEvent.click(section.querySelectorAll("svg")[rating - 1]);
}

it("requires notes, resets a cancelled draft, and saves the selected bake details", () => {
  openForm();
  let notes = screen.getByPlaceholderText(/How did this bake go/);
  let changes = screen.getByPlaceholderText(/Less hydration/);
  fireEvent.change(notes, { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  expect(toast.error).toHaveBeenCalledWith("Please add some notes about your bake");
  expect(getRecipes()[0].bakeLog).toEqual([]);
  fireEvent.change(changes, { target: { value: "Discard this" } });
  pickRating("Crumb", 1);
  pickRating("Oven Spring", 5);
  expect(screen.getByText("Dense / tight")).toBeVisible();
  expect(screen.getByText("Great rise")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  fireEvent.click(screen.getByRole("button", { name: "Log a Bake" }));

  notes = screen.getByPlaceholderText(/How did this bake go/);
  changes = screen.getByPlaceholderText(/Less hydration/);
  expect(notes).toHaveValue("");
  expect(changes).toHaveValue("");
  expect(screen.getByText("Decent")).toBeVisible();
  expect(screen.getByText("Moderate")).toBeVisible();
  pickRating("Overall Rating", 5);
  pickRating("Crumb", 4);
  pickRating("Oven Spring", 2);
  expect(screen.getByText("Open & airy")).toBeVisible();
  expect(screen.getByText("Flat")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Golden" }));
  fireEvent.click(screen.getByRole("button", { name: "Golden" }));
  fireEvent.click(screen.getByRole("button", { name: "Deep golden" }));
  fireEvent.change(notes, { target: { value: "  Strong crust  " } });
  fireEvent.change(changes, { target: { value: "  Shape tighter  " } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));

  expect(getRecipes()[0].bakeLog).toMatchObject([{
    rating: 5, crumbRating: 4, ovenSpring: 2, crustColor: "Deep golden", notes: "Strong crust", changes: "Shape tighter",
  }]);
  expect(screen.getByRole("button", { name: "Log a Bake" })).toBeVisible();
  expect(toast.success).toHaveBeenCalledWith("Bake logged!");

  fireEvent.click(screen.getByRole("button", { name: "Log a Bake" }));
  expect(screen.getByRole("button", { name: "Deep golden", pressed: false })).toBeVisible();
  const crust = screen.getByRole("button", { name: "Dark / caramelised", pressed: false });
  fireEvent.click(crust);
  expect(crust).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(crust);
  expect(crust).toHaveAttribute("aria-pressed", "false");
  fireEvent.change(screen.getByPlaceholderText(/How did this bake go/), { target: { value: "Fresh draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  expect(getRecipes()[0].bakeLog[0]).toMatchObject({
    rating: 4, crumbRating: 3, ovenSpring: 3, notes: "Fresh draft", changes: "",
  });
  expect(getRecipes()[0].bakeLog[0]).not.toHaveProperty("crustColor");
});

it("caps uploads at four, resizes photos, and retains only the photos left in the draft", async () => {
  const ImageConstructor = window.Image;
  const revoke = vi.fn();
  const ObjectURL = URL;
  vi.stubGlobal("URL", class extends ObjectURL {
    static createObjectURL(file: File) { return `blob:${file.name}`; }
    static revokeObjectURL = revoke;
  });
  vi.spyOn(window, "Image").mockImplementation(function () {
    const image = new ImageConstructor();
    Object.defineProperty(image, "src", {
      set: (src: string) => {
        const index = Number(src.slice("blob:".length, -".png".length));
        image.width = index === 0 ? 1600 : 350 + index * 50;
        image.height = index === 0 ? 900 : 200;
        queueMicrotask(() => image.dispatchEvent(new Event(Number.isNaN(index) ? "error" : "load")));
      },
    });
    return image;
  });
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(vi.fn().mockReturnValue({ drawImage }));
  const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(function (this: HTMLCanvasElement) {
    return `data:image/jpeg;base64,${this.width}x${this.height}`;
  });

  const view = openForm();
  const picker = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  expect(picker).not.toBeNull();
  const openPicker = vi.spyOn(picker!, "click");
  fireEvent.click(screen.getByRole("button", { name: "Gallery" }));
  expect(openPicker).toHaveBeenCalledOnce();
  fireEvent.change(picker!, { target: { files: [] } });
  expect(screen.getByText("Photos (0/4)")).toBeVisible();
  fireEvent.change(picker!, { target: { files: [new File(["broken"], "broken.png", { type: "image/png" })] } });
  await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Failed to process image"));
  expect(screen.getByText("Photos (0/4)")).toBeVisible();
  const files = Array.from({ length: 5 }, (_, index) => new File(["fixture"], `${index}.png`, { type: "image/png" }));
  fireEvent.change(picker!, { target: { files } });
  expect(await screen.findByText("Photos (4/4)")).toBeVisible();
  expect(screen.getAllByRole("img", { name: /Bake photo/ })).toHaveLength(4);
  expect(screen.queryByRole("button", { name: "Gallery" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Camera" })).not.toBeInTheDocument();
  expect(drawImage).toHaveBeenCalledTimes(4);
  expect(drawImage).toHaveBeenNthCalledWith(1, expect.anything(), 0, 0, 800, 450);
  expect(drawImage).toHaveBeenNthCalledWith(2, expect.anything(), 0, 0, 400, 200);
  expect(encode).toHaveBeenCalledWith("image/jpeg", 0.8);
  expect(revoke).toHaveBeenCalledTimes(4);
  fireEvent.change(picker!, { target: { files: [files[4]] } });
  expect(toast.error).toHaveBeenCalledWith("Maximum 4 photos per entry");
  expect(drawImage).toHaveBeenCalledTimes(4);

  fireEvent.click(screen.getByRole("button", { name: "Remove photo 2" }));
  expect(screen.getByText("Photos (3/4)")).toBeVisible();
  fireEvent.change(screen.getByPlaceholderText(/How did this bake go/), { target: { value: "Photo record" } });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  const [saved] = getRecipes();
  expect(saved.bakeLog[0].photos).toEqual([
    "data:image/jpeg;base64,800x450", "data:image/jpeg;base64,450x200", "data:image/jpeg;base64,500x200",
  ]);
  view.unmount();

  render(<BakeLog recipe={saved} onUpdated={vi.fn()} />);
  fireEvent.click(screen.getByRole("img", { name: "Bake photo 1" }));
  const preview = screen.getByRole("dialog", { name: "Photo preview" });
  expect(within(preview).getByRole("img", { name: "Bake photo full size" }))
    .toHaveAttribute("src", "data:image/jpeg;base64,800x450");
  fireEvent.click(within(preview).getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("shows historical observations and retains entries when deletion is canceled or storage fails", () => {
  const recent = {
    id: "recent", date: new Date(2026, 10, 12, 12).toISOString(), rating: 5,
    notes: "Open crumb", changes: "Bake longer", crumbRating: 4, ovenSpring: 2, crustColor: "Deep golden",
  };
  const historical = {
    id: "old", date: new Date(2026, 9, 3, 12).toISOString(), rating: 3, notes: "Early attempt", changes: "",
  };
  const logged = { ...recipe, bakeLog: [recent, historical] };
  localStorage.setItem("bread-planner-recipes", JSON.stringify([logged]));
  const onUpdated = vi.fn();
  render(<BakeLog recipe={logged} onUpdated={onUpdated} />);

  for (const label of ["Crumb 4/5", "Spring 2/5", "Crust: Deep golden", "↻ Bake longer"]) {
    expect(screen.getByText(label)).toBeVisible();
  }
  expect(screen.getByText(new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric",
  }).format(new Date(recent.date)))).toBeVisible();
  expect(screen.getAllByText(/Crumb |Spring |Crust:/)).toHaveLength(3);
  expect(screen.getAllByText(/↻/)).toHaveLength(1);

  const [removeRecent] = screen.getAllByRole("button", { name: "Delete bake entry" });
  fireEvent.click(removeRecent);
  let dialog = within(screen.getByRole("alertdialog", { name: "Delete this log entry?" }));
  expect(dialog.getByText("This cannot be undone.")).toBeVisible();
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  expect(getRecipes()[0].bakeLog).toEqual([recent, historical]);
  expect(onUpdated).not.toHaveBeenCalled();

  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new Error("Storage is read-only");
  });
  fireEvent.click(removeRecent);
  dialog = within(screen.getByRole("alertdialog", { name: "Delete this log entry?" }));
  fireEvent.click(dialog.getByRole("button", { name: "Delete" }));
  expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/storage/i));
  expect(screen.getByText("Open crumb")).toBeVisible();
  expect(screen.getByText("Early attempt")).toBeVisible();
  expect(getRecipes()[0].bakeLog).toEqual([recent, historical]);
  expect(onUpdated).not.toHaveBeenCalled();
});

it("keeps a bake draft available when storage is full", () => {
  openForm();
  const notes = screen.getByPlaceholderText(/How did this bake go/);
  fireEvent.change(notes, { target: { value: "Good crumb" } });
  vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  });
  fireEvent.click(screen.getByRole("button", { name: "Save Entry" }));
  expect(toast.error).toHaveBeenCalledWith("Storage full — try removing old photos or entries");
  expect(notes).toHaveValue("Good crumb");
  expect(getRecipes()[0].bakeLog).toEqual([]);
});

it("reports camera denial, captures a frame, and releases the camera on close and unmount", async () => {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] };
  const getUserMedia = vi.fn().mockRejectedValueOnce(new Error("Permission denied")).mockResolvedValue(stream);
  const previous = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  const drawImage = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(vi.fn().mockReturnValue({ drawImage }));
  const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,ZnJhbWU=");

  try {
    const form = openForm();
    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not access camera — check browser permissions"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    const dialog = await screen.findByRole("dialog", { name: "Take a Photo" });
    const video = dialog.querySelector("video")!;
    await vi.waitFor(() => expect(video.srcObject).toBe(stream));
    expect(getUserMedia).toHaveBeenLastCalledWith({ video: { facingMode: "environment", width: { ideal: 1280 } } });
    Object.defineProperties(video, { videoWidth: { value: 640 }, videoHeight: { value: 480 } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Capture" }));
    expect(drawImage).toHaveBeenCalledExactlyOnceWith(video, 0, 0);
    expect(encode).toHaveBeenCalledExactlyOnceWith("image/jpeg", 0.8);
    expect(encode.mock.instances[0]).toMatchObject({ width: 640, height: 480 });
    expect(stop).toHaveBeenCalledOnce();
    expect(screen.getByRole("img", { name: "Bake photo 1" })).toHaveAttribute("src", "data:image/jpeg;base64,ZnJhbWU=");

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    const reopened = await screen.findByRole("dialog", { name: "Take a Photo" });
    fireEvent.click(within(reopened).getByRole("button", { name: "Close" }));
    expect(stop).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Camera" }));
    expect(await screen.findByRole("dialog", { name: "Take a Photo" })).toBeVisible();
    form.unmount();
    expect(stop).toHaveBeenCalledTimes(3);
  } finally {
    if (previous) Object.defineProperty(navigator, "mediaDevices", previous);
    else Reflect.deleteProperty(navigator, "mediaDevices");
  }
});
