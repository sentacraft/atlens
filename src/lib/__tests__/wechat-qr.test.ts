import { statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { WECHAT_QR_SRC } from "../support";

describe("the WeChat code image", () => {
  it("stays small enough to show quickly in the support dialog", () => {
    // Images are served unoptimized, so a new code dropped in at full size would reach every visitor as is.
    const { size } = statSync(path.join(process.cwd(), "public", WECHAT_QR_SRC));
    expect(size).toBeLessThan(60_000);
  });
});
