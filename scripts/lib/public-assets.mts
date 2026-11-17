import { z } from "zod";

const relativePath = /^[a-zA-Z0-9][a-zA-Z0-9._-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)*$/;
const assetId = /^[a-z0-9][a-z0-9_-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)+$/;
export const publicAssetManifestSchema = z.strictObject({
  version: z.literal(1),
  assets: z.record(z.string().regex(assetId), z.strictObject({
    key: z.string().regex(relativePath),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }).refine(entry => new RegExp(`\\.${entry.sha256}\\.[a-z0-9]+$`).test(entry.key), "Resource key must contain its full content hash")),
});
