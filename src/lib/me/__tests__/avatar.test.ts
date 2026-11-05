import { describe, expect, it } from "vitest";
import { avatarImageUrl, isUploadedAvatar, sniffAvatarType } from "../avatar";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);

describe("sniffAvatarType", () => {
  it("reads JPEG and PNG from their first bytes", () => {
    expect(sniffAvatarType(JPEG)).toBe("image/jpeg");
    expect(sniffAvatarType(PNG)).toBe("image/png");
  });

  // The client names the type, so a GIF or an HTML page sent as image/jpeg must not get through.
  it("rejects anything else, whatever it claims to be", () => {
    expect(sniffAvatarType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(sniffAvatarType(new TextEncoder().encode("GIF89a"))).toBeNull();
    expect(sniffAvatarType(new Uint8Array())).toBeNull();
  });
});

describe("avatar image urls", () => {
  it("version the url by upload time so a new photo replaces the cached one", () => {
    expect(avatarImageUrl(1700000000000)).toBe("/api/me/avatar?v=1700000000000");
  });

  it("tells an uploaded photo from a provider's picture", () => {
    expect(isUploadedAvatar(avatarImageUrl(1))).toBe(true);
    expect(isUploadedAvatar("https://lh3.googleusercontent.com/a/x")).toBe(false);
    expect(isUploadedAvatar(null)).toBe(false);
  });
});
