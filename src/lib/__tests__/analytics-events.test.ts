import { describe, expect, it } from "vitest";
import { toDataPoint } from "../analytics/events";

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
