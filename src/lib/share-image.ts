import { domToPng } from "modern-screenshot";

interface RasterizeOptions {
  // 1280 is the long-axis threshold of the most aggressive IM compressors.
  maxWidth?: number;
}

// iOS Safari refuses canvases over about 16.7 megapixels, which a long poster at 3x exceeds.
// https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/
const MAX_PIXELS = 16_000_000;

export async function rasterizePoster(
  node: HTMLElement,
  opts: RasterizeOptions = {},
): Promise<string> {
  // A lens image still loading would come out blank.
  await Promise.all([...node.querySelectorAll("img")].map((img) => img.decode().catch(() => undefined)));
  const naturalWidth = node.scrollWidth;
  const naturalHeight = node.scrollHeight;
  const cap = opts.maxWidth ?? Infinity;
  const scale = Math.min(3, cap / naturalWidth, Math.sqrt(MAX_PIXELS / (naturalWidth * naturalHeight)));
  // getBoundingClientRect() returns the transformed size inside a CSS transform.
  return domToPng(node, {
    scale,
    backgroundColor: "#ffffff",
    width: naturalWidth,
    height: naturalHeight,
  });
}
