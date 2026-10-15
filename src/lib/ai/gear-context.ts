import { z } from "zod";
import { getBodyById } from "@/lib/body/data";
import { getLensById } from "@/lib/lens/data";
import { focalRangeDisplay, primaryApertureDisplay } from "@/lib/lens/format";
import { lensRef } from "@/lib/ai/lens-ref";
import { equivalentFocal } from "@/lib/me/coverage";
import type { GearItem } from "@/lib/me/gear-schema";
import type { Mount } from "@/lib/types";

/** What Iris knows about the user's gear this turn. */
export type GearStatus =
  | { kind: "guest" }
  | { kind: "unavailable" }
  | { kind: "account"; gear: GearItem[] };

const SENSOR_LABEL: Record<Mount, string> = { X: "APS-C", G: "中画幅" };

function equivalentRange(min: number, max: number, mount: Mount): string {
  return focalRangeDisplay(equivalentFocal(min, mount), equivalentFocal(max, mount));
}

function bodyLine(item: GearItem, brandName: (slug: string) => string): string {
  const body = item.catalogId ? getBodyById(item.catalogId) : undefined;
  if (!body) {
    return `- ${brandName(item.brand)} ${item.name}`;
  }
  const traits = [
    SENSOR_LABEL[body.mount],
    `${body.megapixels} 百万像素`,
    body.ibis ? "有机身防抖" : "无机身防抖",
  ];
  return `- ${brandName(item.brand)} ${body.name}（${traits.join("，")}）`;
}

function lensLine(item: GearItem, brandName: (slug: string) => string): string {
  if (item.manual) {
    const lens = item.manual;
    const traits = [
      "手动录入",
      `焦段 ${focalRangeDisplay(lens.focalMinMm, lens.focalMaxMm)}`,
      `等效 ${equivalentRange(lens.focalMinMm, lens.focalMaxMm, lens.mount)}`,
    ];
    if (lens.maxApertureWide !== undefined) {
      traits.push(
        `最大光圈 f/${lens.maxApertureWide}${lens.maxApertureTele !== undefined ? `–${lens.maxApertureTele}` : ""}`,
      );
    }
    if (lens.adapted) {
      traits.push(lens.originalMount ? `转接使用，原卡口 ${lens.originalMount}` : "转接使用");
    }
    return `- ${lens.brand} ${lens.model}（${traits.join("，")}）`;
  }
  const lens = item.catalogId ? getLensById(item.catalogId) : undefined;
  if (!lens) {
    return `- ${brandName(item.brand)} ${item.name}`;
  }
  const traits = [
    `ref ${lensRef(lens.id)}`,
    `焦段 ${focalRangeDisplay(lens.focalLengthMin, lens.focalLengthMax)}`,
    `等效 ${equivalentRange(lens.focalLengthMin, lens.focalLengthMax, lens.mount)}`,
  ];
  const aperture = primaryApertureDisplay(lens);
  if (aperture) {
    traits.push(`最大光圈 ${aperture}`);
  }
  return `- ${brandName(lens.brand)} ${lens.model}（${traits.join("，")}）`;
}

/** The per-turn context note on the user's gear; the system prompt says how to use it. */
export function gearContext(status: GearStatus, brandName: (slug: string) => string): string {
  const heading = "【用户器材】";
  if (status.kind === "guest") {
    return `${heading}\n用户未登录，不知道他有哪些器材。`;
  }
  if (status.kind === "unavailable" || status.gear.length === 0) {
    return `${heading}\n用户已登录，但不知道他有哪些器材${status.kind === "account" ? "（器材档案是空的）" : ""}。`;
  }
  const bodies = status.gear.filter((item) => item.kind === "body");
  const lenses = status.gear.filter((item) => item.kind === "lens");
  const lines = [heading, "用户已登录，器材档案里有："];
  if (bodies.length > 0) {
    lines.push("机身：", ...bodies.map((item) => bodyLine(item, brandName)));
  }
  if (lenses.length > 0) {
    lines.push("镜头：", ...lenses.map((item) => lensLine(item, brandName)));
  }
  return lines.join("\n");
}

/** Development-only request header the eval suite uses to give a turn a gear profile. */
export const EVAL_GEAR_HEADER = "x-askiris-eval-gear";

const evalGearSchema = z.strictObject({
  bodies: z.array(z.string()).default([]),
  lenses: z.array(z.string()).default([]),
});

/** Catalog ids from the eval header as gear items; unknown ids are dropped. */
export function evalGear(header: string | null): GearItem[] | undefined {
  if (!header) {
    return undefined;
  }
  let parsed;
  try {
    parsed = evalGearSchema.safeParse(JSON.parse(header));
  } catch {
    return undefined;
  }
  if (!parsed.success) {
    return undefined;
  }
  const bodies = parsed.data.bodies.flatMap((id): GearItem[] => {
    const body = getBodyById(id);
    return body
      ? [{ id: `eval-${id}`, kind: "body", catalogId: id, name: body.name, brand: "fujifilm", mount: body.mount, createdAt: 0 }]
      : [];
  });
  const lenses = parsed.data.lenses.flatMap((id): GearItem[] => {
    const lens = getLensById(id);
    return lens
      ? [{ id: `eval-${id}`, kind: "lens", catalogId: id, name: lens.model, brand: lens.brand, mount: lens.mount, createdAt: 0 }]
      : [];
  });
  return [...bodies, ...lenses];
}
