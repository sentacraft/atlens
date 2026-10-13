export interface QueryResult<T = Record<string, unknown>> {
  ok: boolean;
  data: T[];
  error?: string;
}

interface SqlApiResponse<T> {
  data?: T[];
  meta?: unknown;
}

export async function queryAE<T = Record<string, unknown>>(
  sql: string,
): Promise<QueryResult<T>> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_ANALYTICS_TOKEN;
  if (!accountId || !token) {
    return { ok: false, data: [], error: "missing_credentials" };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body: `${sql} FORMAT JSON`,
    });
    if (!res.ok) {
      return { ok: false, data: [], error: `http_${res.status}` };
    }
    const json = (await res.json()) as SqlApiResponse<T>;
    return { ok: true, data: json.data ?? [] };
  } catch (e) {
    return {
      ok: false,
      data: [],
      error: e instanceof Error ? e.message : "unknown",
    };
  }
}
