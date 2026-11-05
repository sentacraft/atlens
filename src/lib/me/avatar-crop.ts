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

/** The longest side, in pixels, of the photo the cropper works on; the avatar itself is 256. */
const SOURCE_MAX = 1280;

/**
 * An object url for the picked photo, scaled down to SOURCE_MAX when larger, so a phone's 12 MP
 * original is decoded once here and the cropper and the final crop work on a small image.
 * Rejects with UnreadableImageError when the browser cannot decode the file.
 */
export async function prepareAvatarSource(file: File): Promise<string> {
  const original = URL.createObjectURL(file);
  try {
    const image = await loadImage(original);
    const scale = Math.min(1, SOURCE_MAX / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1) {
      return original;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new UnreadableImageError();
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const scaled = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new UnreadableImageError())), "image/jpeg", 0.92);
    });
    URL.revokeObjectURL(original);
    return URL.createObjectURL(scaled);
  } catch (error) {
    URL.revokeObjectURL(original);
    throw error;
  }
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
