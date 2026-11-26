# Cloudflare Preview smoke

The first phase of moving runtime verification to the deployment Cloudflare already builds. It replaces one job: `cf-smoke`, which builds the app a second time and boots it on local workerd. The Node E2E job, the text-fit check, the production Uptime check and the local `pnpm run preview` requirement stay as they are.

Nothing changes until the cutover below. Merging this code does not alter a Cloudflare build.

## How it works

1. Cloudflare Workers Builds runs `pnpm run build:cf`, then the Preview command `pnpm run preview:publish`.
2. The publisher applies the Preview D1 migrations, runs `wrangler preview`, reads the fixed deployment URL from Wrangler's `WRANGLER_OUTPUT_FILE_PATH` record, and sends a `cloudflare_preview_ready` repository dispatch with the commit SHA, deployment ID and URL. It refuses to run on `main` or without `PREVIEW_DISPATCH_TOKEN`, and fails the build if the dispatch is not accepted.
3. `.github/workflows/preview-smoke.yml` validates the payload, probes every sitemap route and the SSG/dynamic cache behavior against that URL, and writes the **Cloudflare Preview smoke** commit status on the deployed SHA.

The status describes the branch head that Cloudflare built, not a merge with current `main`. To retry, re-run the workflow run: it reuses the same deployment. A commit with no status (failed build, failed dispatch, a fork's pull request) has not been verified.

## Why a dispatch

Cloudflare's own `Workers Builds` check run can trigger a workflow through `check_run: completed`, but it does not say where the build was deployed: its summary holds only the build ID and Worker name, and it creates no GitHub deployment. The deployment URL appears in Cloudflare's pull request comment, which some successful builds never receive. See the [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/) and [`check_run` event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_run) references.

## The dispatch token

`PREVIEW_DISPATCH_TOKEN` is a Workers Builds build secret, not a Worker runtime variable. GitHub requires **Contents: write** on this repository to [create a dispatch event](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens), and every branch build can read its build secrets, so any code on a built branch can use that permission. The same permission lets its holder push branches and merge pull requests; the current `main` ruleset requires a pull request but no approval. Use a fine-grained token limited to this repository, and decide whether this exposure is acceptable before provisioning it.

## Cutover

Each step that changes an account or a repository setting needs its own approval.

1. Merge this code so the receiver exists on the default branch.
2. Provision `PREVIEW_DISPATCH_TOKEN`.
3. Set the Preview command to `pnpm run preview:publish` and trial it with one up-to-date branch. Confirm that the status lands on that branch's head and that a failing route fails it.
4. Update the other open branches: a branch without `preview:publish` fails its Preview build once the command changes.
5. Set the repository variable `CF_PREVIEW_VALIDATION=true`, which turns off `cf-smoke` for pull requests and pushes to `main`. After that, `main` is covered by the production Uptime check only. If `cf-smoke` is a required check, require the new status in its place at the same time.
6. In a follow-up change, remove the variable and the old job.
