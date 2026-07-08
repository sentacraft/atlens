// Circuit breaker for the DeepSeek dependency, backed by RATE_KV (same namespace and
// loose read-modify-write style as the rate limiter). It's a PASSIVE breaker: it learns
// from real request outcomes rather than probing — when DeepSeek fails repeatedly the
// circuit opens, and /api/chat fails fast with a clean "unavailable" instead of every
// request hanging on a dead provider until the stream timeout.
//
// State in KV (global, not per-IP — this tracks the provider's health, not a caller):
//   circuit:fails  consecutive-failure counter, TTL = failWindowSeconds so old blips decay.
//   circuit:open   presence = open; its TTL IS the cooldown. Expiry auto-"half-opens" —
//                  the next request probes DeepSeek for real, and onEnd/onError decides.
//
// The failure streak is deliberately NOT cleared when the circuit trips: it must outlive
// the cooldown (failWindowSeconds > cooldownSeconds) so that a single failed half-open
// probe re-opens immediately instead of needing another full threshold.

const FAILS_KEY = "circuit:fails";
const OPEN_KEY = "circuit:open";

export const CIRCUIT = {
  // Consecutive DeepSeek failures before the circuit opens. Above 1 so a lone transient
  // blip doesn't trip it; low enough to open within a few requests of a real outage.
  failureThreshold: 4,
  // How long the circuit stays open before the next request is allowed to probe.
  cooldownSeconds: 60,
  // Failure-counter lifetime. MUST exceed cooldownSeconds (see half-open note above);
  // also bounds "consecutive" to a rolling window rather than "ever".
  failWindowSeconds: 180,
} as const;

function toCount(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

// Fail-fast gate: is the circuit currently open? Read before touching the model.
export async function isCircuitOpen(kv: KVNamespace): Promise<boolean> {
  return (await kv.get(OPEN_KEY)) !== null;
}

// A DeepSeek turn completed — the provider is healthy, so clear the failure streak (a
// success is what closes a half-open circuit). Write-free on the healthy path: with no
// streak there's nothing to delete.
export async function recordProviderSuccess(kv: KVNamespace): Promise<void> {
  if ((await kv.get(FAILS_KEY)) !== null) {
    await kv.delete(FAILS_KEY);
  }
}

// A DeepSeek turn errored. Bump the failure streak; trip the circuit at the threshold.
export async function recordProviderFailure(kv: KVNamespace): Promise<void> {
  const fails = toCount(await kv.get(FAILS_KEY)) + 1;
  await kv.put(FAILS_KEY, String(fails), { expirationTtl: CIRCUIT.failWindowSeconds });
  if (fails >= CIRCUIT.failureThreshold) {
    await kv.put(OPEN_KEY, "1", { expirationTtl: CIRCUIT.cooldownSeconds });
  }
}
