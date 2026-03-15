import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getServerEnv, resetServerEnvCacheForTests } from "../../../server/lib/server-env";

const originalCwd = process.cwd();
const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  process.chdir(originalCwd);
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
  resetServerEnvCacheForTests();
});

describe("getServerEnv", () => {
  it("loads server-only env values from .env files when process.env is unset", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dough-planner-env-"));
    fs.writeFileSync(
      path.join(tempDir, ".env"),
      "OPENAI_API_KEY=from-dot-env\nOPENAI_RECIPE_IMPORT_MODEL=gpt-4.1-mini\n",
      "utf8",
    );

    delete process.env.OPENAI_API_KEY;
    process.chdir(tempDir);
    resetServerEnvCacheForTests();

    expect(getServerEnv("OPENAI_API_KEY")).toBe("from-dot-env");
    expect(getServerEnv("OPENAI_RECIPE_IMPORT_MODEL")).toBe("gpt-4.1-mini");
  });

  it("prefers process.env values over .env file values", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dough-planner-env-"));
    fs.writeFileSync(path.join(tempDir, ".env"), "OPENAI_API_KEY=from-dot-env\n", "utf8");

    process.env.OPENAI_API_KEY = "from-process-env";
    process.chdir(tempDir);
    resetServerEnvCacheForTests();

    expect(getServerEnv("OPENAI_API_KEY")).toBe("from-process-env");
  });
});
