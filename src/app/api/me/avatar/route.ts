import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAccountUserId } from "@/lib/auth-session";
import { AVATAR_MAX_BYTES, sniffAvatarType } from "@/lib/me/avatar";
import { getUserAvatar, removeUserAvatar, setUserAvatar } from "@/lib/me/avatar-repository";
import { isOverDailyCap } from "@/lib/rate-limit";

const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });

/** Serves the caller's uploaded avatar photo. Accounts only; 401 for guests, 404 without a photo. */
export async function GET(request: Request): Promise<Response> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  const avatar = await getUserAvatar(getCloudflareContext().env.APP_DB, userId);
  if (!avatar) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new Response(avatar.image, {
    headers: {
      "content-type": avatar.contentType,
      "cache-control": "private, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}

/** Replaces the caller's avatar with the uploaded JPEG or PNG and returns its image url. Accounts only; 401 for guests, 413 past 100 KB, 415 for other files, 429 past 30 uploads a day. */
export async function PUT(request: Request): Promise<NextResponse> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  if (await isOverDailyCap(request, "avatarUpload")) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (Number(request.headers.get("content-length")) > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const image = new Uint8Array(await request.arrayBuffer());
  if (image.length > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const contentType = sniffAvatarType(image);
  if (!contentType) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }
  const url = await setUserAvatar(getCloudflareContext().env.APP_DB, { userId, image, contentType });
  return NextResponse.json({ image: url });
}

/** Removes the caller's uploaded avatar and restores the picture it replaced. Accounts only; 401 for guests. */
export async function DELETE(request: Request): Promise<Response> {
  const userId = await getAccountUserId(request);
  if (!userId) {
    return unauthorized();
  }
  await removeUserAvatar(getCloudflareContext().env.APP_DB, userId);
  return new Response(null, { status: 204 });
}
