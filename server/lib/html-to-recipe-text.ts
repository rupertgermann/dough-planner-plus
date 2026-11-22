import { SAXParser } from "parse5-sax-parser";

const IGNORED_TAGS = new Set(["script", "style", "noscript", "svg"]);
const LINE_BREAK_TAGS = new Set(["p", "div", "section", "article", "li", "ul", "ol", "h1", "h2", "h3", "h4", "h5", "h6"]);

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function htmlToRecipeText(html: string, sourceUrl?: string): string {
  const parser = new SAXParser();
  const body: string[] = [];
  let title = "";
  let readingTitle = false;
  let description: string | undefined;
  let ignoredTag = "";
  let ignoredDepth = 0;

  parser.on("startTag", ({ tagName, attrs, selfClosing }) => {
    if (ignoredDepth > 0) {
      if (tagName === ignoredTag && !selfClosing) ignoredDepth++;
      return;
    }
    if (IGNORED_TAGS.has(tagName)) {
      if (tagName !== "svg" || !selfClosing) {
        ignoredTag = tagName;
        ignoredDepth = 1;
      }
      body.push("\n");
      return;
    }
    if (tagName === "title" && !title) readingTitle = true;
    if (tagName === "meta" && description === undefined &&
        attrs.find(({ name }) => name === "name")?.value.toLowerCase() === "description") {
      description = normalizeWhitespace(attrs.find(({ name }) => name === "content")?.value ?? "");
    }
    body.push(tagName === "br" ? "\n" : " ");
  });
  parser.on("endTag", ({ tagName }) => {
    if (ignoredDepth > 0) {
      if (tagName === ignoredTag) ignoredDepth--;
      return;
    }
    if (tagName === "title") readingTitle = false;
    body.push(LINE_BREAK_TAGS.has(tagName) ? "\n" : " ");
  });
  parser.on("text", ({ text }) => {
    if (ignoredDepth > 0) return;
    if (readingTitle) title += text;
    body.push(text);
  });
  parser.end(html);

  const lines = body.join("")
    .split("\n")
    .map(normalizeWhitespace)
    .filter(Boolean)
    .slice(0, 250);

  const normalizedTitle = normalizeWhitespace(title);
  return [
    normalizedTitle ? `Title: ${normalizedTitle}` : "",
    description ? `Description: ${description}` : "",
    sourceUrl ? `Source URL: ${sourceUrl}` : "",
    ...lines,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 16_000);
}
