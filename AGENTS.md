# Atlens

Fujifilm lens comparison tool — X mount, with GF (medium format) coverage under way.
Next.js App Router + TypeScript, Tailwind, next-intl, deployed to Cloudflare Workers via OpenNext.

## Commands

pnpm only. The repo has no `package-lock.json` and `package.json`'s own scripts call `pnpm`.
Never run `npm` or `yarn` — they resolve dependencies differently and write a lockfile that
must not exist here.

Scripts are in `package.json`. `pnpm run lint` must pass before committing.

Run `pnpm run preview` before merging any change to routing, rendering mode, or
`next.config.ts`: some regressions appear only on workerd. See the `//preview` and `//start`
entries in `package.json` for why `next start` is not a substitute.

## Project layout

Business logic, types, and data access live in `src/lib/`; components under `src/components/`
render and do not embed business logic. Keep that separation when adding code — the split
exists so the logic layer can move to a shared package later.

Components do not call `fetch` or hard-code API paths: each feature's requests live in a client
module under `src/lib/`, and client-side reads go through TanStack Query. Each feature's URL query
params are named, parsed, and written in one module under `src/lib/url/`.

Rate limits go through `src/lib/rate-limit.ts`, which lists every limit the app enforces.

An Ask Iris server tool that needs an account is listed in `src/lib/ai/sign-in-gate.ts`: a guest's
call pauses the turn on the shared sign-in card and resumes once they sign in. Iris's prompts never
word sign-in themselves.

Internal page paths come from `src/lib/url/routes.ts` (and `buildComparePath` in `src/lib/url/compare.ts`); the site's domain, repository, and contact address come from `SITE` in `src/config/site.ts`. Don't spell them out in components.

Each exported route handler under `src/app/api/` carries a one-line JSDoc (what it does, who may
call it, main error statuses); `docs/api.md` is generated from them. A request body or payload
shared by a client module and its route is one Zod schema in `src/lib/`, imported by both.

A new page, user-facing feature, or API route goes through `docs/launch-checklist.md`: the places
outside its own code that it may need to change. The PR description says which items changed and
which do not apply.

Pure helpers and UI state used by a single component stay in its file; extract when the code does
I/O, carries testable logic, or gains a second consumer.

When a shared component or helper gains a caller, redesign its props around every caller as equals
and update the existing call sites, rather than adding optional props so old calls stay unchanged.

Mockups and design explorations use Open Artifacts (see Code style). Demos and UX experiments
that need the app's own code or data belong under `src/app/[locale]/design-lab/`, never in production
code. Pages and components there — and all Test Hook pages and components — hardcode English
strings, do not use `next-intl`, and must not add keys to `en.json` or `zh.json`.

## Code style

ESLint is the sole style authority; run `pnpm run lint`. The project deliberately has no
Prettier — do not add one, and do not bulk-reformat files.

Reusable visual language — interaction colors, button styles, selected states — is defined and
exported from `src/config/ui-tokens.ts` and imported by components. Do not inline duplicate
style strings across components. Inline only genuinely one-off local styles.

A dialog with something to fill in or pick puts its Cancel in `DialogCancel` (phone drawers leave
it out); a yes-or-no confirmation keeps its Cancel. A centered dialog blocks outside presses and
always shows a close button or a Cancel; only dialogs without inputs, pending choices,
confirmations, or in-progress work may opt into `dismissOnOutsidePress`.

A lens shown as an item to browse gets favorite and compare only from `LensActions`; don't build
those buttons anywhere else.

Designs have one editable source: private cloud Open Artifacts, accessed through the remote
`artifact` MCP. Read their URIs from the tracked `.open-artifacts.json` at the project root.
Keep credentials out of this mapping; each device authorizes independently. Never commit private design files.

The design system mirrors the theme, fonts, `ui-tokens.ts` and the components listed in
`scripts/hooks/ui-token-review.mjs`; a PR that changes how any of them looks says which part of the
design system it affects.

Device insets (iOS notch, home indicator, Window Controls Overlay) are consumed through the
`--safe-inset-*` and `--titlebar-height` variables declared in `src/app/theme.css`. Never call
`env(safe-area-inset-*)` directly in a component. Cover any new inset in
`e2e/pwa-safe-area.spec.ts`.

Size one-screen pages with `--page-height` (set by `KeyboardInsets`, above the on-screen keyboard);
never read `visualViewport` in a component.

Chinese text belongs only in the files `scripts/hooks/cjk-guard.mjs` allows: UI copy in `zh.json`, data,
and a few listed exceptions. Tests and eval cases contain Chinese only when they check Chinese input
contain Chinese only when they check Chinese input or output (a Chinese query, zh-locale rendering,
bilingual data); otherwise they use English.

