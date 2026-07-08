// A fetch wrapper that gives up if the server hasn't returned response HEADERS within
// `connectMs`. That catches a hung or unreachable provider — distinct from a legitimate
// long turn, which returns headers quickly and then streams. `fetch()` resolves on the
// headers, before the body is read, so clearing the timer there caps time-to-first-response,
// NOT total stream time: once headers arrive the body streams under whatever total timeout
// the caller already applies via `init.signal`.
//
// `fetchImpl` is injectable purely so the timeout behaviour can be unit-tested with a fake.
export function connectTimeoutFetch(
  connectMs: number,
  fetchImpl: typeof fetch = fetch,
): typeof fetch {
  return (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new DOMException("Provider connect timeout", "TimeoutError")),
      connectMs,
    );
    // Chain the caller's own abort (total-stream timeout / client disconnect) into ours, so
    // aborting upstream still cancels the request.
    const upstream = init?.signal;
    if (upstream) {
      if (upstream.aborted) {
        controller.abort(upstream.reason);
      } else {
        upstream.addEventListener("abort", () => controller.abort(upstream.reason), { once: true });
      }
    }
    return fetchImpl(input, { ...init, signal: controller.signal }).then(
      (res) => {
        clearTimeout(timer);
        return res;
      },
      (err) => {
        clearTimeout(timer);
        throw err;
      },
    );
  };
}
