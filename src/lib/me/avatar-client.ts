import { AVATAR_ENDPOINT } from "@/lib/me/avatar";

export class AvatarRequestError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "AvatarRequestError";
  }
}

async function errorCode(response: Response): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? `avatar_${response.status}`;
}

/** Uploads the cropped photo and returns the user's new image url. */
export async function uploadAvatar(photo: Blob): Promise<string> {
  const response = await fetch(AVATAR_ENDPOINT, { method: "PUT", body: photo });
  if (!response.ok) {
    throw new AvatarRequestError(await errorCode(response));
  }
  return ((await response.json()) as { image: string }).image;
}

export async function removeAvatar(): Promise<void> {
  const response = await fetch(AVATAR_ENDPOINT, { method: "DELETE" });
  if (!response.ok) {
    throw new AvatarRequestError(await errorCode(response));
  }
}