Write all code comments in English. Default to no comment. Write one only where a reader would
otherwise "fix" the code back — it looks wrong or roundabout but is required — and say in a line
or two what breaks without it, linking the upstream issue or spec when there is one.

Background, design rationale, alternatives considered, and bug histories belong in the commit
message or PR description, not in the source.

## Environment variables

- Read secrets and per-environment config from `process.env`, and Cloudflare bindings from
  `getCloudflareContext().env`.
- Non-secret config lives in `wrangler.toml` `[vars]`; override it in `.env.local` only where the
  local value must differ.
- Add secrets with `pnpm run secret:add`. Setting a production value changes production, so ask
  first, and third-party key values never pass through the chat.
- Branch previews (`<branch>.preview.atlens.app`) inherit nothing from production. Declare every
  new var or binding again under `[previews]` in `wrangler.toml`, pointing storage at a preview
  copy; `--prod` on `secret:add` also sets the preview secret.
- Google sign-in works locally only on ports 3000 (`dev`) and 8787 (`preview`).

## Data

- `src/data/lenses.json` and `src/data/lenses-gfx.json` come from the data pipeline at the commit
  pinned in `src/data/catalog-source.json` (`pnpm run catalog:fetch`). Never edit them; data
  corrections go through the pipeline.
- `src/data/collections.json` and `src/data/brands.json` are hand-authored and may be edited
  directly; their copy follows `src/data/collections.md`.
- The `Lens` JSDoc in `src/lib/types.ts` is the pipeline's field-extraction spec. Do not trim it.

## Testing

Every bug fix ships with a regression test. Write the failing test first, then fix the code.
Tests live in a `__tests__/` directory beside the module under test. Choose the lightest layer
that covers the bug:

| Bug type | Layer |
|---|---|
| Pure logic — utilities, transforms, calculations | Vitest |
| Component rendering or hook behavior | Vitest + `@testing-library/react` + jsdom (`// @vitest-environment jsdom`) |
| Layout, interaction, browser APIs — fixed positioning, scroll, ResizeObserver, viewport | Playwright (`e2e/`), `@local-only` unless it meets the cost rule below |
| Pure CSS — color, spacing, font size, no conditional logic | No test required; verify with a screenshot |

The AskIris eval (`eval/promptfoo/`) calls paid models on every case. Follow the cost rules
in its README before running it.

Visual verification must cover desktop and mobile. Use a 375px viewport for mobile. A
desktop-only screenshot is not evidence that a UI change works.

Text must fit in both locales: don't give a text container a fixed width that only the Chinese copy
fits. A PR that reworks layout gets the `text-fit-check` label.

### When a Playwright test is worth its cost

The CI E2E suite is a budget, not a safety net for every change: keep the `e2e` job under about
4 minutes. Add a CI-gated Playwright test only when all of these hold:

- No lighter layer can catch it (Vitest, or Vitest + jsdom for component behavior).
- It guards a core path (browse, lens detail, compare, Ask Iris entry, sign-in), or a bug that has
  regressed before.
- It checks one behavior, at the viewport and engine where the bug lives. Add a spec to the
  `ios-safari` list only for WebKit- or touch-specific behavior.

Features do not get Playwright tests by default; verify them with desktop and 375px screenshots. A
layout bug fix ships its regression test as `@local-only` unless it meets the rule above. A PR that
adds a CI-gated E2E test says in its description which condition it meets. When a feature is removed
or reworked, delete its tests rather than adapting them.

## Git workflow

- The primary checkout stays on `main` and is reserved for synchronization; make task changes in non-primary worktrees.
- A coding session works in one worktree. Switch branches inside it for separate topics, with a new branch from freshly fetched `origin/main` and one PR per topic. Do not create extra worktrees for that session's own work.
- Run checks and commit completed changes, then publish the task branch and open a PR targeting `main` with the user's authorization.
- PR titles follow Conventional Commits. Titles and descriptions are written in English; explain non-obvious decisions.
- Merge after CI passes and the maintainer authorizes it.
- After an authorized merge, fetch and fast-forward the primary checkout to `origin/main`; stop and report a dirty or diverged checkout.

## Compatibility

- Do not keep legacy exports, aliases, fallback paths, duplicate fields, or compatibility layers
  for hypothetical consumers. Search for actual consumers first. If compatibility is required,
  document the consumer, removal condition, and expected lifetime; otherwise remove the old path.
