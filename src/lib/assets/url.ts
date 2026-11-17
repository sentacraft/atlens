import { PUBLIC_ASSET_URLS } from "@/data/public-assets.generated";

export function getPublicAssetUrl(assetId: string): string {
  if (!Object.hasOwn(PUBLIC_ASSET_URLS, assetId)) {
    throw new Error(`Missing public asset: ${assetId}`);
  }
  return PUBLIC_ASSET_URLS[assetId];
}
