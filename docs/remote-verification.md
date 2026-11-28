# Cloudflare Preview smoke

The first phase of moving runtime verification to the deployment Cloudflare already builds. It replaces one job: `cf-smoke`, which builds the app a second time and boots it on local workerd. The Node E2E job, the text-fit check, the production Uptime check and the local `pnpm run preview` requirement stay as they are.

Nothing changes until the cutover below. Merging this code does not alter a Cloudflare build.

## How it works

1. Cloudflare Workers Builds runs `pnpm run build:cf`, then the Preview command `pnpm run preview:publish`.
2. The publisher applies the Preview D1 migrations, runs `wrangler preview`, and reads the fixed deployment URL from Wrangler's structured output record (`WRANGLER_OUTPUT_FILE_PATH` or `WRANGLER_OUTPUT_FILE_DIRECTORY`) without overriding the build runner's configured path. It posts a `cloudflare/preview-deployment` commit status on the built SHA: `target_url` is the deployment URL, `description` is `deployment=<id> build=<uuid>`. It refuses to run on `main` or without `PREVIEW_STATUS_TOKEN`, and fails the build if the status is not accepted.
3. `.github/workflows/preview-smoke.yml` runs on that status. It accepts only this deployment's HTTPS address on the Preview domain and only the current head of a branch other than `main`, then probes every sitemap route and the SSG/dynamic cache behavior.
4. It creates the **Cloudflare Preview smoke** check run on the SHA, already completed. It fails if the address was rejected, a probe failed, or the commit is no longer a branch head.

The result describes the branch head that Cloudflare built, not a merge with current `main`. To retry, re-run the workflow run: it reuses the same deployment. A commit without the check run (failed build, rejected status, a fork's pull request) has not been verified.

## Status token and trust

`PREVIEW_STATUS_TOKEN` is a Workers Builds build secret, not a Worker runtime variable: a fine-grained personal access token limited to this repository with only [Commit statuses: write](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens). It cannot push or merge.

Every branch build can read it, so treat every commit status in this repository as forgeable. Its holder can create or overwrite a status with any context on any commit, including a `cloudflare/preview-deployment` status that points a commit at another commit's deployment. The address and branch-head checks do not prove that a deployment was built from the commit named.

The gate is therefore the receiver's check run. A personal access token [cannot create check runs](https://docs.github.com/en/rest/checks/runs); the receiver creates this one as GitHub Actions. Never require the `cloudflare/preview-deployment` status.

## Not settled by the documentation

- **`description` length.** GitHub's [commit status reference](https://docs.github.com/en/rest/commits/statuses) states no limit. Third-party tools [report 140 characters](https://opendev.org/zuul/zuul/commit/fb6cc99768104e40bc3c709dfe8a0c8ad09e6123); the value posted here is 90.
- **Status delivery.** The [`status` event reference](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#status) gives no delivery guarantee. A missed event leaves the commit without the check run, which blocks a required check rather than passing it; retry the Cloudflare build.

## Why the build posts a status

Cloudflare's own `Workers Builds` check run can trigger a workflow through `check_run: completed`, but it does not say where the build was deployed: its summary holds only the build ID and Worker name, and it creates no GitHub deployment. The deployment URL appears in Cloudflare's pull request comment, which some successful builds never receive. See the [GitHub integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/) and [`check_run` event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#check_run) references.

## Cutover

Each step that changes an account or a repository setting needs its own approval.

1. Merge this code: the `status` event only runs workflows that exist on the default branch.
2. Provision `PREVIEW_STATUS_TOKEN`.
3. Set the Preview command to `pnpm run preview:publish` and trial it with one up-to-date branch. Confirm that the check run lands on that branch's head and that a failing route fails it.
4. Update the other open branches: a branch without `preview:publish` fails its Preview build once the command changes.
5. Set the repository variable `CF_PREVIEW_VALIDATION=true`, which turns off `cf-smoke` for pull requests and pushes to `main`. After that, `main` is covered by the production Uptime check only.
6. To gate merges, add `Cloudflare Preview smoke` as a required status check and select **GitHub Actions** as its [expected source](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets), not "any source". If `cf-smoke` is required by then, replace it in the same change.
7. In a follow-up change, remove the variable and the old job.
