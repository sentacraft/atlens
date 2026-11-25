import { describe, expect, it } from "vitest";
import { describeGear, evalGear } from "../gear-context";
import { gearPrompt, systemPrompt } from "../system-prompt";
import { lensRef } from "../lens-ref";
import type { GearItem } from "@/lib/me/gear-schema";

const brandName = (slug: string) => (slug === "fujifilm" ? "Fujifilm" : slug);

describe("gear prompt", () => {
  it.each(["guest", "account", "unavailable"] as const)("provides only %s access state, not a profile", (state) => {
    const prompt = gearPrompt(state, { declined: null, signInDeclined: false });
    expect(prompt).toContain(state === "guest" ? "用户未登录" : state === "account" ? "用户已登录" : "暂时无法读取");
    expect(prompt).not.toContain("ref ");
    expect(prompt).not.toContain("档案是空的");
  });

  it("uses myGear for saved reads, allows explicit edits, and refreshes rather than trusting old profiles", () => {
    const prompt = systemPrompt("X", "zh");
    expect(prompt).toContain("先调用 myGear");
    expect(prompt).toContain("新问题");
    expect(prompt).toContain("askForGear");
    expect(prompt).not.toContain("开头的「用户器材」写着");
  });

  it("does not solicit another login or editor after a sign-in denial", () => {
    const prompt = gearPrompt("guest", { declined: null, signInDeclined: true });
    expect(prompt).toContain("用户已取消登录");
    expect(prompt).toContain("不要再要求登录或打开器材卡");
  });
});

describe("describeGear", () => {
  it("keeps guest, empty, and unavailable distinct for the reader", () => {
    expect(describeGear({ kind: "guest" }, brandName)).toEqual({ known: false, reason: "guest" });
    expect(describeGear({ kind: "account", gear: [] }, brandName)).toEqual({ known: false, reason: "empty" });
    expect(describeGear({ kind: "unavailable" }, brandName)).toEqual({ known: false, reason: "unavailable" });
  });

  it("describes bodies and catalog lenses for the server tool", () => {
    const gear = evalGear(JSON.stringify({ bodies: ["fujifilm-x-t5"], lenses: ["fujifilm-xf-18-55mmf28-4-r-lm-ois-x"] }))!;
    expect(describeGear({ kind: "account", gear }, brandName)).toEqual({
      known: true,
      bodies: [{ name: "Fujifilm X-T5", sensor: "X", megapixels: 40.2, ibis: true }],
      lenses: [{
        name: "Fujifilm XF 18-55mm F2.8-4 R LM OIS",
        ref: lensRef("fujifilm-xf-18-55mmf28-4-r-lm-ois-x"),
        focal: "18–55mm", equivalent: "27–83mm", aperture: "F2.8–4", manual: false, adapted: false,
      }],
    });
  });

  it("describes a manual adapted lens without inventing a catalog ref", () => {
    const manual: GearItem = {
      id: "g1", kind: "lens", name: "44-2 58mm F2", brand: "Helios", mount: "X", createdAt: 1,
      manual: { brand: "Helios", model: "44-2 58mm F2", mount: "X", focalMinMm: 58, focalMaxMm: 58, maxApertureWide: 2, adapted: true, originalMount: "M42" },
    };
    expect(describeGear({ kind: "account", gear: [manual] }, brandName)).toEqual({
      known: true, bodies: [], lenses: [{ name: "Helios 44-2 58mm F2", focal: "58mm", equivalent: "87mm", aperture: "F2", manual: true, adapted: true, originalMount: "M42" }],
    });
  });
});

describe("evalGear", () => {
  it("ignores a missing or malformed header and unknown ids", () => {
    expect(evalGear(null)).toBeUndefined();
    expect(evalGear("not json")).toBeUndefined();
    expect(evalGear(JSON.stringify({ lenses: ["no-such-lens"] }))).toEqual([]);
  });
});
