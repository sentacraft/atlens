# design-lab — Cloudflare Workers incompatibility note

**This directory cannot run on Cloudflare Workers in production.**

## What's in here

- `iris/actions.ts` — server actions that read/write `src/config/iris-config.ts` and shell out to `npx tsc --noEmit` for type-check feedback.
- `iris-pheno/actions.ts` — server actions that read/write `preset.json` and `src/config/brand.ts`.

Both use `fs/promises`, `child_process`, and `path.join(process.cwd(), …)` to mutate files on the developer's local disk at runtime. They are author-side tooling, not user-facing features.

## Why it doesn't work on CF Workers

The Cloudflare Workers runtime has no filesystem and no child-process support. The `nodejs_compat` compatibility flag polyfills a subset of Node APIs (path, util, crypto, stream, Buffer), but **not** `fs` and **not** `child_process`. Calling them in a Worker invocation throws at runtime.

## Current guard

[`layout.tsx`](./layout.tsx) calls `notFound()` when `process.env.NODE_ENV === "production"`, so the routes 404 in production builds. The server-action modules are still bundled into the Worker output (Next.js does not tree-shake `"use server"` modules based on conditional routing), but they are never invoked, so the Worker doesn't crash.

## When you modify code in this directory

Confirm at least one of these holds before deploying:

1. The `NODE_ENV === "production"` guard in `layout.tsx` is still effective, OR
2. You have replaced `fs` / `child_process` calls with Workers-compatible storage (R2 / KV / Durable Objects / external API).

If you ever want to expose design-lab in production, the actions need a full rewrite — they cannot stay as-is.

## History

This used to work transparently on Vercel because Vercel's Node.js runtime gives serverless functions full `fs` access (to the bundled deployment slug) and child-process support. The migration to Cloudflare Workers via OpenNext broke this assumption silently — the code still type-checks and bundles, it just can't run.
