import type { UIMessage } from "ai";
import wildlifeJson from "./wildlife.json";

// Captured/synthesized message threads for deterministic UI work — feed one to
// AskIrisChat via `?fixture=<name>` (dev only) to reproduce a rendered reply
// without an LLM round-trip. `wildlife` is a real captured session; the others
// derive edge cases (carousel overflow, a Markdown summary table) from it.

// Minimal view of a recommendLenses tool part, enough to reshape decks.
type DeckPart = {
  type: string;
  output?: { recommendations: unknown[] };
};

const wildlife = wildlifeJson as unknown as UIMessage[];

function clone(messages: UIMessage[]): UIMessage[] {
  return JSON.parse(JSON.stringify(messages));
}

function allRecommendations(messages: UIMessage[]): unknown[] {
  const recs: unknown[] = [];
  for (const message of messages) {
    for (const part of message.parts as unknown as DeckPart[]) {
      if (part.type === "tool-recommendLenses" && part.output) {
        recs.push(...part.output.recommendations);
      }
    }
  }
  return recs;
}

// One deck of 6 cards — forces the horizontal shelf to overflow/scroll.
function makeCarousel(): UIMessage[] {
  const messages = clone(wildlife);
  const recs = allRecommendations(messages).slice(0, 6);
  const assistant = messages[1];
  const deck = (assistant.parts as unknown as DeckPart[]).find(
    (p) => p.type === "tool-recommendLenses",
  );
  const rebuilt = deck ? { ...deck, output: { recommendations: recs } } : null;
  assistant.parts = [
    {
      type: "text",
      text: "### 长焦一组（carousel 压力测试）\n这一组塞了 6 支，用来验证横向滚动的表现：",
    },
    ...(rebuilt ? [rebuilt] : []),
  ] as unknown as UIMessage["parts"];
  return messages;
}

// A reply whose summary is a Markdown table — verifies table styling/scroll.
function makeTable(): UIMessage[] {
  const messages = clone(wildlife);
  const tablePart = {
    type: "text",
    text: [
      "### 简单总结",
      "",
      "| 你需要的情况 | 更适合的选择 |",
      "| --- | --- |",
      "| 想要最长焦段、一镜走野外 | 富士 XF 150-600mm F5.6-8 R LM OIS WR |",
      "| 预算有限、追求性价比 | 腾龙 150-500mm F/5-6.7 Di III VC VXD |",
      "| 要最轻便的顶级画质定焦 | 富士 XF 500mm F5.6 R LM OIS WR |",
      "",
    ].join("\n"),
  };
  const parts = messages[1].parts as unknown as unknown[];
  parts.push(tablePart);
  return messages;
}

export const FIXTURES: Record<string, UIMessage[]> = {
  wildlife,
  carousel: makeCarousel(),
  table: makeTable(),
};
