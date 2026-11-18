// @vitest-environment node

import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { createServer, type ViteDevServer } from "vite";
import { recipeImportDevPlugin } from "../../../server/vite-recipe-import-plugin";

const { parseRecipeWithAI } = vi.hoisted(() => ({
  parseRecipeWithAI: vi.fn<typeof import("../../../server/lib/parse-recipe-with-ai").parseRecipeWithAI>(),
}));
vi.mock("../../../server/lib/parse-recipe-with-ai", () => ({ parseRecipeWithAI }));

let server: ViteDevServer;
beforeAll(async () => {
  server = await createServer({
    configFile: false, envFile: false, appType: "custom", logLevel: "silent",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    plugins: [recipeImportDevPlugin()],
  });
});
beforeEach(() => parseRecipeWithAI.mockReset());
afterAll(async () => { await server?.close(); });

function request(method: string, path: string, chunks: string[], decode = false) {
  const req = new IncomingMessage(new Socket());
  req.method = method;
  req.url = path;
  if (decode) req.setEncoding("utf8");
  for (const chunk of chunks) req.push(Buffer.from(chunk));
  req.push(null);
  const res = new ServerResponse(req);
  const end = vi.spyOn(res, "end").mockReturnValue(res);
  const next = vi.fn();
  server.middlewares(req, res, next);
  return { res, end, next };
}

it("assembles the import request stream and returns the JSON draft on the development route", async () => {
  parseRecipeWithAI.mockResolvedValue({
    name: "Local loaf", description: "", notes: "", tags: [], warnings: [],
    ingredients: [{ name: "Flour", amount: "500", unit: "g" }],
    steps: [{ name: "Mix", durationMinutes: 5, instructions: "Mix gently" }],
  });
  const { res, end, next } = request("POST", "/api/recipe-import", ['{"mode":"text","text":"Local ', 'loaf"}'], true);
  await vi.waitFor(() => expect(end).toHaveBeenCalledOnce());
  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(200);
  expect(res.getHeader("Content-Type")).toBe("application/json");
  expect(JSON.parse(String(end.mock.calls[0][0]))).toMatchObject({ source: "ai", recipe: { name: "Local loaf" } });
  expect(parseRecipeWithAI).toHaveBeenCalledExactlyOnceWith("Local loaf", expect.objectContaining({ mode: "text" }));
});

it.each([
  { name: "empty body", chunks: [] },
  { name: "blank recipe text", chunks: ['{"mode":"text","text":" "}'] },
])("returns an import error for $name", async ({ chunks }) => {
  const { res, end, next } = request("POST", "/api/recipe-import", chunks);
  await vi.waitFor(() => expect(end).toHaveBeenCalledOnce());
  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(400);
  expect(res.getHeader("Content-Type")).toBe("application/json");
  expect(JSON.parse(String(end.mock.calls[0][0]))).toEqual({ error: "Invalid recipe import request." });
  expect(parseRecipeWithAI).not.toHaveBeenCalled();
});

it.each([["DELETE", "/api/recipe-import"], ["POST", "/unrelated"]])("passes %s %s to other middleware", async (method, path) => {
  const { end, next } = request(method, path, []);
  await vi.waitFor(() => expect(next).toHaveBeenCalledOnce());
  expect(end).not.toHaveBeenCalled();
  expect(parseRecipeWithAI).not.toHaveBeenCalled();
});
