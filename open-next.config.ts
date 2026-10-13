import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Without an incrementalCache override, OpenNext's dummy cache misses every time and every SSG
// page re-renders per request.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
