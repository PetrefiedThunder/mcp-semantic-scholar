import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("..", import.meta.url);
const source = readFileSync(new URL("src/index.ts", root), "utf8");
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

const TOOLS = [
  "search_papers",
  "paper_detail",
  "paper_citations",
  "paper_references",
  "author_search",
  "author_papers",
  "recommendations",
];

test("registers the Semantic Scholar tools", () => {
  for (const name of TOOLS) {
    assert.match(source, new RegExp(`server\\.tool\\("${name}"`));
  }
});

test("calls the Semantic Scholar graph API", () => {
  assert.match(source, /https:\/\/api\.semanticscholar\.org\/graph\/v1/);
});

test("package.json declares an MCP SDK range that excludes 1.31.0", () => {
  const range = pkg.dependencies["@modelcontextprotocol/sdk"];
  assert.equal(range, "^1.32.1");
});
