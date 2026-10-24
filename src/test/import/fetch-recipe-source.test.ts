import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { gzipSync, deflateSync, brotliCompressSync } from "node:zlib";
import type { RequestOptions } from "node:http";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRecipeSource } from "../../../server/lib/fetch-recipe-source";
import { importRecipeFromUnknown } from "../../../server/lib/import-recipe";
import { extractJsonLdRecipe } from "../../../server/lib/extract-jsonld-recipe";

const fixtures = vi.hoisted(() => ({
  addresses: ["93.184.216.34"],
  dnsCalls: 0,
  rebind: false,
  hang: false,
  responses: [] as { status: number; location?: string; body?: string | Buffer; encoding?: string }[],
  connections: [] as string[],
}));
vi.mock("node:dns", async original => {
  const actual = await original<typeof import("node:dns")>();
  const lookup = (_host: string, _options: unknown, callback: (error: null, addresses: { address: string; family: number }[]) => void) => {
    fixtures.dnsCalls++;
    callback(null, fixtures.addresses.map(address => ({ address, family: address.includes(":") ? 6 : 4 })));
    if (fixtures.rebind) fixtures.addresses = ["127.0.0.1"];
  };
  return { ...actual, lookup, default: { ...actual, lookup } };
});
vi.mock("node:http", async (original) => {
  const actual = await original<typeof import("node:http")>();
  return { ...actual, get: transport, default: { ...actual, get: transport } };
});
vi.mock("node:https", async (original) => {
  const actual = await original<typeof import("node:https")>();
  return { ...actual, get: transport, default: { ...actual, get: transport } };
});

function transport(url: URL, options: RequestOptions, callback: (response: Readable & { statusCode: number; headers: { location?: string; "content-type": string } }) => void) {
  const request = new EventEmitter();
  options.signal?.addEventListener("abort", () => request.emit("error", new Error("aborted")), { once: true });
  queueMicrotask(() => {
    if (fixtures.hang) return;
    options.lookup?.(url.hostname, {}, (error, address) => {
      if (error) return request.emit("error", error);
      fixtures.connections.push(String(address));
      const fixture = fixtures.responses.shift() ?? { status: 200, body: "Recipe" };
      const response = Object.assign(Readable.from([fixture.body ?? ""]), {
        statusCode: fixture.status,
        headers: { location: fixture.location, "content-type": "text/html", "content-encoding": fixture.encoding },
      });
      callback(response);
    });
  });
  return request;
}

beforeEach(() => {
  fixtures.addresses = ["93.184.216.34"];
  fixtures.responses = [];
  fixtures.dnsCalls = 0;
  fixtures.rebind = false;
  fixtures.hang = false;
  vi.restoreAllMocks();
  fixtures.connections = [];
});

describe("public recipe URL boundary", () => {
  it.each([
    ["gzip", gzipSync], ["deflate", deflateSync], ["br", brotliCompressSync],
  ] as const)("decodes %s HTML before extracting JSON-LD", async (encoding, compress) => {
    const html = '<script type="application/ld+json">{"@type":"Recipe","name":"Crusty café loaf","recipeIngredient":["500 g flour"],"recipeInstructions":["Mix - 10 min"]}</script>';
    fixtures.responses = [{ status: 200, encoding, body: compress(Buffer.from(html)) }];
    const result = await fetchRecipeSource("https://recipes.example/bread");
    expect(result.html).toBe(html);
    expect(extractJsonLdRecipe(result.html)?.name).toBe("Crusty café loaf");
  });

  it.each(["gzip", "unsupported"])("returns a controlled error for an unreadable %s response", async (encoding) => {
    fixtures.responses = [{ status: 200, encoding, body: "not compressed HTML" }];
    await expect(fetchRecipeSource("https://recipes.example/bread")).rejects.toMatchObject({ statusCode: 502 });
  });

  it.each([
    "127.0.0.1", "2130706433", "0x7f000001", "0177.0.0.1", "10.0.0.1",
    "169.254.169.254", "192.168.1.1", "172.16.0.1", "100.64.0.1", "0.0.0.0",
    "[::1]", "[::]", "[fc00::1]", "[fe80::1]", "[::ffff:127.0.0.1]", "[2002:7f00:1::]",
  ])("rejects direct special address %s before transport", async (host) => {
    await expect(fetchRecipeSource(`http://${host}/recipe`)).rejects.toMatchObject({ statusCode: 400 });
    expect(fixtures.connections).toEqual([]);
  });

  it.each(["127.0.0.1", "10.0.0.1", "fe80::1", "::ffff:10.0.0.1"])("rejects DNS result %s before connection", async address => {
    fixtures.addresses = ["93.184.216.34", address];
    await expect(fetchRecipeSource("https://recipes.example/recipe")).rejects.toMatchObject({ statusCode: 400 });
    expect(fixtures.connections).toEqual([]);
  });

  it("uses the connection's validated DNS answer without resolving again", async () => {
    fixtures.rebind = true;
    await expect(fetchRecipeSource("https://recipes.example/bread")).resolves.toMatchObject({ html: "Recipe" });
    expect(fixtures.dnsCalls).toBe(1);
    expect(fixtures.connections).toEqual(["93.184.216.34"]);
  });

  it("returns a controlled error when the request deadline aborts", async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    fixtures.hang = true;
    const result = fetchRecipeSource("https://recipes.example/bread");
    controller.abort();
    await expect(result).rejects.toMatchObject({ statusCode: 502, message: "Could not reach that URL." });
  });

  it("validates redirect targets and bounds redirect loops", async () => {
    fixtures.responses = [{ status: 302, location: "http://127.0.0.1/private" }];
    await expect(fetchRecipeSource("https://recipes.example/recipe")).rejects.toMatchObject({ statusCode: 400 });
    expect(fixtures.connections).toHaveLength(1);
    fixtures.responses = Array.from({ length: 6 }, () => ({ status: 302, location: "/again" }));
    await expect(fetchRecipeSource("https://recipes.example/recipe")).rejects.toThrow("too many times");
  });

  it("imports public JSON-LD after a relative redirect using the validated address", async () => {
    fixtures.responses = [
      { status: 302, location: "/bread" },
      { status: 200, body: '<script type="application/ld+json">{"@type":"Recipe","name":"Public bread","recipeIngredient":["500 g flour"],"recipeInstructions":["Mix - 10 min"]}</script>' },
    ];
    const recipe = await importRecipeFromUnknown({ mode: "url", url: "https://recipes.example/start" });
    expect(recipe.source).toBe("jsonld");
    expect(fixtures.connections).toEqual(["93.184.216.34", "93.184.216.34"]);
  });
});
