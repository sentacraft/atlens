import { createContext, domToPng } from "modern-screenshot";

interface RasterizeOptions {
  // 1280 is the long-axis threshold of the most aggressive IM compressors.
  maxWidth?: number;
}

// iOS Safari refuses canvases over about 16.7 megapixels, which a long poster at 3x exceeds.
// https://pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/
const MAX_PIXELS = 16_000_000;

const MAX_REDRAWS = 4;
const REDRAW_INTERVAL_MS = 200;

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
  const context = await createContext(node, {
    scale,
    backgroundColor: "#ffffff",
    width: naturalWidth,
    height: naturalHeight,
    drawImageInterval: REDRAW_INTERVAL_MS,
    // WebKit paints images embedded in the SVG blank until they decode, so the library redraws;
    // left alone it redraws once per image, minutes on a phone for a 179-lens ladder.
    // https://github.com/qq15725/modern-screenshot/issues/173
    onCreateForeignObjectSvg: () => {
      context.drawImageCount = Math.min(context.drawImageCount, MAX_REDRAWS);
    },
  });
  return domToPng(context);
}

/**
 * Hands an image to the system share sheet, whose "Save Image" puts it in the photo library;
 * where files can't be shared, downloads it instead. Resolves false if the visitor cancels.
 */
export async function saveImage(src: string, fileName: string): Promise<boolean> {
  const blob = await (await fetch(src)).blob();
  const file = new File([blob], fileName, { type: blob.type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return false;
      }
    }
  }
  const link = document.createElement("a");
  link.download = fileName;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}
