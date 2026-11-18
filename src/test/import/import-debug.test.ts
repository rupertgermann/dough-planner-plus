import { afterEach, expect, it, vi } from "vitest";
import { logRecipeImportError, logRecipeImportEvent } from "../../../server/lib/import-debug";

const context = { requestId: "req-17", mode: "text" } as const;

afterEach(() => vi.restoreAllMocks());

it("correlates events and logs defined metadata without adding a suffix to bare events", () => {
  const info = vi.spyOn(console, "info").mockImplementation(() => {});

  logRecipeImportEvent(context, "received");
  logRecipeImportEvent(context, "skip", { missing: undefined });
  logRecipeImportEvent(context, "parsed", {
    count: 0, warnings: false, name: 'Rye "Tin"', missing: undefined, source: null,
  });

  expect(info.mock.calls).toEqual([
    ["[recipe-import:req-17] received"],
    ["[recipe-import:req-17] skip"],
    ['[recipe-import:req-17] parsed count=0 warnings=false name="Rye \\"Tin\\"" source=null'],
  ]);
});

it("logs the real error and correlation metadata for both Error objects and other rejections", () => {
  const output = vi.spyOn(console, "error").mockImplementation(() => {});
  const error = new TypeError("Draft was invalid");
  error.stack = "TypeError: Draft was invalid\n    at extract";

  logRecipeImportError(context, "failed", error, { attempts: 2, errorName: "ignored" });
  logRecipeImportError(context, "failed", "Canceled");

  expect(output.mock.calls).toEqual([
    ['[recipe-import:req-17] failed attempts=2 errorName="TypeError" errorMessage="Draft was invalid" stack="TypeError: Draft was invalid\\n    at extract"'],
    ['[recipe-import:req-17] failed errorName="UnknownError" errorMessage="Canceled"'],
  ]);
});
