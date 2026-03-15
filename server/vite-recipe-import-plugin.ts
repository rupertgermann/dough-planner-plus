import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { importRecipeFromUnknown, serializeRecipeImportError } from "./lib/import-recipe";

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function recipeImportDevPlugin(): Plugin {
  return {
    name: "recipe-import-dev-plugin",
    configureServer(server) {
      server.middlewares.use("/api/recipe-import", async (req, res, next) => {
        if (req.method !== "POST") {
          next();
          return;
        }

        await handleRecipeImportMiddleware(req, res);
      });
    },
  };
}

async function handleRecipeImportMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const rawBody = await readRequestBody(req);
    const body = rawBody ? JSON.parse(rawBody) : {};
    const result = await importRecipeFromUnknown(body);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (error) {
    const { statusCode, body } = serializeRecipeImportError(error);

    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(body));
  }
}
