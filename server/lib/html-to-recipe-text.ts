import { cleanImportSourceText } from "../../src/lib/import/normalize-import";

const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": "\"",
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&deg;": "°",
};

function decodeHtmlEntities(text: string): string {
  return text.replace(/&nbsp;|&amp;|&quot;|&#39;|&apos;|&lt;|&gt;|&deg;/g, (entity) => ENTITY_MAP[entity] ?? entity);
}

function extractTagContent(html: string, pattern: RegExp): string {
  const match = html.match(pattern);
  return match?.[1]?.trim() ?? "";
}

export function htmlToRecipeText(html: string, sourceUrl?: string): string {
  const title = extractTagContent(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = extractTagContent(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i,
  );

  const bodyText = decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "\n")
      .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );

  const lines = bodyText
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 250);

  const assembled = [
    title ? `Title: ${decodeHtmlEntities(title)}` : "",
    metaDescription ? `Description: ${decodeHtmlEntities(metaDescription)}` : "",
    sourceUrl ? `Source URL: ${sourceUrl}` : "",
    "",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n");

  return cleanImportSourceText(assembled).slice(0, 16_000);
}
