// None of these formats is a documented API; they are what React and Next write into the HTML, so
// recheck them against the installed sources when either is upgraded.
const MARKERS = [
  // A React Flight error row inside a `self.__next_f.push` string: a Server Component threw.
  /[0-9a-f]:E\{\\"digest\\":\\"(.*?)\\"/g,
  // A boundary that failed during server rendering, before and after the shell was sent.
  /<template data-dgst="([^"]*)"/g,
  /\$RX\("[^"]*","([^"]*)"/g,
];

// notFound(), forbidden(), unauthorized(), redirect() and client-only rendering all travel as errors.
const CONTROL_FLOW = /^(NEXT_HTTP_ERROR_FALLBACK;|NEXT_REDIRECT;|BAILOUT_TO_CLIENT_SIDE_RENDERING$)/;

/**
 * The digest of the first server render error in a page, if any.
 * @param {string} html
 * @returns {string | undefined}
 */
export function renderErrorDigest(html) {
  return MARKERS.flatMap((marker) => [...html.matchAll(marker)])
    .sort((a, b) => a.index - b.index)
    .map((match) => match[1])
    // React leaves the digest empty on a boundary that deliberately defers to the browser.
    .find((digest) => digest !== "" && !CONTROL_FLOW.test(digest));
}
