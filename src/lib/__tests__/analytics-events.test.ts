import { describe, expect, it } from "vitest";
import { askirisTurnDataPoint, toDataPoint } from "../analytics/events";

describe("toDataPoint", () => {
  it("maps the AskIris message method to the secondary string", () => {
    expect(
      toDataPoint(
        "askiris_message",
        "sid",
        "zh",
        { method: "typed" },
        false,
      ),
    ).toEqual({
      indexes: ["askiris_message"],
      blobs: ["sid", "zh", "", "", "typed", "", ""],
      doubles: [0],
    });
  });
});

describe("askirisTurnDataPoint", () => {
  it("stores the maximum single-step context separately from cumulative input usage", () => {
    expect(
      askirisTurnDataPoint({
        mount: "X",
        locale: "zh",
        sid: "sid",
        segmentId: "segment",
        internal: false,
        totalTokens: 1200,
        inputTokens: 900,
        outputTokens: 300,
        cacheReadTokens: 500,
        stepCount: 3,
        budgetHit: false,
        maxContextTokens: 400,
      }),
    ).toEqual({
      indexes: ["askiris_turn"],
      blobs: ["X", "zh", "sid", "segment", ""],
      doubles: [1200, 900, 300, 500, 3, 0, 400],
    });
  });
});
