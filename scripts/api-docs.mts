import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const API_DIR = "src/app/api";
const OUTPUT = "docs/api.md";
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

interface Endpoint {
  path: string;
  methods: string[];
  doc: string | undefined;
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : routeFiles(full);
    }
    return entry.name === "route.ts" ? [full] : [];
  });
}

function routePath(file: string): string {
  return `/api/${relative(API_DIR, file).split(sep).slice(0, -1).join("/")}`;
}

const DOC = String.raw`(?:/\*\*([\s\S]*?)\*/\s*)?`;
const FUNCTION_EXPORT = new RegExp(`${DOC}export (?:async )?function (${METHODS.join("|")})\\(`, "g");
const DESTRUCTURED_EXPORT = new RegExp(`${DOC}export const \\{([^}]+)\\}`, "g");

function cleanDoc(raw: string | undefined): string | undefined {
  const text = raw?.replace(/^\s*\* ?/gm, "").replace(/\s+/g, " ").trim();
  return text || undefined;
}

function endpointsIn(file: string): Endpoint[] {
  const source = readFileSync(file, "utf8");
  const path = routePath(file);
  const endpoints: Endpoint[] = [];
  for (const match of source.matchAll(FUNCTION_EXPORT)) {
    endpoints.push({ path, methods: [match[2]], doc: cleanDoc(match[1]) });
  }
  for (const match of source.matchAll(DESTRUCTURED_EXPORT)) {
    const methods = match[2].split(",").map((name) => name.trim()).filter((name) => (METHODS as readonly string[]).includes(name));
    if (methods.length > 0) {
      endpoints.push({ path, methods, doc: cleanDoc(match[1]) });
    }
  }
  return endpoints;
}

const endpoints = routeFiles(API_DIR)
  .flatMap(endpointsIn)
  .sort((a, b) => a.path.localeCompare(b.path) || METHODS.indexOf(a.methods[0] as never) - METHODS.indexOf(b.methods[0] as never));

const undocumented = endpoints.filter((endpoint) => !endpoint.doc);
if (undocumented.length > 0) {
  for (const endpoint of undocumented) {
    console.error(`Missing JSDoc on ${endpoint.methods.join(", ")} ${endpoint.path}`);
  }
  process.exit(1);
}

const escape = (text: string) => text.replace(/\|/g, "\\|");
const expected = [
  "# API",
  "",
  "Generated from the JSDoc on each route handler by `scripts/api-docs.mts`. Do not edit by hand:",
  "change the JSDoc, then run `node --experimental-strip-types scripts/api-docs.mts --write`.",
  "",
  "| Path | Method | Description |",
  "|---|---|---|",
  ...endpoints.map((e) => `| \`${e.path}\` | ${e.methods.join(", ")} | ${escape(e.doc ?? "")} |`),
  "",
].join("\n");

if (process.argv.includes("--write")) {
  writeFileSync(OUTPUT, expected);
  console.log(`Wrote ${OUTPUT}`);
} else if (readFileSync(OUTPUT, "utf8") !== expected) {
  console.error(`${OUTPUT} is out of date. Run: node --experimental-strip-types scripts/api-docs.mts --write`);
  process.exit(1);
} else {
  console.log(`${OUTPUT} is up to date`);
}
