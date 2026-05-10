import { test, expect, type Page } from "@playwright/test";

// Intercepts POST /api/feedback, captures the request body, and returns a
// fake success so real GitHub issues are never created during tests.
async function mockFeedbackApi(page: Page): Promise<{ getLastBody: () => Record<string, unknown> | null }> {
  let lastBody: Record<string, unknown> | null = null;
  await page.route("**/api/feedback", async (route) => {
    if (route.request().method() === "POST") {
      lastBody = (await route.request().postDataJSON()) as Record<string, unknown>;
      await route.fulfill({ json: { ok: true } });
    } else {
      await route.continue();
    }
  });
  return { getLastBody: () => lastBody };
}

const LENS_URL = "/en/lenses/x/7artisans-af-27mm-f28-x";

// ─── Dialog open/close ────────────────────────────────────────────────────────

test.describe("FeedbackDialog — open and close", () => {
  test("Nav Feedback button opens general dialog (desktop)", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: /feedback/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading")).toContainText(/send feedback/i);
  });

  test("Escape closes the dialog", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: /feedback/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("Cancel button closes the dialog", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: /feedback/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });

  test("lens detail Report an issue button opens data_issue dialog", async ({ page }) => {
    await page.goto(LENS_URL);
    await page.getByRole("button", { name: /report an issue/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("heading")).toContainText(/report an issue/i);
    // Lens header ("Affected lens" label) should appear in the dialog
    await expect(dialog.getByText(/affected lens/i)).toBeVisible();
  });
});

// ─── Payload integrity ────────────────────────────────────────────────────────

test.describe("FeedbackDialog — payload sent to API", () => {
  test("general feedback sends type and description", async ({ page }) => {
    const { getLastBody } = await mockFeedbackApi(page);
    await page.goto("/en");
    await page.getByRole("button", { name: /feedback/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").fill("This is a test suggestion");
    await dialog.getByRole("button", { name: /submit/i }).click();
    await expect(dialog.getByText(/thanks/i)).toBeVisible();

    const body = getLastBody();
    expect(body).not.toBeNull();
    expect(body!.type).toBe("general");
    expect(body!.description).toBe("This is a test suggestion");
  });

  test("replyEmail is included in the payload when provided", async ({ page }) => {
    const { getLastBody } = await mockFeedbackApi(page);
    await page.goto("/en");
    await page.getByRole("button", { name: /feedback/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").fill("Please reply to me");
    await dialog.locator("input[type='email']").fill("test@example.com");
    await dialog.getByRole("button", { name: /submit/i }).click();
    await expect(dialog.getByText(/thanks/i)).toBeVisible();

    const body = getLastBody();
    expect(body!.replyEmail).toBe("test@example.com");
  });

  test("replyEmail is omitted from the payload when left empty", async ({ page }) => {
    const { getLastBody } = await mockFeedbackApi(page);
    await page.goto("/en");
    await page.getByRole("button", { name: /feedback/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").fill("No email provided");
    await dialog.getByRole("button", { name: /submit/i }).click();
    await expect(dialog.getByText(/thanks/i)).toBeVisible();

    const body = getLastBody();
    expect(body!.replyEmail).toBeUndefined();
  });

  test("data_issue sends lens context in payload", async ({ page }) => {
    const { getLastBody } = await mockFeedbackApi(page);
    await page.goto(LENS_URL);
    await page.getByRole("button", { name: /report an issue/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").fill("Max aperture is wrong");
    await dialog.getByRole("button", { name: /submit/i }).click();
    await expect(dialog.getByText(/thanks/i)).toBeVisible();

    const body = getLastBody();
    expect(body!.type).toBe("data_issue");
    expect((body!.context as Record<string, unknown>).lensId).toBeTruthy();
    expect((body!.context as Record<string, unknown>).lensModel).toBeTruthy();
  });

  test("data_issue sends replyEmail alongside lens context", async ({ page }) => {
    const { getLastBody } = await mockFeedbackApi(page);
    await page.goto(LENS_URL);
    await page.getByRole("button", { name: /report an issue/i }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("textarea").fill("Wrong weight value");
    await dialog.locator("input[type='email']").fill("reporter@example.com");
    await dialog.getByRole("button", { name: /submit/i }).click();
    await expect(dialog.getByText(/thanks/i)).toBeVisible();

    const body = getLastBody();
    expect(body!.type).toBe("data_issue");
    expect(body!.replyEmail).toBe("reporter@example.com");
    expect((body!.context as Record<string, unknown>).lensId).toBeTruthy();
  });

  test("search 'Tell us' sends searchQuery in context", async ({ page }) => {
    const { getLastBody } = await mockFeedbackApi(page);
    await page.goto("/en/lenses/x");
    await page.getByRole("button", { name: /search/i }).click();
    const searchDialog = page.getByRole("dialog");
    await searchDialog.locator("input[type='text']").fill("nonexistent-lens-xyz");
    // Wait for no-results state
    await expect(searchDialog.getByText(/tell us/i)).toBeVisible();
    await searchDialog.getByText(/tell us/i).click();

    // Feedback dialog should now be open
    const feedbackDialog = page.getByRole("dialog");
    await expect(feedbackDialog.getByRole("heading")).toContainText(/send feedback/i);
    await feedbackDialog.locator("textarea").fill("Please add this lens");
    await feedbackDialog.getByRole("button", { name: /submit/i }).click();
    await expect(feedbackDialog.getByText(/thanks/i)).toBeVisible();

    const body = getLastBody();
    expect(body!.type).toBe("general");
    expect((body!.context as Record<string, unknown>).searchQuery).toBe("nonexistent-lens-xyz");
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

test.describe("FeedbackDialog — validation", () => {
  test("submit is disabled / no request sent when description is empty", async ({ page }) => {
    const { getLastBody } = await mockFeedbackApi(page);
    await page.goto("/en");
    await page.getByRole("button", { name: /feedback/i }).click();
    const dialog = page.getByRole("dialog");
    // Do not fill anything — click submit
    await dialog.getByRole("button", { name: /submit/i }).click();
    // Dialog should still be open (not showing success)
    await expect(dialog.getByText(/thanks/i)).not.toBeVisible();
    expect(getLastBody()).toBeNull();
  });
});
