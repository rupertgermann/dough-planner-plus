import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ExportImportDialog } from "@/components/ExportImportDialog";
import { getRecipes } from "@/lib/storage";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function openBackup() {
  const onImported = vi.fn();
  render(<ExportImportDialog onImported={onImported} />);
  fireEvent.click(screen.getByRole("button", { name: "Backup" }));
  return onImported;
}

it("downloads a dated JSON backup containing the entire current library", async () => {
  const library = getRecipes();
  vi.setSystemTime(new Date("2026-11-17T09:00:00.000Z"));
  const objectUrl = "blob:recipe-backup";
  const create = vi.fn<(blob: Blob) => string>().mockReturnValue(objectUrl);
  const revoke = vi.fn();
  const OriginalURL = URL;
  vi.stubGlobal("URL", class extends OriginalURL {
    static createObjectURL = create;
    static revokeObjectURL = revoke;
  });
  const downloads: { url: string; file: string }[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ url: this.href, file: this.download });
  });

  openBackup();
  fireEvent.click(screen.getByRole("button", { name: "Export All Recipes" }));

  expect(downloads).toEqual([{ url: objectUrl, file: "bread-planner-recipes-2026-11-17.json" }]);
  expect(create).toHaveBeenCalledOnce();
  const blob = create.mock.calls[0][0];
  expect(blob.type).toBe("application/json");
  const contents = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
  expect(JSON.parse(contents)).toEqual(library);
  expect(revoke).toHaveBeenCalledExactlyOnceWith(objectUrl);
  expect(toast.success).toHaveBeenCalledWith("Recipes exported!");
});

it("keeps the restore dialog open and preserves recipes after an invalid file", async () => {
  const library = getRecipes();
  const onImported = openBackup();
  const picker = screen.getByRole("dialog").querySelector<HTMLInputElement>('input[type="file"]')!;
  const click = vi.spyOn(picker, "click");
  fireEvent.click(screen.getByRole("button", { name: "Import from JSON" }));
  expect(click).toHaveBeenCalledOnce();
  fireEvent.change(picker, { target: { files: [new File(['{"not":"a recipe list"}'], "broken.json", { type: "application/json" })] } });

  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Invalid JSON file — please check the format"));
  expect(screen.getByRole("dialog", { name: "Backup & Restore" })).toBeVisible();
  expect(onImported).not.toHaveBeenCalled();
  expect(getRecipes()).toEqual(library);
});
