import { describe, expect, it } from "vitest";
import { safeValidateUIMessages } from "ai";
import { buildLensTools } from "@/lib/ai/tools";
import { database, image, insert, legacyAssistant, LEGACY, migrated, read } from "./support/legacy-lens-details";

describe("0009_migrate_legacy_lens_details", () => {
  it("rewrites a legacy {refs} input to {lenses}", () => {
    const db = database();
    insert(db, "m", { id: "a", role: "assistant", parts: [{ type: "tool-lensDetails", toolCallId: "c", state: "input-available", input: { refs: ["r1", "r2"] } }] });
    db.exec(LEGACY);
    expect(read(db, "m").parts[0].input).toEqual({ lenses: [{ ref: "r1" }, { ref: "r2" }] });
  });

  it("splits a lensDetails part with images into specs and a showLensImages part, flattening galleries and numbering figures", () => {
    const db = database();
    insert(db, "m", legacyAssistant(), { mount: "X", locale: "en" });
    db.exec(LEGACY);
    const { parts } = read(db, "m");
    expect(parts.map((part: { type: string }) => part.type)).toEqual(["text", "tool-lensDetails", "tool-showLensImages", "text"]);

    const [, details, images] = parts;
    expect(details.input).toEqual({ lenses: [{ ref: "lensA" }] });
    expect(details.output).toEqual({
      lenses: [{ ref: "lensA", name: "Lens A", maxAperture: 2.8, focalNativeMm: [16, 55], weightG: 655 }],
      notInData: "For field performance and opinions, use lensReviews.",
    });

    expect(images).toMatchObject({ toolCallId: "call-1-images", state: "output-available" });
    expect(images.input).toEqual({ lenses: [{ ref: "lensA", images: [{ role: "mtf" }, { role: "optical-construction" }] }] });
    expect(images.output.lenses).toEqual([{
      ref: "lensA", name: "Lens A", maxAperture: 2.8, focalNativeMm: [16, 55],
      images: [{ imageRef: "lensA:image-001", id: "001", role: "mtf" }],
      imageResults: [{ role: "mtf", status: "selected", selected: ["lensA:image-001"] }],
    }]);
    expect(images.output.displayImages.map((entry: { imageRef: string; figure: number; figureLabel: string }) => [entry.imageRef, entry.figure, entry.figureLabel])).toEqual([
      ["lensA:image-001", 1, "Fig. 1"], ["lensA:image-002", 2, "Fig. 2"], ["lensA:image-010", 3, "Fig. 3"],
    ]);
    expect(images.output.displayImages.every((entry: object) => !("gallery" in entry))).toBe(true);
  });

  it("numbers across several lensDetails parts of one message and labels in English", () => {
    const db = database();
    const message = legacyAssistant();
    const second = JSON.parse(JSON.stringify(message.parts[1]));
    second.toolCallId = "call-2";
    second.output.displayImages = [image("020", "mtf")];
    message.parts.splice(2, 0, second);
    insert(db, "m", message, { mount: "X", locale: "en" });
    db.exec(LEGACY);
    const shown = read(db, "m").parts.filter((part: { type: string }) => part.type === "tool-showLensImages");
    expect(shown.map((part: { toolCallId: string }) => part.toolCallId)).toEqual(["call-1-images", "call-2-images"]);
    expect(shown.flatMap((part: { output: { displayImages: { figureLabel: string }[] } }) => part.output.displayImages.map((entry) => entry.figureLabel))).toEqual(["Fig. 1", "Fig. 2", "Fig. 3", "Fig. 4"]);
  });

  it("takes the label locale from the conversation's other context when the message has none, else zh", () => {
    const db = database();
    insert(db, "ctx", { id: "u", role: "user", parts: [{ type: "text", text: "q" }] }, { mount: "X", locale: "en" }, 0);
    insert(db, "m", legacyAssistant(), undefined, 1);
    db.exec(LEGACY);
    expect(read(db, "m").parts[2].output.displayImages[0].figureLabel).toBe("Fig. 1");

    const bare = database();
    insert(bare, "m", legacyAssistant());
    bare.exec(LEGACY);
    expect(read(bare, "m").parts[2].output.displayImages[0].figureLabel).toBe("图 1");
  });

  it("strips the image fields from a lensDetails part with an empty displayImages and adds no showLensImages part", async () => {
    const db = database();
    const message = legacyAssistant({ displayImages: [] });
    insert(db, "m", message, { mount: "X", locale: "en" });
    db.exec(LEGACY);
    const { parts } = read(db, "m");
    expect(parts.map((part: { type: string }) => part.type)).toEqual(["text", "tool-lensDetails", "text"]);
    expect(parts[1].output).toEqual({
      lenses: [{ ref: "lensA", name: "Lens A", maxAperture: 2.8, focalNativeMm: [16, 55], weightG: 655 }],
      notInData: "For field performance and opinions, use lensReviews.",
    });
    const once = JSON.stringify(read(db, "m"));
    db.exec(LEGACY);
    expect(JSON.stringify(read(db, "m"))).toBe(once);

    const tools = buildLensTools("X", "zh", (brand) => brand, { favorites: async () => null, gear: async () => ({ known: false, reason: "guest" }), reviews: async () => new Map() }, new Set());
    const result = await safeValidateUIMessages({
      messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "q" }] }, read(db, "m"), { id: "u2", role: "user", parts: [{ type: "text", text: "next" }] }],
      tools,
    });
    expect(result.success, result.success ? "" : String(result.error)).toBe(true);
  });

  it("is idempotent and leaves other messages alone", () => {
    const db = database();
    insert(db, "m", legacyAssistant(), { mount: "X", locale: "en" }, 0);
    const plain = { id: "p", role: "assistant", parts: [{ type: "tool-lensDetails", toolCallId: "x", state: "output-available", input: { lenses: [{ ref: "r" }] }, output: { lenses: [] } }] };
    insert(db, "plain", plain, undefined, 1);
    db.exec(LEGACY);
    const once = [read(db, "m"), read(db, "plain")];
    db.exec(LEGACY);
    expect([read(db, "m"), read(db, "plain")]).toEqual(once);
    expect(read(db, "plain")).toEqual(plain);
  });

  it("produces messages that pass validation against the current tools", async () => {
    const tools = buildLensTools("X", "zh", (brand) => brand, { favorites: async () => null, gear: async () => ({ known: false, reason: "guest" }), reviews: async () => new Map() }, new Set());
    const result = await safeValidateUIMessages({
      messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "q" }] }, migrated(), { id: "u2", role: "user", parts: [{ type: "text", text: "next" }] }],
      tools,
    });
    expect(result.success, result.success ? "" : String(result.error)).toBe(true);
  });
});
