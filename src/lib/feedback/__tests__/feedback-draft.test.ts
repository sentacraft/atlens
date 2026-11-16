import { describe, expect, it } from "vitest";
import { createFeedbackDraft, feedbackContact, feedbackPayload } from "../feedback-draft";

const seed = { type: "general" as const, description: "Please add a filter." };

describe("feedback drafts shared by manual and Iris entry points", () => {
  it("prefills the account email without opting into replies", () => {
    const draft = createFeedbackDraft(seed);
    expect(draft.wantsReply).toBe(false);
    expect(feedbackContact(draft, "reader@example.com")).toBe("reader@example.com");
    expect(feedbackPayload(draft, "reader@example.com")).not.toHaveProperty("replyContact");
  });

  it("uses an explicitly supplied contact before the account email", () => {
    const draft = createFeedbackDraft({ ...seed, wantsReply: true, replyContact: "another@example.com" });
    expect(feedbackPayload(draft, "reader@example.com").replyContact).toBe("another@example.com");
  });

  it("does not replace a contact the user cleared or changed", () => {
    expect(feedbackContact(createFeedbackDraft({ ...seed, replyContact: "" }), "reader@example.com")).toBe("");
    expect(feedbackContact(createFeedbackDraft({ ...seed, replyContact: "wechat-handle" }), "reader@example.com")).toBe("wechat-handle");
  });

  it("keeps guests blank and sends only the selected contact", () => {
    const draft = createFeedbackDraft({ ...seed, wantsReply: true });
    expect(feedbackContact(draft, null)).toBe("");
    expect(feedbackPayload(draft, "reader@example.com").replyContact).toBe("reader@example.com");
    expect(feedbackPayload({ ...draft, wantsReply: false }, "reader@example.com")).not.toHaveProperty("replyContact");
  });

  it("preserves the submission identity and structured context", () => {
    const draft = createFeedbackDraft({ type: "data_issue", description: "Check the weight.", context: { lensId: "lens", field: "Weight", currentValue: "84g" } });
    expect(feedbackPayload(draft, null)).toMatchObject({ submissionId: draft.id, type: "data_issue", context: { lensId: "lens", field: "Weight", currentValue: "84g" } });
  });
});
