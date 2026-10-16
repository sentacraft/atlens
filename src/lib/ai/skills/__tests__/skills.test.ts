import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { SKILL_NAMES, readSkill } from "@/lib/ai/skills";

describe("skill documents", () => {
  it("resolve every UI placeholder in each locale", () => {
    for (const name of SKILL_NAMES) {
      for (const locale of ["en", "zh"]) {
        expect(readSkill(name, locale), `${name} (${locale})`).not.toMatch(/\{\w+\.\w+\}/);
      }
    }
  });

  it("name spec fields the way the site's spec page does", () => {
    expect(readSkill("terms", "zh")).toContain(`"${zh.LensDetail.focusMotor}"`);
    expect(readSkill("terms", "en")).toContain(`"${en.LensDetail.minFocusDist}"`);
  });
});
