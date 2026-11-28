import { normalizeRefListLinks } from "@/lib/ai/lens-ref";
import { parseChatLink } from "@/lib/askiris/inline-links";

export type ReplyAction = { kind: "reviews"; refs: string[] } | { kind: "compare"; refs: string[] };

const EMPTY_ACTION_LINK_RE = /\[\]\(((?:reviews|compare):[^)\n]+)\)/g;
const STANDALONE_LINE_RE = /^[ \t]*(?:\[[^[\]\n]*\]\(((?:reviews|compare):[^)\n]+)\)[ \t]*[.。]?[ \t]*)+$/;
const STANDALONE_LINK_ITEM_RE = /\[[^[\]\n]*\]\(((?:reviews|compare):[^)\n]+)\)/g;
const TRAILING_COLON_ACTION_RE = /([:：])[ \t]*\[[^[\]\n]*\]\(((?:reviews|compare):[^)\n]+)\)[ \t]*([.。])?[ \t]*$/;

function parseAction(href: string): ReplyAction | null {
  const link = parseChatLink(href);
  if (link?.kind === "reviews" || link?.kind === "compare") {
    return { kind: link.kind, refs: link.refs };
  }
  return null;
}

function addUnique(actions: ReplyAction[], seen: Set<string>, action: ReplyAction) {
  const key = `${action.kind}:${action.refs.join(",")}`;
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  actions.push(action);
}

/**
 * Extracts standalone or trailing `reviews:` and `compare:` action links from an Iris reply
 * so the UI can render them as a fixed-label action row below the prose. Mid-sentence links
 * with authored anchor text remain inline to preserve sentence grammar on older messages.
 */
export function extractReplyActions(markdown: string): { markdown: string; actions: ReplyAction[] } {
  const normalized = normalizeRefListLinks(markdown);
  const actions: ReplyAction[] = [];
  const seen = new Set<string>();

  const keptLines: string[] = [];
  for (const line of normalized.split("\n")) {
    // 1. Standalone line of one or more action links (empty or legacy labelled).
    if (STANDALONE_LINE_RE.test(line)) {
      const lineActions: ReplyAction[] = [];
      let allValid = true;
      for (const m of line.matchAll(STANDALONE_LINK_ITEM_RE)) {
        const action = parseAction(m[1]);
        if (!action) {
          allValid = false;
          break;
        }
        lineActions.push(action);
      }
      if (allValid && lineActions.length > 0) {
        for (const a of lineActions) {
          addUnique(actions, seen, a);
        }
        continue;
      }
    }

    // 2. Empty-label action links embedded at end or inside a line, preserving sentence flow.
    let updated = line.replace(EMPTY_ACTION_LINK_RE, (full, href: string) => {
      const action = parseAction(href);
      if (!action) {
        return full;
      }
      addUnique(actions, seen, action);
      return "";
    });

    // 3. Trailing colon-introduced labelled link (legacy format), restoring final punctuation.
    while (true) {
      const match = updated.match(TRAILING_COLON_ACTION_RE);
      if (!match) {
        break;
      }
      const action = parseAction(match[2]);
      if (!action) {
        break;
      }
      addUnique(actions, seen, action);
      const colon = match[1];
      const punct = colon === "：" ? "。" : ".";
      updated = updated.slice(0, match.index) + punct;
    }

    // Clean leftover spaces before sentence punctuation when an inline empty link was removed.
    keptLines.push(updated.replace(/[ \t]+([.。])/g, "$1").replace(/[ \t]{2,}/g, " ").trimEnd());
  }

  const cleaned = keptLines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { markdown: cleaned, actions };
}
