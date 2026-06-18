import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Serve prerendered (SSG) pages from the build output instead of re-rendering
// them in the Worker on every request. Without an incrementalCache override the
// default is the no-op "dummy" cache, which always misses — so every SSG page
// silently degrades to an on-demand (edge-SSR) render. The static-assets cache
// is read-only and ships the prerendered HTML/RSC as Worker assets under
// `cdn-cgi/_next_cache`, which is exactly what a no-revalidation, pure-SSG site
// wants. (ISR/on-demand revalidation would instead require the writable R2
// cache + a queue; this site has no ISR routes, so static-assets is the fit.)
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
