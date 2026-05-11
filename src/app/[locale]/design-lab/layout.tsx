import { notFound } from "next/navigation";

// IMPORTANT — Cloudflare Workers incompatibility.
//
// The design-lab server actions under ./iris/actions.ts and
// ./iris-pheno/actions.ts use Node.js `fs/promises`, `child_process`, and
// `path.join(process.cwd(), …)` to read/write source files on the developer's
// disk at runtime. None of these APIs are available in the Cloudflare Workers
// runtime, even with the `nodejs_compat` flag. If this guard is removed or
// weakened, every design-lab page will throw at runtime in production.
//
// The guard below is the ONLY thing keeping this code from shipping to CF
// Workers. Before making any change to design-lab routing, gating, or to the
// actions themselves, confirm one of the following is still true:
//   1. This NODE_ENV guard (or an equivalent CF-specific guard) is in place, OR
//   2. The Node.js APIs have been replaced with something that runs on Workers
//      (e.g. Durable Objects / R2 / KV / a separate non-Workers service).
//
// See ./README.md for the full migration note.
export default function DesignLabLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }
  return <>{children}</>;
}
