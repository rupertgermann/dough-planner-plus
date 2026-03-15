import { importRecipeFromUnknown, serializeRecipeImportError } from "../server/lib/import-recipe";

async function readBody(req: {
  body?: unknown;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
}): Promise<string> {
  if (typeof req.body === "string") {
    return req.body;
  }

  if (req.body && typeof req.body === "object") {
    return JSON.stringify(req.body);
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk as ArrayBuffer));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export default async function handler(
  req: {
    method?: string;
    body?: unknown;
    on: (event: string, listener: (...args: unknown[]) => void) => void;
  },
  res: {
    statusCode: number;
    setHeader: (name: string, value: string) => void;
    end: (body: string) => void;
  },
) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Allow", "POST");
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const rawBody = await readBody(req);
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
