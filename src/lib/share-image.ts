import { domToPng } from "modern-screenshot";

interface RasterizeOptions {
  /** Cap the output width in pixels. Use 1280 when targeting WeChat to
   * avoid its 1280-axis downscale (which then JPEG-compresses on top). */
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
