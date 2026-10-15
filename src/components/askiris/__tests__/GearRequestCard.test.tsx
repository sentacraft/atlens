// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getLensSummaries } from "@/lib/lens/data";
import GearRequestCard from "../GearRequestCard";

const mocks = vi.hoisted(() => ({
  session: { data: null as unknown },
  openSignIn: vi.fn(),
  addCatalog: vi.fn((_ids: unknown, options?: { onSuccess?: () => void }) => options?.onSuccess?.()),
}));

vi.mock("next-intl", () => {
  const t = (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(",")}` : key);
  t.has = () => false;
  return { useTranslations: () => t };
});
vi.mock("@/lib/auth-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth-client")>()),
  authClient: { useSession: () => mocks.session },
}));
vi.mock("@/context/SignInDialogProvider", () => ({ useSignInDialog: () => mocks.openSignIn }));
vi.mock("@/components/me/useGearAdders", () => ({
  useGearAdders: () => ({
    gear: [],
    openBodyDialog: vi.fn(),
    openLensSearch: vi.fn(),
    addCatalog: mocks.addCatalog,
    adding: false,
    dialogs: null,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const lenses = getLensSummaries("zh");
const account = { user: { id: "u1", name: "Iris", email: "iris@example.test", isAnonymous: false } };

function renderCard(props: Partial<Parameters<typeof GearRequestCard>[0]> = {}) {
  const onAnswer = vi.fn();
  render(
    <GearRequestCard input={{ bodies: ["X-T5"], lenses: ["18-55"] }} active lenses={lenses} onAnswer={onAnswer} {...props} />,
  );
  return onAnswer;
}

describe("GearRequestCard", () => {
  it("asks a guest to sign in, or lets them carry on without it", () => {
    mocks.session = { data: { user: { ...account.user, isAnonymous: true } } };
    const onAnswer = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "signIn" }));
    expect(mocks.openSignIn).toHaveBeenCalledWith("gear");

    fireEvent.click(screen.getByRole("button", { name: "notNow" }));
    expect(onAnswer).toHaveBeenCalledWith({ outcome: "not_signed_in" });
  });

  it("preselects what the user named unambiguously and leaves the rest for them to find", () => {
    mocks.session = { data: account };
    renderCard();

    expect(screen.getByRole("button", { name: "removePending X-T5" })).toBeInTheDocument();
    expect(screen.getByText("unresolved 18-55")).toBeInTheDocument();
  });

  it("saves the preselected gear before telling Iris to continue", () => {
    mocks.session = { data: account };
    const onAnswer = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "save" }));

    expect(mocks.addCatalog).toHaveBeenCalledWith({ bodies: ["fujifilm-x-t5"], lenses: [] }, expect.anything());
    expect(onAnswer).toHaveBeenCalledWith({ outcome: "saved" });
  });

  it("skips without saving", () => {
    mocks.session = { data: account };
    const onAnswer = renderCard();

    fireEvent.click(screen.getByRole("button", { name: "skip" }));

    expect(mocks.addCatalog).not.toHaveBeenCalled();
    expect(onAnswer).toHaveBeenCalledWith({ outcome: "skipped" });
  });

  it("shows only what happened once answered, and nothing once the chat has moved on", () => {
    mocks.session = { data: account };
    renderCard({ output: { outcome: "skipped" } });
    expect(screen.getByText("skipped")).toBeInTheDocument();
    cleanup();

    const { container } = render(
      <GearRequestCard input={{}} active={false} lenses={lenses} onAnswer={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
