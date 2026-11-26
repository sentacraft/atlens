# Remote verification

## Ownership

Cloudflare Workers Builds produces the application's Next/OpenNext output once per verification revision and deploys it to a branch Preview. GitHub executes probes and browsers against that fixed deployment; it does not build the app. Production Uptime remains independent.

The repository integration is not an account configuration change. Until the cutover below succeeds, the existing local-runtime CI and local preview requirement remain active. The temporary `CF_PREVIEW_VALIDATION` switch must be removed with the old build jobs after the migration is accepted; it is not a permanent second validation architecture.

## Cloudflare commands

Keep the build command `pnpm run build:cf`. Its `postbuild:cf` records the build SHA, UUID, locked input hashes and representative routes under `.open-next/preview-verification.json`. It does nothing for production/main or ordinary local builds. The current static-assets cache preparation remains part of this command; it is not another Next build.

After the receiver workflow is on the default branch, trial **only an updated, trusted task branch** with Preview command `pnpm run preview:publish`. This command validates the existing build, applies only the configured Preview D1 migrations, executes `wrangler preview`, and notifies GitHub. It never invokes a build. Keep existing branch settings unchanged until those branches contain the integration.

The publisher uses Wrangler's `WRANGLER_OUTPUT_FILE_PATH` JSONL contract and selects `deployment_urls`, not mutable `preview_urls`. Missing, ambiguous, foreign or mutable addresses fail the handoff. Do not infer deployment URLs from a branch or from an optional Build API field.

`PREVIEW_DISPATCH_TOKEN` is a build-time credential for the GitHub dispatch endpoint, not a Worker runtime variable. Provision it separately through the approved secret-management process with the minimum repository permission. Never copy production runtime tokens into this role or put the value in tracked files. Missing credentials fail before migration or deployment. A notification failure after deployment fails the build command rather than reporting test success.

## Test receiver

`.github/workflows/preview-validation.yml` accepts `cloudflare_preview_ready` repository dispatches. The descriptor is bounded and contains no credentials. The workflow validates that its SHA is the current task-branch head and includes current main, then opens **Cloudflare Preview validation** on that SHA. A main update during testing makes the result fail; update the branch using the approved Git workflow and deploy its new head.

The receiver must exist on the default branch. A dispatch's default `GITHUB_SHA` is not the tested SHA. Tests explicitly check out the descriptor's revision, compare its lockfile/catalog hashes, and use its fixed deployment. Results are explicitly written to that commit with Checks write permission; a default-branch workflow green light is not equivalent.

The remote job runs route/render and SSG/dynamic-cache probes, then the existing Chromium, mobile WebKit and PWA browser projects. It excludes `@local-only`, as the previous PR E2E gate did, but includes the text-fit sweep on the same deployment. Excluded tests retain their existing targeted verification responsibility. Remote mode has no Playwright `webServer` and must not run any production build command.

## Request safety and Access

All browser specs use `e2e/support/test.ts`. In remote mode it blocks service workers so they cannot bypass request routing, stubs analytics and rejects unmocked non-read requests. Existing page-level API mocks still take precedence, so feedback tests cannot file real issues. A blocked write fails the test; do not replace it with live credentials to make CI green. Paid-model, real-email and real-login integration tests require separate authorization and test resources.

If Preview Access is enabled, configure `PREVIEW_ACCESS_CLIENT_ID` and `PREVIEW_ACCESS_CLIENT_SECRET` as paired GitHub test credentials. They are optional for the currently public ordinary Preview pages. Never supply only one. Headers are added only for the validated deployment origin; browser redirects are handled without forwarding header overrides to another origin. Do not use global Playwright `extraHTTPHeaders` for these credentials.

This guard is not a replacement for server-side resource isolation: verify the Preview's D1/KV and integrations independently. The remote lane keeps the existing PWA layout tests but does not verify service-worker offline/cache behavior. Current `/admin` protection does not make the whole Preview private. Changing the Access policy remains a separate approval.

## Reports, retries and scheduled checks

The receiver saves `preview-verification-<sha>` and browser reports for seven days, not full application bundles. Re-run the receiver with an existing verification `run_id` or `revision`; tests reuse its deployment rather than rebuilding it. Replays still require a live current branch based on current main. Deleted environments, expired records and stale revisions fail visibly; publish an updated target on Cloudflare rather than silently building on GitHub or accepting an old result.

After cutover, the existing text-fit label/manual/scheduled workflow calls this receiver with a saved target. PR labels select that PR's SHA; schedules select the newest saved record and then validate that target's branch and deployment. If no usable target exists, the workflow reports a failure requiring a fresh Cloudflare deployment, not a false successful skip. Automatic creation of new scheduled Cloudflare builds is not part of this repository-only integration.

Use the fixed deployment and build UUID in reports. Keep secrets, raw provider responses and session state out of descriptors and artifacts. Preview resource deletion/retention and any per-PR data isolation require separately approved account changes; this workflow does not delete resources.

## Cutover checklist

1. Merge the receiver/tooling through the existing checks with authorization. Do not change production or disable current gates yet.
2. Configure the build-time dispatch credential and trial `pnpm run preview:publish` for one updated branch. Confirm one actual Next/OpenNext build, the fixed deployment, metadata delivery and browser coverage. No real provider calls are allowed.
3. Confirm the `Cloudflare Preview validation` check is attached to the intended head, cannot pass with missing/skipped jobs, and rejects stale code or main incompatibility. Preserve the read-only production Uptime checks.
4. With approval, make that check required and set repository variable `CF_PREVIEW_VALIDATION=true`. It disables the old cf-smoke/E2E production builds and makes text-fit consume saved deployments. Do not leave the old skipped check names required, which would block every PR; update the required set in the same controlled switch.
5. Update the remaining active branches before changing their Preview commands. Once accepted, remove the temporary switch and old build jobs in the agreed cleanup change; keep explicit local diagnosis available.

Normal automation never runs `pnpm run preview`, `next build`, `next start` or OpenNext build on the test runner after cutover. Explicit local diagnosis is still available, but is neither a substitute for missing cloud results nor an automatic fallback. Test success does not authorize merging.
