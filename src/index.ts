#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const API_KEY = process.env.SEMANTIC_SCHOLAR_API_KEY || "";
const server = new McpServer({ name: "mcp-semantic-scholar", version: "1.0.0" });
const BASE = "https://api.semanticscholar.org/graph/v1";

async function s2(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE}${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  const headers: Record<string, string> = {};
  if (API_KEY) headers["x-api-key"] = API_KEY;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`Semantic Scholar ${res.status}: ${await res.text()}`);
  return res.json();
}

server.tool("search_papers", "Search academic papers", {
  query: z.string().describe("Search query"),
  year: z.string().optional().describe("Year or range (e.g., '2020', '2020-2024')"),
  fields_of_study: z.string().optional().describe("Field (Computer Science, Medicine, Physics, etc.)"),
  open_access: z.boolean().optional().describe("Only open access papers"),
  limit: z.number().default(10),
  offset: z.number().default(0),
}, async ({ query, year, fields_of_study, open_access, limit, offset }) => {
  const params: Record<string, string> = {
    query, limit: String(limit), offset: String(offset),
    fields: "title,authors,year,citationCount,abstract,url,openAccessPdf,fieldsOfStudy,publicationDate",
  };
  if (year) params.year = year;
  if (fields_of_study) params.fieldsOfStudy = fields_of_study;
  if (open_access) params.openAccessPdf = "";
  const data = await s2("/paper/search", params);
  return { content: [{ type: "text", text: JSON.stringify({ total: data.total, papers: data.data }, null, 2) }] };
});

server.tool("paper_detail", "Get detailed paper information", {
  paper_id: z.string().describe("Semantic Scholar paper ID, DOI, arXiv ID, or URL"),
}, async ({ paper_id }) => {
  const data = await s2(`/paper/${encodeURIComponent(paper_id)}`, {
    fields: "title,authors,year,abstract,citationCount,referenceCount,influentialCitationCount,url,openAccessPdf,fieldsOfStudy,publicationDate,venue,externalIds,tldr",
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("paper_citations", "Get papers that cite a given paper", {
  paper_id: z.string().describe("Paper ID, DOI, or arXiv ID"),
  limit: z.number().default(10),
  offset: z.number().default(0),
}, async ({ paper_id, limit, offset }) => {
  const data = await s2(`/paper/${encodeURIComponent(paper_id)}/citations`, {
    fields: "title,authors,year,citationCount,url",
    limit: String(limit), offset: String(offset),
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("paper_references", "Get papers referenced by a given paper", {
  paper_id: z.string().describe("Paper ID, DOI, or arXiv ID"),
  limit: z.number().default(10),
}, async ({ paper_id, limit }) => {
  const data = await s2(`/paper/${encodeURIComponent(paper_id)}/references`, {
    fields: "title,authors,year,citationCount,url",
    limit: String(limit),
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("author_search", "Search for academic authors", {
  query: z.string().describe("Author name"),
  limit: z.number().default(5),
}, async ({ query, limit }) => {
  const data = await s2("/author/search", {
    query, limit: String(limit),
    fields: "name,hIndex,citationCount,paperCount,affiliations,url",
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("author_papers", "Get papers by a specific author", {
  author_id: z.string().describe("Semantic Scholar author ID"),
  limit: z.number().default(10),
}, async ({ author_id, limit }) => {
  const data = await s2(`/author/${author_id}/papers`, {
    fields: "title,year,citationCount,venue,url",
    limit: String(limit),
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

server.tool("recommendations", "Get paper recommendations based on a paper", {
  paper_id: z.string().describe("Paper ID to get recommendations for"),
  limit: z.number().default(10),
}, async ({ paper_id, limit }) => {
  const data = await s2(`/recommendations/v1/papers/forpaper/${encodeURIComponent(paper_id)}`, {
    fields: "title,authors,year,citationCount,url,abstract",
    limit: String(limit),
  });
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
