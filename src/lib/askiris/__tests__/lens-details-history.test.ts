import type { UIMessage } from "ai";
import { expect, it } from "vitest";
import { withHistoricalTablePresentation } from "../lens-details-history";

it("marks a past table historical and sends past lens images back to the model as they were", () => {
  const images = { type: "tool-showLensImages", state: "output-available", toolCallId: "images", input: {}, output: { displayImages: [{ imageRef: "lens:001" }] } } as const;
  const table = { ...images, type: "tool-listLenses", toolCallId: "table", output: { columns: ["lensConfiguration"] } } as const;
  const other = { ...images, type: "tool-another", toolCallId: "another" } as const;
  const message: UIMessage = { id: "assistant", role: "assistant", parts: [images, table, other] };

  expect(withHistoricalTablePresentation(message).parts).toEqual([
    images,
    { ...table, output: { ...table.output, historical: true } },
    other,
  ]);
  expect(message.parts[1]).toBe(table);
});
