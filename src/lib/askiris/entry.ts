// How a visit to /askiris starts, resolved from its URL. `q` and `conversation` are
// mutually exclusive in intent; when both are present the hand-off query wins and a
// new conversation starts, because the visitor arrived with a new question.
export type AskIrisEntry =
  | { kind: "new" }
  | { kind: "handoff"; query: string }
  | { kind: "resume"; conversationId: string };

type SearchParamValue = string | string[] | undefined;

function first(value: SearchParamValue): string | undefined {
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

export function resolveAskIrisEntry(params: {
  q?: SearchParamValue;
  conversation?: SearchParamValue;
}): AskIrisEntry {
  const query = first(params.q);
  if (query) {
    return { kind: "handoff", query };
  }
  const conversationId = first(params.conversation);
  if (conversationId) {
    return { kind: "resume", conversationId };
  }
  return { kind: "new" };
}
