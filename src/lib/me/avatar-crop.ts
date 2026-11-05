import { AVATAR_SIZE } from "@/lib/me/avatar";

export interface PixelCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The picked image could not be decoded, such as a HEIC file in a browser without support for it. */
export class UnreadableImageError extends Error {
  constructor() {
    super("unreadable_image");
    this.name = "UnreadableImageError";
  }
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new UnreadableImageError());
    image.src = src;
  });
}

/**
 * The selected area of the image as a square JPEG of AVATAR_SIZE px. JPEG on purpose: Safari cannot
 * encode WebP from a canvas and silently hands back a much larger PNG.
 */
export async function cropToAvatar(src: string, crop: PixelCrop): Promise<Blob> {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new UnreadableImageError();
  }
  // A transparent PNG would turn black as a JPEG.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new UnreadableImageError())), "image/jpeg", 0.85);
  });
}
