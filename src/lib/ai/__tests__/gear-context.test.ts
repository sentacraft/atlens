import { describe, expect, it } from "vitest";
import { describeGear, evalGear, type GearStatus } from "../gear-context";
import { gearPrompt } from "../system-prompt";
import { lensRef } from "../lens-ref";
import type { GearItem } from "@/lib/me/gear-schema";

const brandName = (slug: string) => (slug === "fujifilm" ? "富士" : slug);
const gearContext = (status: GearStatus, cardAvailable = false) => gearPrompt(describeGear(status, brandName), { cardAvailable });

describe("gearPrompt(describeGear(...))", () => {
  it("tells Iris a guest's gear is unknown, and how to ask for it", () => {
    expect(gearContext({ kind: "guest" }, true)).toContain("只有当回答明显取决于他已有什么时");
    expect(gearContext({ kind: "account", gear: [] }, true)).toContain("要推荐镜头时");
    expect(gearContext({ kind: "guest" })).toContain("不要再问他的器材");
  });

  it("tells Iris an empty profile leaves the gear unknown", () => {
    expect(gearContext({ kind: "account", gear: [] })).toContain("器材档案是空的");
  });

  it("lists bodies with sensor and stabilisation, and lenses with refs and equivalent focal lengths", () => {
    const gear = evalGear(
      JSON.stringify({ bodies: ["fujifilm-x-t5"], lenses: ["fujifilm-xf-18-55mmf28-4-r-lm-ois-x"] }),
    )!;

    expect(gearContext({ kind: "account", gear })).toBe(
      [
        "【用户器材】",
        "用户已登录，器材档案里有：",
        "机身：",
        "- 富士 X-T5（APS-C，40.2 百万像素，有机身防抖）",
        "镜头：",
        `- 富士 XF 18-55mm F2.8-4 R LM OIS（ref ${lensRef("fujifilm-xf-18-55mmf28-4-r-lm-ois-x")}，焦段 18–55mm，等效 27–83mm，最大光圈 f/2.8–4）`,
      ].join("\n"),
    );
  });

  it("describes a manually entered, adapted lens from what the user typed", () => {
    const manual: GearItem = {
      id: "g1",
      kind: "lens",
      name: "44-2 58mm F2",
      brand: "Helios",
      mount: "X",
      manual: { brand: "Helios", model: "44-2 58mm F2", mount: "X", focalMinMm: 58, focalMaxMm: 58, maxApertureWide: 2, adapted: true, originalMount: "M42" },
      createdAt: 1,
    };

    expect(gearContext({ kind: "account", gear: [manual] })).toContain(
      "- Helios 44-2 58mm F2（手动录入，焦段 58mm，等效 87mm，最大光圈 f/2，转接使用，原卡口 M42）",
    );
  });
});

describe("evalGear", () => {
  it("ignores a missing or malformed header and unknown ids", () => {
    expect(evalGear(null)).toBeUndefined();
    expect(evalGear("not json")).toBeUndefined();
    expect(evalGear(JSON.stringify({ lenses: ["no-such-lens"] }))).toEqual([]);
  });
});
