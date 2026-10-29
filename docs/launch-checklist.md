# Launch checklist

A new page, user-facing feature, or API route touches places outside its own code that drift
when nobody revisits them. Go through the sections that apply, change what needs changing, and
say in the PR description which items you changed and which do not apply.

## Any user-facing feature

- **Entry.** Where does a visitor find it: the nav and phone tab bar (`src/components/nav/`),
  the menu (`NavMenu.tsx`), a home section (`src/components/home/`), page breadcrumbs
  (`Breadcrumb.tsx`), section tabs (`SectionTabs.tsx`)?
- **Links in.** Which existing pages should link to it (a lens page's specs, brand and collection
  pages, compare)?
- **Links out.** Which existing features should it link back to (lens pages, brand and series
  pages, charts, compare)?
- **Ask Iris.**
  - Site facts (`src/lib/site-facts/`) so Iris can describe the feature and link to it.
  - The page context and page entry (`src/lib/askiris/page-ref.ts`) if Iris should know a
    visitor is on it.
  - Starter questions (`src/lib/askiris/starter-questions.ts`) if Iris gained a capability.
  - Eval cases (`eval/promptfoo/`) for a new capability.
  - A server tool that needs an account goes in `src/lib/ai/sign-in-gate.ts`.
- **About and README.** About is written from the site facts; README describes the app's
  features and architecture.
- **Accounts.**
  - A feature that needs sign-in, or works better with it, is a sign-in benefit:
    `src/lib/sign-in-pitch.ts`.
  - A new sign-in method also changes the sign-in dialog, About, the site facts, the accounts
    dashboard, and the sign-in notes under Environment variables in `CLAUDE.md`.
- **Privacy.** Anything that collects or stores new data about visitors updates the privacy copy
  (`About.privacy*` in `src/messages/`).
- **Analytics.** New interactions get events in `src/lib/analytics/events.ts`, and the questions
  they answer get a card in `/admin/analytics`.
- **Source and scope.**
  - Lens data shows where it comes from (`src/components/lens/DataSource.tsx`).
  - AI output carries `AiTag`.
  - A chart or list that covers only part of the catalog says what it covers.
- **Support.** Decide whether the feature's pages show the support note
  (`src/components/support/SupportNote.tsx`).
- **Sharing.** Decide whether the content deserves a share link or poster
  (`src/components/share/`).

## A new public page

- **SEO.**
  - Title, description (`src/lib/seo/meta-description.ts` keeps it within a search result),
    Open Graph, alternates and hreflang (`src/lib/seo.ts`).
  - A place in `src/app/sitemap.ts`.
  - Static or dynamic in `src/config/static-routes.ts`.
- **Smoke test.** A route template the sitemap leaves out gets a probe in
  `scripts/uptime-check.mjs`.
- **Lens lists.** A page that lists lenses to browse joins the `PAGES` list in
  `e2e/lens-actions.spec.ts`.
- **After merge.** Tell the maintainer to request indexing in Google Search Console; Bing gets
  the page through IndexNow on deploy.

## A new API route

- **Rate limit.** A limit in `src/lib/rate-limit.ts`. Decide whether abuse needs more:
  a daily cap, Turnstile, or sign-in.
- **JSDoc.** The one-line JSDoc that `docs/api.md` is generated from.
- **Previews.** Every new var, secret or binding is declared again under `[previews]` in
  `wrangler.toml`.

## A visual change to mirrored files

- **Design system.** Say which part of the design system it affects (see Code style in
  `CLAUDE.md`).
