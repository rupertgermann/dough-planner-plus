import fs from "node:fs";
import path from "node:path";

const ENV_LINE_PATTERN =
  /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"((?:\\.|[^"])*)"|'((?:\\.|[^'])*)'|([^#\n]*))?\s*$/;

let cachedEnvFiles: Record<string, string> | null = null;

function decodeEnvValue(value: string): string {
  return value
    .trim()
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\"/g, "\"")
    .replace(/\\'/g, "'");
}

function parseEnvFile(contents: string): Record<string, string> {
  const parsed: Record<string, string> = {};

  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(ENV_LINE_PATTERN);
    if (!match) continue;

    const [, key, doubleQuoted, singleQuoted, bareValue] = match;
    const rawValue = doubleQuoted ?? singleQuoted ?? bareValue ?? "";
    parsed[key] = decodeEnvValue(rawValue);
  }

  return parsed;
}

function loadEnvFiles(): Record<string, string> {
  if (cachedEnvFiles) {
    return cachedEnvFiles;
  }

  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV;
  const candidates = [
    ".env",
    ".env.local",
    nodeEnv ? `.env.${nodeEnv}` : "",
    nodeEnv ? `.env.${nodeEnv}.local` : "",
  ].filter(Boolean);

  const loaded: Record<string, string> = {};

  for (const filename of candidates) {
    const absolutePath = path.join(cwd, filename);
    if (!fs.existsSync(absolutePath)) continue;

    const contents = fs.readFileSync(absolutePath, "utf8");
    Object.assign(loaded, parseEnvFile(contents));
  }

  cachedEnvFiles = loaded;
  return loaded;
}

export function getServerEnv(name: string): string | undefined {
  const processValue = process.env[name];
  if (processValue) {
    return processValue;
  }

  return loadEnvFiles()[name];
}

export function resetServerEnvCacheForTests(): void {
  cachedEnvFiles = null;
}
