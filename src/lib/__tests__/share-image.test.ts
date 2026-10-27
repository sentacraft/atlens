// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const domToPng = vi.hoisted(() => vi.fn(async () => "data:image/png;base64,"));
vi.mock("modern-screenshot", () => ({ domToPng }));

import { rasterizePoster } from "@/lib/share-image";

describe("rasterizePoster", () => {
  it("skips the per-image redraw loop that hangs Safari on posters with many lens images", async () => {
    const node = document.createElement("div");
    for (let i = 0; i < 3; i++) {
      node.appendChild(document.createElement("img"));
    }
    HTMLImageElement.prototype.decode = vi.fn(async () => undefined);

    await rasterizePoster(node);

    expect(domToPng).toHaveBeenCalledWith(node, expect.objectContaining({ features: { fixSvgXmlDecode: false } }));
  });
});
