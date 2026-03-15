export interface RecipeImportDebugContext {
  requestId: string;
  mode: "text" | "url";
}

function formatDetails(details: Record<string, unknown>): string {
  const entries = Object.entries(details).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(" ");
}

export function logRecipeImportEvent(
  context: RecipeImportDebugContext,
  event: string,
  details: Record<string, unknown> = {},
): void {
  const suffix = formatDetails(details);
  const line = `[recipe-import:${context.requestId}] ${event}${suffix ? ` ${suffix}` : ""}`;
  console.info(line);
}

export function logRecipeImportError(
  context: RecipeImportDebugContext,
  event: string,
  error: unknown,
  details: Record<string, unknown> = {},
): void {
  const errorDetails =
    error instanceof Error
      ? {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        }
      : {
          errorName: "UnknownError",
          errorMessage: String(error),
        };

  const suffix = formatDetails({
    ...details,
    ...errorDetails,
  });

  console.error(`[recipe-import:${context.requestId}] ${event}${suffix ? ` ${suffix}` : ""}`);
}
