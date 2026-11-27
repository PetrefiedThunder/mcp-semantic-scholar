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
  const match = /^\^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(range);
  assert.ok(match, "MCP SDK range must be a stable caret range");
  const [major, minor, patch] = match.slice(1).map(Number);
  assert.equal(major, 1, "MCP SDK range must stay within major 1");
  assert.ok(
    minor > 32 || (minor === 32 && patch >= 1),
    "MCP SDK minimum must be at least 1.32.1, excluding 1.31.0",
  );
});
