export class RecipeImportError extends Error {
  statusCode: number;
  allowQuickParseFallback: boolean;

  constructor(
    message: string,
    statusCode = 500,
    options: { allowQuickParseFallback?: boolean } = {},
  ) {
    super(message);
    this.name = "RecipeImportError";
    this.statusCode = statusCode;
    this.allowQuickParseFallback = options.allowQuickParseFallback ?? false;
  }
}

export function getRecipeImportErrorDetails(error: unknown): {
  statusCode: number;
  message: string;
} {
  if (error instanceof RecipeImportError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      statusCode: 500,
      message: error.message || "Recipe import failed",
    };
  }

  return {
    statusCode: 500,
    message: "Recipe import failed",
  };
}
