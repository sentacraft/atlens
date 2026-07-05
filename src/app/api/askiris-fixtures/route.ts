import { promises as fs } from "node:fs";
import path from "node:path";

// Dev-only fixture persistence for the AskIris test-hook panel. Saved fixtures
// are JSON files under a gitignored repo dir so a captured session lives on disk
// and survives reloads. The route 404s outside development, so nothing here is
// reachable on the deployed (Cloudflare workerd) runtime.

const DIR = path.join(process.cwd(), ".askiris-fixtures");
const SAFE_NAME = /^[\w-]+$/;

function forbidden() {
  return process.env.NODE_ENV === "production";
}

export async function GET() {
  if (forbidden()) {
    return new Response(null, { status: 404 });
  }
  const out: Record<string, unknown> = {};
  try {
    for (const file of await fs.readdir(DIR)) {
      if (!file.endsWith(".json")) {
        continue;
      }
      const raw = await fs.readFile(path.join(DIR, file), "utf8");
      out[file.slice(0, -".json".length)] = JSON.parse(raw);
    }
  } catch {
    // No dir yet — no saved fixtures.
  }
  return Response.json(out);
}

interface FixtureRequest {
  action?: "save" | "delete" | "rename";
  name?: string;
  from?: string;
  to?: string;
  messages?: unknown;
}

function safe(value: unknown): value is string {
  return typeof value === "string" && SAFE_NAME.test(value);
}

export async function POST(req: Request) {
  if (forbidden()) {
    return new Response(null, { status: 404 });
  }
  const body = (await req.json()) as FixtureRequest;
  await fs.mkdir(DIR, { recursive: true });

  if (body.action === "save") {
    if (!safe(body.name)) {
      return new Response("bad name", { status: 400 });
    }
    await fs.writeFile(
      path.join(DIR, `${body.name}.json`),
      JSON.stringify(body.messages, null, 2),
    );
  } else if (body.action === "delete") {
    if (!safe(body.name)) {
      return new Response("bad name", { status: 400 });
    }
    await fs.rm(path.join(DIR, `${body.name}.json`), { force: true });
  } else if (body.action === "rename") {
    if (!safe(body.from) || !safe(body.to)) {
      return new Response("bad name", { status: 400 });
    }
    await fs.rename(
      path.join(DIR, `${body.from}.json`),
      path.join(DIR, `${body.to}.json`),
    );
  } else {
    return new Response("bad action", { status: 400 });
  }

  return Response.json({ ok: true });
}
