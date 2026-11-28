import { normalizeRefListLinks, type LensLinkIndex } from "@/lib/ai/lens-ref";
import { parseChatLink } from "@/lib/askiris/inline-links";

export type ReplyAction = { kind: "reviews"; refs: string[] } | { kind: "compare"; refs: string[] };

export interface ExtractReplyActionsOptions {
  canResolve?: (action: ReplyAction) => boolean;
  streaming?: boolean;
}

const STREAMING_INCOMPLETE_ACTION_RE = /[ \t]*\[\]\((?:reviews|compare):[^)\n]*$/;
const LIST_PREFIX_RE = /^[ \t]*(?:[-*+]|\d+[.)])[ \t]+/;
const STANDALONE_TRAILING_PUNCT = new Set([" ", "\t", "(", ")", "\uff08", "\uff09", ".", "\u3002", "!", "\uff01", ",", "\uff0c"]);

// Colon-introduced trailing action link (empty or legacy labelled, optionally wrapped in parens).
const COLON_TRAILING_ACTION_RE =
  /([:\uff1a])[ \t]*(?:\([ \t]*\[([^[\]\n]*)\]\(((?:reviews|compare):[^)\n]+)\)[ \t]*\)|\uff08[ \t]*\[([^[\]\n]*)\]\(((?:reviews|compare):[^)\n]+)\)[ \t]*\uff09|\[([^[\]\n]*)\]\(((?:reviews|compare):[^)\n]+)\))[ \t]*([.\u3002!\uff01])?[ \t]*$/;

// Trailing empty-label action link without a preceding colon (optionally wrapped in matching parens).
const BARE_TRAILING_ACTION_RE =
  /[ \t]*(?:\([ \t]*\[\]\(((?:reviews|compare):[^)\n]+)\)[ \t]*\)|\uff08[ \t]*\[\]\(((?:reviews|compare):[^)\n]+)\)[ \t]*\uff09|\[\]\(((?:reviews|compare):[^)\n]+)\))[ \t]*([.\u3002!\uff01])?[ \t]*$/;

function parseAction(href: string): ReplyAction | null {
  const normalized = normalizeRefListLinks(`[](${href})`);
  const match = normalized.match(/^\[\]\((.*)\)$/);
  const link = parseChatLink(match ? match[1] : href);
  if (link?.kind === "reviews" || link?.kind === "compare") {
    return { kind: link.kind, refs: link.refs };
  }
  return null;
}

export function replyActionKey(action: ReplyAction): string {
  return `${action.kind}:${[...action.refs].sort().join(",")}`;
}

export function canResolveReplyAction(action: ReplyAction, lenses: LensLinkIndex | undefined): boolean {
  if (!lenses) {
    return false;
  }
  const resolved = action.refs.map((ref) => lenses[ref]);
  if (resolved.some((entry) => entry === undefined)) {
    return false;
  }
  if (action.kind === "compare") {
    return new Set(resolved.map((entry) => entry!.mount)).size === 1;
  }
  return true;
}

export function dedupeReplyActions(actions: ReplyAction[]): ReplyAction[] {
  const unique: ReplyAction[] = [];
  const seen = new Set<string>();
  for (const action of actions) {
    const key = replyActionKey(action);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(action);
  }
  return unique;
}

function computeFenceFlags(lines: string[]): boolean[] {
  const flags: boolean[] = [];
  let activeFence: { char: string; len: number } | null = null;
  for (const line of lines) {
    if (activeFence) {
      flags.push(true);
      const closeMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})[ \t]*$/);
      if (closeMatch && closeMatch[1][0] === activeFence.char && closeMatch[1].length >= activeFence.len) {
        activeFence = null;
      }
      continue;
    }
    const openMatch = line.match(/^[ ]{0,3}(`{3,}|~{3,})(.*)$/);
    if (openMatch && (openMatch[1][0] === "~" || !openMatch[2].includes("`"))) {
      activeFence = { char: openMatch[1][0], len: openMatch[1].length };
      flags.push(true);
      continue;
    }
    flags.push(false);
  }
  return flags;
}

