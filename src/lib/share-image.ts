import { domToPng } from "modern-screenshot";

/**
 * Rasterize a DOM node to a PNG data URL at 3× scale.
 * The node must already be in the document (painted and visible).
 */
export async function rasterizePoster(node: HTMLElement): Promise<string> {
  // Pass explicit dimensions so domToPng doesn't rely on getBoundingClientRect(),
  // which returns the visually-scaled size when the element lives inside a CSS transform.
  return domToPng(node, {
    scale: 3,
    backgroundColor: "#ffffff",
    width: node.scrollWidth,
    height: node.scrollHeight,
  });
}
