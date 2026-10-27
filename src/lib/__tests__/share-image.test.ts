// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

type Options = { onCreateForeignObjectSvg?: () => void };
type Context = Options & { drawImageCount: number };

const lib = vi.hoisted(() => ({
  context: undefined as Context | undefined,
  createContext: vi.fn(async (_node: Node, options: Options) => {
    lib.context = { ...options, drawImageCount: 0 };
    return lib.context;
  }),
  domToPng: vi.fn(async (context: Context) => {
    // As on WebKit: the library counts one redraw per embedded image, then calls the hook.
    context.drawImageCount = 179;
    context.onCreateForeignObjectSvg?.();
    return "data:image/png;base64,";
  }),
}));
vi.mock("modern-screenshot", () => ({ createContext: lib.createContext, domToPng: lib.domToPng }));

import { rasterizePoster } from "@/lib/share-image";

describe("rasterizePoster", () => {
  it("bounds WebKit's per-image redraws, which hang a phone on a poster with many lens images", async () => {
    const node = document.createElement("div");
    node.appendChild(document.createElement("img"));
    HTMLImageElement.prototype.decode = vi.fn(async () => undefined);

    await rasterizePoster(node);

    expect(lib.context!.drawImageCount).toBeGreaterThan(0);
    expect(lib.context!.drawImageCount).toBeLessThanOrEqual(4);
  });
});
