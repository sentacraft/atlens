# AskIris behavior eval

A [promptfoo](https://promptfoo.dev) suite that runs the **live** AskIris agent — a real
`POST /api/chat` per case, so the current system prompt, tools, and recall are all under
test — and grades each turn. It catches prompt/behavior regressions that a frozen fixture
replay cannot.

## Run

Needs the dev server up (`localhost:3000`) and, for the judge, `EVAL_OPENAI_API_KEY` in `.env.local` —
its own OpenAI key, separate from the `OPENAI_API_KEY` Iris uses for GPT models.

```bash
# from the repo root
OPENAI_API_KEY=$(grep '^EVAL_OPENAI_API_KEY=' .env.local | cut -d= -f2-) \
  pnpm dlx promptfoo@latest eval -c eval/promptfoo/promptfooconfig.yaml

pnpm dlx promptfoo@latest view      # local web UI: browse results, compare runs
```

## Cost

Every case is a paid agent conversation (several model steps, ~14k input tokens each), and
every LLM-graded assertion is a paid judge call. Run as little as answers the question:

- Batch prompt edits and evaluate them together, not after each tweak.
- While iterating, run only the cases the change affects (`--filter-pattern`), once. Repeat
  (`--repeat 2`) only to confirm a result before pushing, or to tell a regression from noise.
- Run the full suite once per PR, when the prompt work is done.
- Check in Vitest whatever code decides (which note or tools a turn gets); the eval is only
  for what the model decides.
- A case that grades only whether the gear card showed sets `stopAtGearCard`, so it does not
  pay for the recommendation after the card.

`provider.mjs` imports `src/lib/ai/lens-ref.ts` directly rather than restating the hash,
so it needs the repo's pinned Node (see `.nvmrc`) for type stripping — a second copy of
that function would drift silently and the eval would measure the wrong thing.

This is a **manual** eval, deliberately not wired into per-PR CI: it needs the app running
plus a key for whichever provider `AGENT_MODEL` selects, and the judge needs an OpenAI key
that must never reach public CI.

By default the dev server's model is under test (`AGENT_MODEL` if set, read at startup). To
run the suite on another candidate without restarting, prefix the command with
`ASKIRIS_MODEL=<preset id>` from `src/lib/ai/model-presets.ts`; the provider sends it as the
development-only `x-askiris-model` header, so a run per preset compares models side by side.

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
