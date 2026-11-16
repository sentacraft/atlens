import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh.json";
import { SPEC_GUIDE } from "@/lib/ai/spec-guide";
import { fillUiStrings } from "@/lib/ui-strings";

describe("spec guide", () => {
  it.each(["en", "zh"])("resolves every UI placeholder in %s", (locale) => {
    expect(fillUiStrings(SPEC_GUIDE.text, locale)).not.toMatch(/\{\w+\.\w+\}/);
  });

  it("names spec fields the way the site's spec page does", () => {
    expect(fillUiStrings(SPEC_GUIDE.text, "zh")).toContain(`"${zh.LensDetail.focusMotor}"`);
    expect(fillUiStrings(SPEC_GUIDE.text, "en")).toContain(`"${en.LensDetail.minFocusDist}"`);
  });
});
