import { domToPng } from "modern-screenshot";

interface RasterizeOptions {
  // 1280 is the long-axis threshold of the most aggressive IM compressors.
  maxWidth?: number;
}

export async function rasterizePoster(
  node: HTMLElement,
  opts: RasterizeOptions = {},
): Promise<string> {
  const naturalWidth = node.scrollWidth;
  const cap = opts.maxWidth ?? Infinity;
  const scale = Math.min(3, cap / naturalWidth);
  // getBoundingClientRect() returns the transformed size inside a CSS transform.
  return domToPng(node, {
    scale,
    backgroundColor: "#ffffff",
    width: naturalWidth,
    height: node.scrollHeight,
  });
}
