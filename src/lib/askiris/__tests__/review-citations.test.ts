import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { parseChatLink } from "@/lib/askiris/inline-links";
import { messageCitations, sourceHref } from "@/lib/askiris/review-citations";

const source = (id: string, url = `https://example.com/${id}`) => ({ id, url, site: `Site ${id}`, lang: "en", kind: "measured" as const });

function reviews(id: string, lenses: { sources: ReturnType<typeof source>[] }[]): UIMessage["parts"][number] {
  return { type: "tool-lensReviews", toolCallId: id, state: "output-available", input: {}, output: { lenses, note: "" } } as never;
}

const text = (value: string) => ({ type: "text" as const, text: value });

describe("source links", () => {
  it("parse an opaque source ref and nothing else", () => {
    expect(parseChatLink("source:k3x9q")).toEqual({ kind: "source", key: "k3x9q" });
    expect(parseChatLink("source:vu3cw/et")).toBeNull();
    expect(parseChatLink("source:")).toBeNull();
  });
});

describe("messageCitations", () => {
  it("numbers cited sources by first citation, then the fetched ones left uncited", () => {
    const message: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        reviews("c1", [{ sources: [source("fv"), source("mb"), source("et")] }]),
        text("Sharp [Site et](source:et) and smooth [Site fv](source:fv), again [x](source:et)."),
      ],
    };
    const { list, byKey } = messageCitations([message], 0);
    expect(list.map((entry) => [entry.number, entry.key])).toEqual([
      [1, "et"],
      [2, "fv"],
      [3, "mb"],
    ]);
    expect(byKey.get("fv")?.source.site).toBe("Site fv");
  });

  it("resolves a citation against reviews fetched in an earlier turn, and drops one that resolves nowhere", () => {
    const earlier: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [reviews("c1", [{ sources: [source("ol")] }]), text("Slow AF.")],
    };
    const later: UIMessage = {
      id: "a2",
      role: "assistant",
      parts: [text("As before [OL](source:ol), and [made up](source:zz).")],
    };
    const { list } = messageCitations([earlier, { id: "u2", role: "user", parts: [text("and?")] }, later], 2);
    expect(list.map((entry) => entry.key)).toEqual(["ol"]);
  });
});

describe("sourceHref", () => {
  it("keeps http(s) links and refuses any other scheme", () => {
    expect(sourceHref(source("a"))).toBe("https://example.com/a");
    expect(sourceHref(source("b", "javascript:alert(1)"))).toBeUndefined();
    expect(sourceHref(source("c", "not a url"))).toBeUndefined();
  });
});
