import type { UIMessage } from "ai";
import { expect, it } from "vitest";
import { withoutHistoricalImageReads } from "../lens-details-history";

it("keeps historical images visible in chat without sending their pixels to the model again", () => {
  const output = { readRefs: ["lens:001"], displayImages: [{ imageRef: "lens:001" }] };
  const detail = { type: "tool-lensDetails", state: "output-available", toolCallId: "details", input: {}, output } as const;
  const other = { ...detail, type: "tool-another", toolCallId: "another" } as const;
  const message: UIMessage = { id: "assistant", role: "assistant", parts: [detail, other] };

  expect(withoutHistoricalImageReads(message).parts).toEqual([
    { ...detail, output: { ...output, readRefs: [] } },
    other,
  ]);
  expect(message.parts[0]).toBe(detail);
  expect(output.readRefs).toEqual(["lens:001"]);
});
