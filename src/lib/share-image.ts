import { domToPng } from "modern-screenshot";

interface RasterizeOptions {
  /** Cap the output width in pixels. 1280 is the long-axis threshold used
   * by the most aggressive mainstream IM compressors; capping there avoids
   * the resize stage and only takes a single quality-compression hit. */
  maxWidth?: number;
}

/**
 * Rasterize a DOM node to a PNG data URL.
 * Defaults to 3× scale (high-DPI download); pass `maxWidth` to cap the output.
 * The node must already be in the document (painted and visible).
 */
export async function rasterizePoster(
  node: HTMLElement,
  opts: RasterizeOptions = {},
): Promise<string> {
  const naturalWidth = node.scrollWidth;
  const cap = opts.maxWidth ?? Infinity;
  const scale = Math.min(3, cap / naturalWidth);
  // Pass explicit dimensions so domToPng doesn't rely on getBoundingClientRect(),
  // which returns the visually-scaled size when the element lives inside a CSS transform.
  return domToPng(node, {
    scale,
    backgroundColor: "#ffffff",
    width: naturalWidth,
    height: node.scrollHeight,
  });
}
