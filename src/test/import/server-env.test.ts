import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("layers local and mode-specific files and decodes quoted values", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dough-planner-env-layers-"));
    vi.stubEnv("NODE_ENV", "test");
    try {
      fs.writeFileSync(path.join(tempDir, ".env"), [
        "DOUGH_FIRST=base", "DOUGH_SECOND=base", "DOUGH_THIRD=base", "DOUGH_FOURTH=base",
        String.raw`DOUGH_NOTES="line one\nline two\r\"quoted\""`,
        String.raw`DOUGH_SINGLE='baker\'s loaf #1'`,
        "# DOUGH_COMMENT=ignored", "DOUGH-INVALID=ignored",
      ].join("\r\n"));
      fs.writeFileSync(path.join(tempDir, ".env.local"), "DOUGH_SECOND=local\nDOUGH_THIRD=local\nDOUGH_FOURTH=local\n");
      fs.writeFileSync(path.join(tempDir, ".env.test"), "DOUGH_THIRD=mode\nDOUGH_FOURTH=mode\n");
      fs.writeFileSync(path.join(tempDir, ".env.test.local"), "DOUGH_FOURTH=mode-local\n");
      fs.writeFileSync(path.join(tempDir, ".env.production"), "DOUGH_FIRST=wrong-mode\n");
      process.chdir(tempDir);
      resetServerEnvCacheForTests();

      expect(getServerEnv("DOUGH_FIRST")).toBe("base");
      expect(getServerEnv("DOUGH_SECOND")).toBe("local");
      expect(getServerEnv("DOUGH_THIRD")).toBe("mode");
      expect(getServerEnv("DOUGH_FOURTH")).toBe("mode-local");
      expect(getServerEnv("DOUGH_NOTES")).toBe('line one\nline two\r"quoted"');
      expect(getServerEnv("DOUGH_SINGLE")).toBe("baker's loaf #1");
      expect(getServerEnv("DOUGH_COMMENT")).toBeUndefined();
      expect(getServerEnv("DOUGH-INVALID")).toBeUndefined();

      fs.writeFileSync(path.join(tempDir, ".env.test.local"), "DOUGH_FOURTH=new-value\n");
      expect(getServerEnv("DOUGH_FOURTH")).toBe("mode-local");
      resetServerEnvCacheForTests();
      expect(getServerEnv("DOUGH_FOURTH")).toBe("new-value");
    } finally {
      process.chdir(originalCwd);
      vi.unstubAllEnvs();
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
