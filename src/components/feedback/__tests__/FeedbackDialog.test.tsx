// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FeedbackDialog from "../FeedbackDialog";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/iris/Iris", () => ({
  default: () => <div data-testid="iris" />,
}));

vi.mock("@/lib/analytics/analytics", () => ({
  track: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderFeedbackDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <FeedbackDialog open onOpenChange={vi.fn()} type="general" />
    </QueryClientProvider>,
  );
}

describe("FeedbackDialog", () => {
  it("submits through a mutation and shows the shared success state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    renderFeedbackDialog();
    fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholderMain"), {
      target: { value: "The lens description needs clarification." },
    });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(screen.getByText("success")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      type: "general",
      description: "The lens description needs clarification.",
      context: {},
    });
  });

  it("logs failures without showing an error toast or rolling back the form", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "feedback_unavailable" }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderFeedbackDialog();
    const description = screen.getByPlaceholderText("descriptionPlaceholderMain");
    fireEvent.change(description, { target: { value: "Please check this field." } });
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(errorSpy).toHaveBeenCalledWith(
      "[feedback] submission failed",
      { errorType: "Error" },
    ));
    expect(screen.queryByText("success")).not.toBeInTheDocument();
    expect(description).toHaveValue("Please check this field.");
  });
});
