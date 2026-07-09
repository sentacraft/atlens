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

This is a **manual** eval, deliberately not wired into per-PR CI: it needs the app running
plus a DeepSeek key for the agent, and the judge needs an OpenAI key that must never reach
public CI.

## How it's built

- **`provider.mjs`** — a custom promptfoo provider. It POSTs each turn to `/api/chat`,
  rebuilds the streamed assistant message with the AI SDK's `readUIMessageStream` (threading
  prior turns back in for multi-turn cases), and returns two things: the ordered transcript
  (prose + recommendation cards, for the judge) and the structured tool-call trace on
  `metadata` (for the deterministic checks). This adapter is the only bespoke code — the
  transport (AI-SDK UI-message SSE) and domain (a `recommendLenses` output _is_ a card deck)
  are ours; everything else is promptfoo's.
- **`promptfooconfig.yaml`** — the cases and their graders, two tiers:
  - `javascript` assertions check invariants against the **tool-call trace** (did it sort by
    reach? do the picks stay in the focal band? is any pick over budget?). These read
    `context.metadata`; promptfoo's built-in assertions only grade output text, so
    trajectory checks have to be JS.
  - `search-rubric` is the LLM judge **with live web search** — it audits the picks against
    what the web actually recommends for the scenario (catching omissions our own data can't).
    The shared `rubricPrompt` under `defaultTest.options` carries the full judge system prompt.
- **Known gaps** — a judge failure we can't fix yet (a data gap the web-judge rightly flags)
  is marked `weight: 0`: the judge still runs and reports, but doesn't gate the suite, so it
  stays green on what we knowingly can't do and flips the moment something new breaks.
