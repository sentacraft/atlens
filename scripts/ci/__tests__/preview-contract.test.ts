import { describe, expect, it } from "vitest";
import {
  deploymentFromOutput,
  inputHashes,
  parseVerification,
  previewHeaders,
  routeCases,
  verificationEnvironment,
  type Verification,
} from "../preview-contract.mts";

const sha = "a".repeat(40);
const id = "122c5506-1111-4111-8111-111111111111";
const record: Verification = {
  version: 1,
  repository: "sentacraft/atlens",
  sha,
  branch: "feat/example",
  buildId: "22222222-2222-4222-8222-222222222222",
  deploymentId: id,
  baseUrl: "https://122c5506.preview.atlens.app",
  paths: ["/en/about", "/zh/about"],
  inputs: { lockfile: "b".repeat(64), catalog: "c".repeat(64) },
};

// Repositories and domains in these fixtures verify the project's deployment boundary.
describe("Preview verification contract", () => {
  it("accepts a versioned fixed-deployment record", () => {
    expect(parseVerification(record)).toEqual(record);
  });

  it.each([
    ["production", { baseUrl: "https://atlens.app" }],
    ["mutable branch URL", { baseUrl: "https://feature.preview.atlens.app" }],
    ["unrelated deployment", { baseUrl: "https://abcdef12.preview.atlens.app" }],
    ["host suffix attack", { baseUrl: "https://122c5506.preview.atlens.app.attacker.test" }],
    ["credentials", { baseUrl: "https://token@122c5506.preview.atlens.app" }],
    ["HTTP", { baseUrl: "http://122c5506.preview.atlens.app" }],
    ["URL path", { baseUrl: "https://122c5506.preview.atlens.app/admin" }],
    ["foreign repository", { repository: "someone/else" }],
    ["production branch", { branch: "main" }],
    ["invalid SHA", { sha: "main" }],
    ["missing routes", { paths: [] }],
    ["external route", { paths: ["//attacker.test/"] }],
    ["encoded path traversal", { paths: ["/en/%2e%2e/admin"] }],
    ["backslash", { paths: ["/en/\\attacker.test"] }],
    ["admin", { paths: ["/admin"] }],
    ["API mutation target", { paths: ["/api/chat"] }],
    ["route fragment", { paths: ["/en/about#section"] }],
    ["unknown payload field", { token: "must-not-be-forwarded" }],
  ])("rejects %s", (_name, change) => {
    expect(() => parseVerification({ ...record, ...change })).toThrow();
  });

  it("rejects oversized payloads instead of dropping coverage", () => {
    expect(() => parseVerification({ ...record, paths: Array(201).fill("/en/about") })).toThrow();
  });

  it("selects deployment_urls rather than preview_urls from Wrangler's output file", () => {
    const output = [
      JSON.stringify({ type: "unrelated" }),
      JSON.stringify({ type: "preview", version: 1, worker_name: "atlens", deployment_id: id,
        deployment_urls: [record.baseUrl], preview_urls: ["https://feature.preview.atlens.app"] }),
    ].join("\n");
    expect(deploymentFromOutput(output)).toEqual({ deploymentId: id, baseUrl: record.baseUrl });
  });

  it("does not guess an address when deployment output is missing or ambiguous", () => {
    expect(() => deploymentFromOutput("{}")).toThrow();
    const line = JSON.stringify({ type: "preview", version: 1, worker_name: "atlens",
      deployment_id: id, deployment_urls: [record.baseUrl] });
    expect(() => deploymentFromOutput(`${line}\n${line}`)).toThrow();
    expect(() => deploymentFromOutput(JSON.stringify({ type: "preview", worker_name: "atlens",
      deployment_id: id, deployment_urls: [], preview_urls: [record.baseUrl] }))).toThrow();
  });

  it("hashes build inputs without including their contents in the record", () => {
    expect(inputHashes("lock", "catalog")).toEqual(inputHashes("lock", "catalog"));
    expect(inputHashes("new-lock", "catalog")).not.toEqual(inputHashes("lock", "catalog"));
  });

  it("samples the built sitemap and keeps both locales without a test-side build", () => {
    const xml = '<urlset><loc>https://atlens.app/en/lenses/x/a-x</loc><loc>https://atlens.app/en/lenses/x/b-x</loc><loc>https://atlens.app/zh/about</loc></urlset>';
    const manifest = { routes: {
      "/en/lenses/x/a-x": { srcRoute: "/[locale]/lenses/[mount]/[id]" },
      "/en/lenses/x/b-x": { srcRoute: "/[locale]/lenses/[mount]/[id]" },
      "/zh/about": { srcRoute: "/[locale]/about" },
    } };
    const paths = routeCases(xml, manifest);
    expect(paths).toContain("/en/lenses/x/a-x");
    expect(paths).not.toContain("/en/lenses/x/b-x");
    expect(paths).toContain("/zh/about");
    expect(paths).toContain("/en/lenses/x/compare?ids=a-x,b-x");
    expect(() => routeCases("<urlset/>", manifest)).toThrow();
  });

  it("requires both Access credentials and never returns them for a different origin", () => {
    const env = { PREVIEW_ACCESS_CLIENT_ID: "id", PREVIEW_ACCESS_CLIENT_SECRET: "secret" };
    expect(previewHeaders(record, record.baseUrl + "/en/about", env)).toEqual({
      "CF-Access-Client-Id": "id", "CF-Access-Client-Secret": "secret",
    });
    expect(previewHeaders(record, "https://external.test/", env)).toEqual({});
    expect(() => previewHeaders(record, record.baseUrl, { PREVIEW_ACCESS_CLIENT_ID: "id" })).toThrow();
  });

  it("disables Playwright's local server whenever verification metadata is supplied", () => {
    expect(verificationEnvironment(record)).toMatchObject({ baseURL: record.baseUrl, remote: true });
  });
});
