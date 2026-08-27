# AskIris behavior eval

A [promptfoo](https://promptfoo.dev) suite that runs the **live** AskIris agent — a real
`POST /api/chat` per case, so the current system prompt, tools, and recall are all under
test — and grades each turn. It catches prompt/behavior regressions that a frozen fixture
replay cannot.

## Run

Needs the dev server up (`localhost:3000`) and, for the judge, an OpenAI key.

```bash
# from the repo root
OPENAI_API_KEY=$(grep '^OPENAI_API_KEY=' .env.local | cut -d= -f2-) \
  npx promptfoo@latest eval -c eval/promptfoo/promptfooconfig.yaml

npx promptfoo@latest view      # local web UI: browse results, compare runs
```

`provider.mjs` imports `src/lib/ai/lens-ref.ts` directly rather than restating the hash,
so it needs the repo's pinned Node (see `.nvmrc`) for type stripping — a second copy of
that function would drift silently and the eval would measure the wrong thing.

This is a **manual** eval, deliberately not wired into per-PR CI: it needs the app running
plus a key for whichever provider `AGENT_MODEL` selects, and the judge needs an OpenAI key
that must never reach public CI.

Whichever model the dev server booted with is the one under test — `AGENT_MODEL` is read
server-side at startup, so switching candidates means editing `.env.local` **and restarting
the dev server**. The test-hook panel's AskIris tab shows what is actually live.

## How it's built

- **`provider.mjs`** — a custom promptfoo provider. It sends each turn to `/api/chat`
  through the AI SDK's `DefaultChatTransport` — the same transport `useChat` hands the
  browser, so the eval issues the request the real client builds rather than a second
  implementation of it — rebuilds the streamed assistant message with `readUIMessageStream`
  (threading prior turns back in for multi-turn cases), and returns two things: the ordered
  transcript (prose + recommendation cards, for the judge) and the structured tool-call
  trace on `metadata` (for the deterministic checks). What remains bespoke is the reading of
  a turn, not the moving of it: the domain mapping (a `recommendLenses` output _is_ a card
  deck) is ours; everything else is the SDK's or promptfoo's.
- **`promptfooconfig.yaml`** — the cases and their graders, two tiers:
  - `javascript` assertions check invariants against the **tool-call trace** (did it sort by
    reach? do the picks stay in the focal band? is any pick over budget?). These read
    `context.metadata`; promptfoo's built-in assertions only grade output text, so
    trajectory checks have to be JS.
  - `search-rubric` is the LLM judge **with live web search** — it audits the picks against
    what the web actually recommends for the scenario (catching omissions our own data can't).
    The shared `rubricPrompt` under `defaultTest.options` carries the full judge system prompt.
- **Observed, not gated** — the web-searching judges read the live web, so their verdict
  moves with what the search returns that minute. They are wrapped in an `assert-set` with
  `threshold: 0`: the judge still runs and its reasoning still shows up in the results, but
  it cannot fail the case. (`weight: 0` does **not** do this — promptfoo computes
  `pass = !failedReason`, so a zero-weight assertion still fails the case.)
