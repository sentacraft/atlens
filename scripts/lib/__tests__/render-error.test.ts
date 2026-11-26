import { describe, expect, it } from "vitest";
import { renderErrorDigest } from "../render-error.mjs";

// The markup below is copied from a Next 16.4.6 deployment and from React's server renderer.
const flight = (...rows: string[]) =>
  `<html><body><script>self.__next_f.push([1,"0:[\\"$\\",\\"div\\",null,{}]\\n${rows.join("\\n")}\\n"])</script></body></html>`;
const errorRow = (id: string, digest: string) => `${id}:E{\\"digest\\":\\"${digest}\\"}`;
const boundary = (digest: string) => `<!--$!--><template data-dgst="${digest}"></template><!--/$-->`;

describe("renderErrorDigest", () => {
  it("reports a server error row", () => {
    expect(renderErrorDigest(flight(errorRow("1f", "543315088")))).toBe("543315088");
  });

  it.each([
    "NEXT_HTTP_ERROR_FALLBACK;404",
    "NEXT_HTTP_ERROR_FALLBACK;403",
    "NEXT_HTTP_ERROR_FALLBACK;401",
    "NEXT_REDIRECT;replace;/en/lenses/x/browse;307;",
    "BAILOUT_TO_CLIENT_SIDE_RENDERING",
  ])("ignores the control-flow digest %s", (digest) => {
    expect(renderErrorDigest(flight(errorRow("22", digest)) + boundary(digest))).toBeUndefined();
  });

  it("reports an error that follows a control-flow row", () => {
    const html = flight(errorRow("22", "NEXT_HTTP_ERROR_FALLBACK;404"), errorRow("23", "543315088"));
    expect(renderErrorDigest(html)).toBe("543315088");
  });

  it("reports a client component that failed before the shell was sent", () => {
    expect(renderErrorDigest(boundary("812001"))).toBe("812001");
  });

  it("reports a client component that failed after the shell was sent", () => {
    expect(renderErrorDigest(`<script>$RX=function(b,c){};;$RX("B:0","812002")</script>`)).toBe("812002");
  });

  it("ignores the empty digest React leaves on a client-only boundary", () => {
    expect(renderErrorDigest(boundary(""))).toBeUndefined();
  });

  it("passes a healthy page whose copy talks about digests", () => {
    const copy = `<p>A weekly digest: 1f:E{&quot;digest&quot;:&quot;1&quot;}</p>`;
    // A string inside the Flight payload is escaped once more than a row is.
    const quoted = flight(`5:[\\"$\\",\\"p\\",null,{\\"children\\":\\"digest 1f:E{\\\\\\"digest\\\\\\":\\\\\\"1\\\\\\"}\\"}]`);
    expect(renderErrorDigest(copy + quoted)).toBeUndefined();
  });
});
