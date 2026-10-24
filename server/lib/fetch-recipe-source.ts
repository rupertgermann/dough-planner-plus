import { lookup } from "node:dns";
import { get as httpGet } from "node:http";
import { get as httpsGet } from "node:https";
import { isIP } from "node:net";
import { promisify } from "node:util";
import { gunzip, inflate, brotliDecompress } from "node:zlib";
import { isPublicAddress } from "./public-address";
import { RecipeImportError } from "./recipe-import-error";

export interface FetchedRecipeSource {
  url: string;
  html: string;
  contentType: string;
}

const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;

export async function fetchRecipeSource(url: string): Promise<FetchedRecipeSource> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  try {
    let target = new URL(url);
    for (let redirects = 0; ; redirects++) {
      const hostname = target.hostname.replace(/^\[|\]$/g, "");
      if (!["http:", "https:"].includes(target.protocol) || target.username || target.password ||
          (isIP(hostname) && !isPublicAddress(hostname))) {
        throw new RecipeImportError("Only public HTTP(S) recipe URLs are allowed.", 400);
      }
      const response = await new Promise<import("node:http").IncomingMessage>((resolve, reject) => {
        const request = (target.protocol === "https:" ? httpsGet : httpGet)(target, {
          signal,
          agent: false,
          // Validate in the connection's lookup so DNS cannot change between validation and use.
          lookup: (host, options, callback) => {
            lookup(host, { all: true }, (error, addresses) => {
              if (error) return callback(error, "");
              if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
                return callback(new RecipeImportError("Only public HTTP(S) recipe URLs are allowed.", 400), "");
              }
              callback(null, options.all ? addresses : addresses[0].address, addresses[0].family);
            });
          },
          headers: {
            accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
            "user-agent": "DoughPlannerPlus/1.0 (+recipe import)",
          },
        }, resolve);
        request.on("error", reject);
      });
      const status = response.statusCode ?? 502;
      if ([301, 302, 303, 307, 308].includes(status) && response.headers.location) {
        response.destroy();
        if (redirects >= MAX_REDIRECTS) throw new RecipeImportError("Recipe page redirected too many times.", 502);
        target = new URL(response.headers.location, target);
        continue;
      }
      if (status < 200 || status >= 300) {
        response.destroy();
        throw new RecipeImportError(`Recipe page request failed with status ${status}.`, 502);
      }
      const chunks: Buffer[] = [];
      for await (const chunk of response) chunks.push(Buffer.from(chunk));
      let body: Buffer = Buffer.concat(chunks);
      for (const encoding of (response.headers["content-encoding"] ?? "identity").split(",").reverse()) {
        switch (encoding.trim().toLowerCase()) {
          case "gzip": body = await promisify(gunzip)(body); break;
          case "deflate": body = await promisify(inflate)(body); break;
          case "br": body = await promisify(brotliDecompress)(body); break;
          case "identity": break;
          default: throw new RecipeImportError("The recipe page used an unsupported content encoding.", 502);
        }
      }
      const html = body.toString("utf8");
      if (!html.trim()) throw new RecipeImportError("The recipe page did not return any readable content.", 422);
      return { url: target.href, html, contentType: response.headers["content-type"] ?? "" };
    }
  } catch (error) {
    if (error instanceof RecipeImportError) throw error;
    throw new RecipeImportError("Could not reach that URL.", 502);
  }
}
