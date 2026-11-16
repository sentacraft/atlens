import { describe, expect, it } from "vitest";
import { getLensesByMount } from "@/lib/lens/data";
import { buildFeedbackFields, prepareFeedback, prepareFeedbackInputSchema, type PrepareFeedbackInput } from "../prepare-feedback";
import { buildLensTools, type ToolData } from "@/lib/ai/tools";

const input: PrepareFeedbackInput = { type: "general", description: "Please add this filter.", lensRef: null, field: null, suggestedCorrection: null, searchQuery: null, wantsReply: false, replyContact: null };
const guest: ToolData = { favorites: async () => null, gear: { known: false, reason: "guest" }, reviews: async () => new Map() };

describe("prepareFeedback", () => {
  it("prepares an anonymous draft without sending it or requiring an account", async () => {
    const tools = buildLensTools("X", "en", (brand) => brand, guest, new Set());
    const result = await tools.prepareFeedback.execute!(input, {} as never);
    expect(result).toMatchObject({ type: "general", description: input.description, wantsReply: false, replyContact: null });
    expect(result).toHaveProperty("id");
    expect(tools.prepareFeedback.toModelOutput!({ toolCallId: "test", input, output: result as never })).toEqual({ type: "text", value: expect.stringContaining("Nothing has been submitted") });
  });

  it("rejects a lens the conversation has not recalled", async () => {
    const tools = buildLensTools("X", "en", (brand) => brand, guest, new Set());
    expect(() => tools.prepareFeedback.execute!({ ...input, lensRef: "zzzzz" }, {} as never)).toThrow(/was not returned/);
  });

  it.each(["en", "zh"])("uses catalogue identity and the same fields as the manual entry in %s", (locale) => {
    const lens = getLensesByMount("X", locale).find((entry) => entry.weightG !== undefined)!;
    const draft = prepareFeedback({ ...input, type: "data_issue", field: "weight", wantsReply: true }, lens, locale, "FUJIFILM");
    expect(draft.fields).toEqual(buildFeedbackFields(lens, locale));
    expect(draft.context).toMatchObject({ lensId: lens.id, lensModel: lens.model, lensBrand: "FUJIFILM" });
    expect(draft.context?.currentValue).toBe(draft.fields.find((field) => field.label === draft.context?.field)?.currentValue);
    expect(draft.replyContact).toBeNull();
    expect(draft.wantsReply).toBe(true);
  });

  it("keeps a missing spec field available in the editor without inventing a current value", () => {
    const lens = { ...getLensesByMount("X", "en")[0], pricing: undefined };
    const draft = prepareFeedback({ ...input, type: "data_issue", field: "price" }, lens, "en", "FUJIFILM");
    expect(draft.fields).toContainEqual({ label: draft.context?.field });
    expect(draft.context?.currentValue).toBeUndefined();
  });

  it("keeps a missing-lens search separate from the description", () => {
    const draft = prepareFeedback({ ...input, searchQuery: "Sigma 50-100 F1.8" }, undefined, "en", "");
    expect(draft.context?.searchQuery).toBe("Sigma 50-100 F1.8");
    expect(draft.description).toBe(input.description);
  });

  it("does not silently turn arbitrary context into a missing-lens report", () => {
    expect(() => prepareFeedback({ ...input, type: "data_issue", searchQuery: "wrong weight" }, undefined, "en", "")).toThrow(/only for a missing lens/);
    expect(() => prepareFeedback({ ...input, field: "weight" }, undefined, "en", "")).toThrow(/requires a recalled lens/);
  });

  it("has bounded, portable fields and requires an explicit reply choice", () => {
    expect(prepareFeedbackInputSchema.safeParse(input).success).toBe(true);
    expect(prepareFeedbackInputSchema.safeParse({ ...input, wantsReply: undefined }).success).toBe(false);
    expect(prepareFeedbackInputSchema.safeParse({ ...input, description: "x".repeat(2001) }).success).toBe(false);
    expect(prepareFeedbackInputSchema.safeParse({ ...input, field: "invented" }).success).toBe(false);
  });
});
