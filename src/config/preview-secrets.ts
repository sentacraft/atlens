// No Next.js imports: scripts consume this file.

/**
 * `[secrets] required` names that Worker Previews do not get. wrangler.toml cannot list
 * preview secrets, so previews take every other required name.
 */
export const SECRETS_NOT_ON_PREVIEWS: readonly string[] = [
  // `[previews.vars]` placeholders instead: the code exchange runs on production.
  "GITHUB_CLIENT_SECRET",
  "GOOGLE_CLIENT_SECRET",
];

/** Secrets whose preview value must equal production's; others get their own value. */
export const SECRETS_SHARED_WITH_PREVIEWS: readonly string[] = ["OAUTH_PROXY_SECRET"];
