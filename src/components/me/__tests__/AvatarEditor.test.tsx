// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import AvatarEditor from "../AvatarEditor";
import { AvatarRequestError } from "@/lib/me/avatar-client";
import { UnreadableImageError } from "@/lib/me/avatar-crop";

const mocks = vi.hoisted(() => ({
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
  refreshSession: vi.fn(),
  prepareAvatarSource: vi.fn(),
  cropToAvatar: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));
vi.mock("@/hooks/useViewport", async (importActual) => ({
  ...(await importActual<typeof import("@/hooks/useViewport")>()),
  useBreakpoint: () => true,
}));
vi.mock("react-easy-crop", async () => {
  const { useEffect, useRef } = await import("react");
  function Cropper({ onCropComplete }: { onCropComplete: (area: unknown, pixels: unknown) => void }) {
    // The real cropper reports a crop when the picture moves, not on every render.
    const report = useRef(onCropComplete);
    useEffect(() => report.current({}, { x: 10, y: 20, width: 200, height: 200 }), []);
    return <div data-testid="cropper" />;
  }
  return { default: Cropper };
});
vi.mock("@/lib/me/avatar-client", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/me/avatar-client")>()),
  uploadAvatar: mocks.uploadAvatar,
  removeAvatar: mocks.removeAvatar,
}));
vi.mock("@/lib/me/avatar-crop", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/me/avatar-crop")>()),
  prepareAvatarSource: mocks.prepareAvatarSource,
  cropToAvatar: mocks.cropToAvatar,
}));
vi.mock("@/lib/me/account-client", () => ({ refreshSession: mocks.refreshSession }));

const PROVIDER_PICTURE = "https://lh3.googleusercontent.com/a/bart";
const UPLOADED = "/api/me/avatar?v=10";
const photo = new File([new Uint8Array([0xff, 0xd8, 0xff])], "me.jpg", { type: "image/jpeg" });

function renderEditor(image: string | null = PROVIDER_PICTURE) {
  return render(<AvatarEditor name="Bart Simpson" email="bart@atlens.app" image={image} />);
}

function pick(file: File) {
  fireEvent.change(screen.getByTestId("avatar-input"), { target: { files: [file] } });
}

// Saving waits for the photo to be prepared and the cropper to report an area.
async function readySaveButton() {
  await screen.findByTestId("cropper");
  const button = screen.getByRole("button", { name: "save" });
  await waitFor(() => expect(button).toBeEnabled());
  return button;
}

beforeEach(() => {
  mocks.prepareAvatarSource.mockResolvedValue("blob:prepared");
  mocks.cropToAvatar.mockResolvedValue(new Blob(["cropped"], { type: "image/jpeg" }));
  mocks.uploadAvatar.mockResolvedValue(UPLOADED);
  mocks.removeAvatar.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AvatarEditor", () => {
  it("opens the file picker straight away when there is no uploaded photo", () => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    renderEditor();

    fireEvent.click(screen.getByRole("button", { name: "avatarUpload" }));

    expect(click).toHaveBeenCalled();
    click.mockRestore();
  });

  it("offers to change or remove an uploaded photo", async () => {
    renderEditor(UPLOADED);

    fireEvent.click(screen.getByRole("button", { name: "avatarMenu" }));

    expect(await screen.findByRole("menuitem", { name: "avatarChange" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "avatarRemove" })).toBeInTheDocument();
  });

  it("removes the photo and refreshes the session", async () => {
    renderEditor(UPLOADED);

    fireEvent.click(screen.getByRole("button", { name: "avatarMenu" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "avatarRemove" }));

    await waitFor(() => expect(mocks.removeAvatar).toHaveBeenCalled());
    expect(mocks.refreshSession).toHaveBeenCalled();
  });

  // A large photo takes a moment to decode; the dialog must say so instead of showing a blank box.
  it("shows that the photo is being prepared until it is ready", async () => {
    let ready: (url: string) => void = () => {};
    mocks.prepareAvatarSource.mockReturnValue(new Promise<string>((resolve) => (ready = resolve)));
    renderEditor();
    pick(photo);

    expect(await screen.findByRole("status")).toHaveTextContent("avatarPreparing");
    expect(screen.queryByTestId("cropper")).toBeNull();
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();

    ready("blob:prepared");

    expect(await screen.findByTestId("cropper")).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("crops and uploads the picked photo, then closes", async () => {
    renderEditor();
    pick(photo);

    fireEvent.click(await readySaveButton());

    await waitFor(() => expect(mocks.uploadAvatar).toHaveBeenCalled());
    expect(mocks.cropToAvatar).toHaveBeenCalledWith("blob:prepared", { x: 10, y: 20, width: 200, height: 200 });
    expect(mocks.refreshSession).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByTestId("cropper")).toBeNull());
  });

  it("keeps the dialog open with a message when the upload fails", async () => {
    mocks.uploadAvatar.mockRejectedValue(new Error("network"));
    renderEditor();
    pick(photo);

    fireEvent.click(await readySaveButton());

    expect(await screen.findByText("avatarError")).toBeInTheDocument();
    expect(screen.getByTestId("cropper")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "save" })).toBeEnabled();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("says when the daily upload limit is reached", async () => {
    mocks.uploadAvatar.mockRejectedValue(new AvatarRequestError("rate_limited"));
    renderEditor();
    pick(photo);

    fireEvent.click(await readySaveButton());

    expect(await screen.findByText("avatarLimit")).toBeInTheDocument();
  });

  // A HEIC file in a browser that cannot decode it must not reach a Save that would fail later.
  it("reports an image the browser cannot open and blocks saving", async () => {
    mocks.prepareAvatarSource.mockRejectedValue(new UnreadableImageError());
    renderEditor();
    pick(photo);

    expect(await screen.findByText("avatarUnreadable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
  });
});
