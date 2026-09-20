// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ResponseFeedback from "../ResponseFeedback";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/components/iris/Iris", () => ({
  default: () => <div data-testid="iris" />,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ResponseFeedback", () => {
  function renderResponseFeedback() {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <ResponseFeedback turnId="user-1" responseMessageId="assistant-1" />
      </QueryClientProvider>,
    );
  }

  it("submits a helpful rating immediately and highlights the button", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    renderResponseFeedback();
    const helpful = screen.getByRole("button", { name: "helpful" });

    fireEvent.click(helpful);

    expect(helpful).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      turnId: "user-1",
      responseMessageId: "assistant-1",
      rating: "helpful",
    });
  });

  it("submits a thumbs-down immediately and opens the detail dialog", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    renderResponseFeedback();
    const unhelpful = screen.getByRole("button", { name: "unhelpful" });
    fireEvent.click(unhelpful);

    expect(unhelpful).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "submit" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "reasons.incorrect_information" }));
    expect(submit).toBeEnabled();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      turnId: "user-1",
      responseMessageId: "assistant-1",
      rating: "unhelpful",
    });
  });

  it("shows the shared success state even when the detail update fails", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderResponseFeedback();
    const unhelpful = screen.getByRole("button", { name: "unhelpful" });
    fireEvent.click(unhelpful);
    fireEvent.click(await screen.findByRole("checkbox", { name: "reasons.incorrect_information" }));
    fireEvent.click(await screen.findByRole("button", { name: "submit" }));

    expect(await screen.findByText("success")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "title" })).toHaveClass("sr-only");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("serializes the immediate rating write before the detail update", async () => {
    let resolveInitial!: (response: Response) => void;
    const initialResponse = new Promise<Response>((resolve) => {
      resolveInitial = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(initialResponse)
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    renderResponseFeedback();
    fireEvent.click(screen.getByRole("button", { name: "unhelpful" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("checkbox", { name: "reasons.incorrect_information" }));
    fireEvent.click(screen.getByRole("button", { name: "submit" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    resolveInitial(new Response(null, { status: 200 }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      turnId: "user-1",
      responseMessageId: "assistant-1",
      rating: "unhelpful",
      reasonCodes: ["incorrect_information"],
    });
    expect(dialog).toBeInTheDocument();
  });

  it("deletes a helpful rating when the selected button is clicked again", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    renderResponseFeedback();
    const helpful = screen.getByRole("button", { name: "helpful" });

    fireEvent.click(helpful);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    fireEvent.click(helpful);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(helpful).toHaveAttribute("aria-pressed", "false");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/askiris/feedback/assistant-1",
    );
    expect(fetchMock.mock.calls[1][1]).toEqual({ method: "DELETE" });
  });

  it("deletes an unhelpful rating after the detail dialog is skipped", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    renderResponseFeedback();
    const unhelpful = screen.getByRole("button", { name: "unhelpful" });
    fireEvent.click(unhelpful);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "skip" }));
    fireEvent.click(unhelpful);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(unhelpful).toHaveAttribute("aria-pressed", "false");
    expect(fetchMock.mock.calls[1][0]).toBe(
      "/api/askiris/feedback/assistant-1",
    );
    expect(fetchMock.mock.calls[1][1]).toEqual({ method: "DELETE" });
  });
});
