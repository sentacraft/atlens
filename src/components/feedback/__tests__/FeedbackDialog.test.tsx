// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FeedbackDialog from "../FeedbackDialog";
import FeedbackCard from "../FeedbackCard";
import { createFeedbackDraft } from "@/lib/feedback/feedback-draft";
import { useFeedback } from "@/lib/feedback/use-feedback";

const mocks = vi.hoisted(() => ({ session: { user: { email: "reader@example.com", isAnonymous: false } } as { user: { email: string; isAnonymous: boolean } } | null }));
vi.mock("@/lib/auth-client", () => ({ authClient: { useSession: () => ({ data: mocks.session }) } }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components/iris/Iris", () => ({ default: () => <div data-testid="iris" /> }));
vi.mock("@/lib/analytics/analytics", () => ({ track: vi.fn() }));

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => { mocks.session = { user: { email: "reader@example.com", isAnonymous: false } }; });

function setup(kind: "manual" | "iris", overrides = {}) {
  const seed = createFeedbackDraft({ type: "general", ...overrides });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  function Manual() {
    const feedback = useFeedback(seed, true);
    return <FeedbackDialog open onOpenChange={vi.fn()} feedback={feedback} mode="create" />;
  }
  const view = render(<QueryClientProvider client={client}>{kind === "manual" ? <Manual /> : <FeedbackCard draft={seed} />}</QueryClientProvider>);
  return { ...view, client, seed };
}

function mockApi(post: () => Promise<Response> = async () => Response.json({ status: "sent" })) {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => init?.method === "POST" ? post() : Promise.resolve(Response.json({ status: null })));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function ready() { await waitFor(() => expect(screen.getByRole("button", { name: /^(submit|send)$/ })).toBeEnabled()); }

describe.each(["manual", "iris"] as const)("%s feedback", (kind) => {
  it("prefills an editable account email without checking replies", async () => {
    mockApi();
    setup(kind);
    const toggle = screen.getByRole("checkbox");
    expect(toggle).not.toBeChecked();
    expect(screen.queryByPlaceholderText("replyContactPlaceholder")).toBeNull();
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByPlaceholderText("replyContactPlaceholder")).toHaveValue("reader@example.com"));
    fireEvent.change(screen.getByPlaceholderText("replyContactPlaceholder"), { target: { value: "other@example.com" } });
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.queryByPlaceholderText("replyContactPlaceholder")).toBeNull());
    fireEvent.click(toggle);
    await waitFor(() => expect(screen.getByPlaceholderText("replyContactPlaceholder")).toHaveValue("other@example.com"));
  });

  it("does not prefill a guest's synthetic email", async () => {
    mockApi();
    mocks.session = { user: { email: "anonymous@internal.invalid", isAnonymous: true } };
    setup(kind);
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(screen.getByPlaceholderText("replyContactPlaceholder")).toHaveValue(""));
  });

  it("submits one request without an unselected reply contact", async () => {
    const fetchMock = mockApi();
    const { seed } = setup(kind, { description: "Please add this filter." });
    if (kind === "manual") {fireEvent.change(screen.getByPlaceholderText("descriptionPlaceholderMain"), { target: { value: "Please add this filter." } });}
    await ready();
    fireEvent.click(screen.getByRole("button", { name: kind === "manual" ? "submit" : "send" }));
    await waitFor(() => expect(screen.getByText(kind === "manual" ? "success" : "submitted")).toBeInTheDocument());
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(1);
    expect(JSON.parse(posts[0][1]!.body as string)).toEqual({ submissionId: seed.id, type: "general", description: "Please add this filter." });
  });

  it("keeps the edited draft after a known failure", async () => {
    const fetchMock = mockApi(async () => Response.json({ error: "feedback_unavailable" }, { status: 503 }));
    setup(kind, { description: "Please check this field." });
    await ready();
    fireEvent.click(screen.getByRole("button", { name: kind === "manual" ? "submit" : "send" }));
    await waitFor(() => expect(screen.getByText("errorPreserved")).toBeInTheDocument());
    if (kind === "manual") {expect(screen.getByPlaceholderText("descriptionPlaceholderMain")).toHaveValue("Please check this field.");}
    else {expect(screen.getByText("Please check this field.")).toBeInTheDocument();}
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });
});

describe("Iris feedback card", () => {
  it("honors an explicit reply request and lets the user change the contact", async () => {
    const fetchMock = mockApi();
    setup("iris", { description: "Please add this filter.", wantsReply: true });
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.change(screen.getByPlaceholderText("replyContactPlaceholder"), { target: { value: "alternate@example.com" } });
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(screen.getByText("submitted")).toBeInTheDocument());
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(post![1]!.body as string).replyContact).toBe("alternate@example.com");
  });

  it("shows contact validation without submitting a guest's empty contact", async () => {
    mocks.session = null;
    const fetchMock = mockApi();
    setup("iris", { description: "A request.", wantsReply: true });
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "send" }));
    expect(screen.getByText("contactRequired")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("restores a submitted receipt on remount without sending again or showing an unverified old draft", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: "sent" }));
    vi.stubGlobal("fetch", fetchMock);
    setup("iris", { description: "Original draft." });
    await waitFor(() => expect(screen.getByText("submitted")).toBeInTheDocument());
    expect(screen.queryByText("viewContent")).toBeNull();
    expect(fetchMock.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });

  it("locks a draft immediately when a POST returns an uncertain outcome", async () => {
    const fetchMock = mockApi(async () => Response.json({ status: "uncertain", error: "submission_uncertain" }, { status: 502 }));
    setup("iris", { description: "A request." });
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "send" }));
    await waitFor(() => expect(screen.getByText("uncertain")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "send" })).toBeDisabled();
    expect(screen.queryByText("errorPreserved")).toBeNull();
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("does not allow a second send when the remote result is uncertain", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ status: "uncertain" })));
    setup("iris", { description: "A request." });
    await waitFor(() => expect(screen.getByText("uncertain")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "send" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "checkStatus" })).toBeEnabled();
  });
});
