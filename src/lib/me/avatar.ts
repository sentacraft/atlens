export const AVATAR_ENDPOINT = "/api/me/avatar";

/** The side, in pixels, of the square an uploaded photo is cropped and scaled to before upload. */
export const AVATAR_SIZE = 256;

/** A 256px JPEG is 15–30 KB; anything past this was not made by the cropper. */
export const AVATAR_MAX_BYTES = 100_000;

export type AvatarContentType = "image/jpeg" | "image/png";

/** The image type from the file's first bytes, or null for anything but JPEG and PNG. */
export function sniffAvatarType(bytes: Uint8Array): AvatarContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((byte, i) => bytes[i] === byte)) {
    return "image/png";
  }
  return null;
}

/** The user's image url for a photo uploaded at `updatedAt`; the version keeps caches from showing an older photo. */
export function avatarImageUrl(updatedAt: number): string {
  return `${AVATAR_ENDPOINT}?v=${updatedAt}`;
}

export function isUploadedAvatar(image: string | null | undefined): boolean {
  return Boolean(image?.startsWith(`${AVATAR_ENDPOINT}?`));
}
