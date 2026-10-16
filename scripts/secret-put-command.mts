type WorkerVersion = { id: string; metadata: { created_on: string } };
type Deployment = { versions: { version_id: string; percentage: number }[] };

export type SecretPutPlan =
  | { kind: "deploy"; args: string[] }
  | { kind: "version-only"; args: string[]; latestVersionId: string };

// `wrangler secret put` clones the latest version and deploys it, so the API refuses it (code
// 10215) unless that version already serves all traffic. `versions secret put` uploads a new
// version without deploying it.
export function planSecretPut(
  name: string,
  wranglerJson: (args: string[]) => unknown,
): SecretPutPlan {
  const versions = wranglerJson(["versions", "list", "--json"]) as WorkerVersion[];
  const deployment = wranglerJson(["deployments", "status", "--json"]) as Deployment;
  const latest = versions.reduce<WorkerVersion | undefined>(
    (newest, version) =>
      !newest || version.metadata.created_on > newest.metadata.created_on ? version : newest,
    undefined,
  );
  if (!latest) {
    throw new Error("wrangler versions list returned no versions");
  }
  const latestIsLive = deployment.versions.some(
    (entry) => entry.version_id === latest.id && entry.percentage === 100,
  );
  return latestIsLive
    ? { kind: "deploy", args: ["secret", "put", name] }
    : { kind: "version-only", args: ["versions", "secret", "put", name], latestVersionId: latest.id };
}
