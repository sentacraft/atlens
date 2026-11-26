import { test as base, expect } from "@playwright/test";
import { previewHeaders, previewRequestPolicy, readVerification } from "../../scripts/ci/preview-contract.mts";

export * from "@playwright/test";

export const test = base.extend({
  context: async ({ context, baseURL }, provide) => {
    const file = process.env.PREVIEW_VERIFICATION_FILE;
    if (!file) {
      await provide(context);
      return;
    }
    const record = readVerification(file);
    if (baseURL !== record.baseUrl) {
      throw new Error("Browser target does not match the verified deployment");
    }
    const blocked: string[] = [];
    await context.route("**/*", async route => {
      const request = route.request();
      const policy = previewRequestPolicy(record, request.url(), request.method());
      if (policy === "stub") {
        await route.fulfill({ status: 204, body: "" });
        return;
      }
      if (policy === "block") {
        blocked.push(`${request.method()} ${new URL(request.url()).pathname}`);
        await route.abort("blockedbyclient");
        return;
      }
      const headers = previewHeaders(record, request.url());
      if (Object.keys(headers).length > 0) {
        // route.continue header overrides also follow cross-origin redirects.
        const response = await route.fetch({ headers: { ...request.headers(), ...headers }, maxRedirects: 0 });
        await route.fulfill({ response });
      } else {
        await route.continue();
      }
    });
    await provide(context);
    expect(blocked, "Remote tests must mock writes rather than call live integrations").toEqual([]);
  },
});
