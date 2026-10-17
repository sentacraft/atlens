// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResponseFeedback from "../ResponseFeedback";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderResponseFeedback() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResponseFeedback responseMessageId="assistant-1" />
    </QueryClientProvider>,
  );
}

function sentBodies() {
  return fetchMock.mock.calls.map((call) => JSON.parse(call[1].body));
}

describe("ResponseFeedback", () => {
  it("saves a rating on the first tap and thanks the user in place", async () => {
    renderResponseFeedback();

    fireEvent.click(screen.getByRole("button", { name: "helpful" }));

    expect(screen.getByRole("status")).toHaveTextContent("thanks");
    expect(screen.queryByRole("button", { name: "helpful" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(sentBodies()).toEqual([{ responseMessageId: "assistant-1", rating: "helpful" }]));
  });

  it("opens reasons in a dialog only when the user asks to tell more", async () => {
    renderResponseFeedback();
    fireEvent.click(screen.getByRole("button", { name: "unhelpful" }));
    expect(screen.queryByRole("button", { name: "reasons.did_not_answer" })).toBeNull();

    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "tellMore" }));
    expect(await screen.findByRole("dialog", { name: "title" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "reasons.did_not_answer" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Needed a cheaper option  " } });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    expect(screen.getByRole("status")).toHaveTextContent("detailsThanks");
    await waitFor(() =>
      expect(sentBodies()).toEqual([
        { responseMessageId: "assistant-1", rating: "unhelpful" },
        {
          responseMessageId: "assistant-1",
          rating: "unhelpful",
          reasonCodes: ["did_not_answer"],
          comment: "Needed a cheaper option",
        },
      ]),
    );
  });

  it("offers only a comment after a helpful rating", () => {
    renderResponseFeedback();
    fireEvent.click(screen.getByRole("button", { name: "helpful" }));
    fireEvent.click(screen.getByRole("button", { name: "tellMore" }));

    expect(screen.queryByRole("button", { name: "reasons.did_not_answer" })).toBeNull();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "submit" })).toBeDisabled();
  });

  it("hides the bar without rating when dismissed", () => {
    const { container } = renderResponseFeedback();

    fireEvent.click(screen.getByRole("button", { name: "dismiss" }));

    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