// Linear-time scan prevents regex backtracking when lines contain multiple incomplete or invalid links.
function parseStandaloneActionLine(
  line: string,
  canResolve: (action: ReplyAction) => boolean,
): ReplyAction[] | null {
  const prefixMatch = line.match(LIST_PREFIX_RE);
  const rest = prefixMatch ? line.slice(prefixMatch[0].length) : line;
  const lineActions: ReplyAction[] = [];
  let pos = 0;

  while (pos < rest.length) {
    while (pos < rest.length && STANDALONE_TRAILING_PUNCT.has(rest[pos])) {
      pos++;
    }
    if (pos >= rest.length) {
      break;
    }
    if (rest[pos] !== "[") {
      return null;
    }
    const closeBracket = rest.indexOf("]", pos + 1);
    if (closeBracket === -1 || rest[closeBracket + 1] !== "(") {
      return null;
    }
    const innerLabel = rest.slice(pos + 1, closeBracket);
    if (innerLabel.includes("[") || innerLabel.includes("\n")) {
      return null;
    }
    const closeParen = rest.indexOf(")", closeBracket + 2);
    if (closeParen === -1) {
      return null;
    }
    const href = rest.slice(closeBracket + 2, closeParen);
    const action = parseAction(href);
    if (!action || !canResolve(action)) {
      return null;
    }
    lineActions.push(action);
    pos = closeParen + 1;
  }

  return lineActions.length > 0 ? lineActions : null;
}

function stripTrailingActionsFromLine(
  line: string,
  canResolve: (action: ReplyAction) => boolean,
): { line: string; actions: ReplyAction[]; modified: boolean } {
  let updated = line;
  const reversedActions: ReplyAction[] = [];
  let modified = false;

  while (true) {
    const colonMatch = updated.match(COLON_TRAILING_ACTION_RE);
    if (colonMatch) {
      const href = colonMatch[3] ?? colonMatch[5] ?? colonMatch[7];
      const action = href ? parseAction(href) : null;
      if (action && canResolve(action)) {
        reversedActions.push(action);
        const colon = colonMatch[1];
        const punct = colon === "\uff1a" ? "\u3002" : ".";
        updated = updated.slice(0, colonMatch.index) + punct;
        modified = true;
        continue;
      }
    }

    const bareMatch = updated.match(BARE_TRAILING_ACTION_RE);
    if (bareMatch) {
      const href = bareMatch[1] ?? bareMatch[2] ?? bareMatch[3];
      const action = href ? parseAction(href) : null;
      if (action && canResolve(action)) {
        reversedActions.push(action);
        const endPunct = bareMatch[4] ?? "";
        const prefix = updated.slice(0, bareMatch.index);
        // Avoid doubling terminal punctuation when the link sits after an already punctuated sentence.
        const endsWithPunct = /[.\u3002!\uff01?\uff1f]$/.test(prefix);
        updated = prefix + (endsWithPunct ? "" : endPunct);
        modified = true;
        continue;
      }
    }

    break;
  }

  return {
    line: updated,
    actions: reversedActions.reverse(),
    modified,
  };
}

/**
 * Extracts trailing `reviews:` and `compare:` action links from the end of an Iris reply
 * so the UI can render them as a fixed-label action row below the prose while leaving
 * mid-sentence prose, nested lists, code blocks, and unresolvable links untouched.
 */
export function extractReplyActions(
  markdown: string,
  options: ExtractReplyActionsOptions = {},
): { markdown: string; actions: ReplyAction[] } {
  const canResolve = options.canResolve ?? (() => true);
  const lines = markdown.split("\n");
  const fenceFlags = computeFenceFlags(lines);
  let mutated = false;

  if (options.streaming) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim() === "") {
        continue;
      }
      if (!fenceFlags[i]) {
        const stripped = lines[i].replace(STREAMING_INCOMPLETE_ACTION_RE, "");
        if (stripped !== lines[i]) {
          lines[i] = stripped.trimEnd();
          mutated = true;
        }
      }
      break;
    }
  }

  const removedLineIndices = new Set<number>();
  const trailingLineBlocks: ReplyAction[][] = [];
  let lastProseIdx = -1;

  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() === "") {
      continue;
    }
    if (fenceFlags[i]) {
      lastProseIdx = i;
      break;
    }
    const lineActions = parseStandaloneActionLine(lines[i], canResolve);
    if (lineActions) {
      trailingLineBlocks.push(lineActions);
      removedLineIndices.add(i);
      mutated = true;
      continue;
    }
    lastProseIdx = i;
    break;
  }

  let inlineTrailingActions: ReplyAction[] = [];
  if (lastProseIdx >= 0 && !fenceFlags[lastProseIdx]) {
    const result = stripTrailingActionsFromLine(lines[lastProseIdx], canResolve);
    if (result.modified) {
      lines[lastProseIdx] = result.line;
      inlineTrailingActions = result.actions;
      mutated = true;
    }
  }

  if (!mutated) {
    return { markdown, actions: [] };
  }

  const keptLines = lines.filter((_, idx) => !removedLineIndices.has(idx));
  while (keptLines.length > 0 && keptLines[keptLines.length - 1].trim() === "") {
    keptLines.pop();
  }

  const orderedActions = dedupeReplyActions([
    ...inlineTrailingActions,
    ...trailingLineBlocks.reverse().flat(),
  ]);

  return {
    markdown: keptLines.join("\n"),
    actions: orderedActions,
  };
}
