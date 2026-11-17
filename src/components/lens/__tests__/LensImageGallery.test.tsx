// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import PhotoSwipe from "photoswipe";
import LensImageGallery from "../LensImageGallery";
import { loadGalleryImage } from "@/lib/lens/gallery-image";

type MockApi = {
  selectedScrollSnap: () => number;
  scrollTo: (index: number, jump?: boolean) => void;
  on: (event: string, callback: (api: MockApi) => void) => void;
  off: (event: string, callback: (api: MockApi) => void) => void;
  emit: (event: string) => void;
};

const mocks = vi.hoisted(() => ({ instances: [] as MockApi[] }));

vi.mock("@/lib/lens/gallery-image", () => ({ loadGalleryImage: vi.fn(async () => ({ width: 800, height: 800 })) }));

vi.mock("@/data/lens-images.generated", () => ({ LENS_IMAGE_HASHES: {} }));
vi.mock("@/data/public-assets.generated", () => ({
  PUBLIC_ASSET_URLS: {
    "lens-images/example/001": "/r2-assets/example/001.webp",
    "lens-images/example/003": "/r2-assets/example/003.webp",
  },
}));

vi.mock("embla-carousel-react", async () => {
  const { useCallback, useState } = await import("react");
  return {
    default: function useMockEmblaCarousel() {
      const [api, setApi] = useState<MockApi>();
      const ref = useCallback((node: HTMLElement | null) => {
        if (!node) {
          setApi(undefined);
          return;
        }
        let selected = 0;
        const last = node.querySelectorAll('[data-slot="gallery-slide"]').length - 1;
        const listeners = new Map<string, Set<(api: MockApi) => void>>();
        const instance: MockApi = {
          selectedScrollSnap: () => selected,
          scrollTo: vi.fn((index: number) => {
            const next = Math.max(0, Math.min(last, index));
            if (next === selected) {return;}
            selected = next;
            instance.emit("select");
          }),
          on: vi.fn((event, callback) => {
            if (!listeners.has(event)) {listeners.set(event, new Set());}
            listeners.get(event)!.add(callback);
          }),
          off: vi.fn((event, callback) => { listeners.get(event)?.delete(callback); }),
          emit: event => { listeners.get(event)?.forEach(callback => callback(instance)); },
        };
        mocks.instances.push(instance);
        setApi(instance);
      }, []);
      return [ref, api];
    },
  };
});

beforeEach(() => {
  vi.spyOn(document.documentElement, "clientWidth", "get").mockReturnValue(1024);
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
});

afterEach(() => {
  cleanup();
  mocks.instances.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const labels = {
  images: ["Main", "Image 2", "Image 3"],
  open: "Enlarge",
  close: "Close",
  previous: "Previous",
  next: "Next",
  zoom: "Zoom",
  loading: "Loading",
  error: "Image unavailable",
  hint: { mouse: "Arrows to browse · Click to zoom in/out", touch: "Swipe to browse · Double-tap to zoom", mouseSingle: "Click to zoom in/out", touchSingle: "Double-tap to zoom" },
};

it("starts on the primary image and opens the selected supplemental image", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }, { id: "001", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
  fireEvent.click(screen.getAllByRole("button", { name: "Image 2" })[0]);
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(within(dialog).getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain("/r2-assets/example/003.webp");
  fireEvent.keyDown(document, { key: "ArrowRight" });
  expect(within(dialog).getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain("/r2-assets/example/001.webp");
  expect((within(dialog).getByRole("button", { name: labels.next }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole("button", { name: labels.close }));
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/r2-assets/example/001.webp"));
});

it("switches images from the page arrows without opening the viewer", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  const previous = screen.getByRole("button", { name: labels.previous }) as HTMLButtonElement;
  const next = screen.getByRole("button", { name: labels.next }) as HTMLButtonElement;
  expect(previous.disabled).toBe(true);
  expect(trigger.querySelector("button")).toBeNull();
  fireEvent.click(next);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/r2-assets/example/003.webp"));
  expect(next.disabled).toBe(true);
  fireEvent.click(previous);
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
});

it("uses an in-image counter instead of one mobile button per image", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  expect(within(trigger).getByText("1 / 2")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Image 2" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: labels.next }));
  expect(within(trigger).getByText("2 / 2")).toBeTruthy();
});

it("keeps the main carousel synchronized with the viewer and restores selection", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }, { id: "001", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  const main = mocks.instances[0];
  act(() => main.scrollTo(1));
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Image 3" }));
  await waitFor(() => expect(main.selectedScrollSnap()).toBe(2));
  fireEvent.click(within(dialog).getByRole("button", { name: labels.close }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(trigger).toBe(document.activeElement);
  fireEvent.click(trigger);
  const reopened = await screen.findByRole("dialog", { name: "Example" });
  expect(within(reopened).getByRole("button", { name: "Image 3" }).getAttribute("aria-pressed")).toBe("true");
});

it("keeps the active carousel's motion intact when its selected index changes", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }] }} labels={labels} />);
  const main = mocks.instances[0];
  act(() => main.scrollTo(1));
  expect(main.scrollTo).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("button", { name: "Image 2" })[0].getAttribute("aria-pressed")).toBe("true");
});

it("renders only the selected slide to assistive technology", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }, { id: "001", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  expect(within(trigger).getAllByRole("img", { hidden: true })).toHaveLength(3);
  expect(within(trigger).getAllByRole("img")).toHaveLength(1);
});

it("unsubscribes from carousel events on unmount", () => {
  const { unmount } = render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }] }} labels={labels} />);
  const main = mocks.instances[0];
  unmount();
  expect(main.off).toHaveBeenCalledWith("select", expect.any(Function));
  expect(main.off).toHaveBeenCalledWith("reInit", expect.any(Function));
});

it("uses classified product assets without mixing technical figures into the product carousel", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "001", role: "mtf" }, { id: "003", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  expect(trigger.querySelectorAll('[data-slot="gallery-slide"]')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Image 2" })[0]);
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/r2-assets/example/003.webp"));
});

it("uses native mouse click zoom and changes the hint with the input device", async () => {
  const init = vi.spyOn(PhotoSwipe.prototype, "init");
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }] }} labels={labels} />);
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  const viewer = init.mock.contexts[0] as PhotoSwipe;
  expect(viewer.options.imageClickAction).toBe("zoom");
  expect(viewer.options.doubleTapAction).toBe("zoom");
  expect(within(dialog).getByText(labels.hint.touch)).toBeTruthy();
  act(() => viewer.dispatch("pointerDown", { originalEvent: { pointerType: "mouse" } as PointerEvent }));
  expect(within(dialog).getByText(labels.hint.mouse)).toBeTruthy();
  expect(dialog.querySelector('[data-slot="gallery-controls"]')?.hasAttribute("inert")).toBe(false);
  act(() => viewer.dispatch("pointerDown", { originalEvent: { pointerType: "touch" } as PointerEvent }));
  expect(within(dialog).getByText(labels.hint.touch)).toBeTruthy();
});

it("leaves browsing instructions out of single-image hints", async () => {
  const init = vi.spyOn(PhotoSwipe.prototype, "init");
  render(<LensImageGallery lens={{ id: "example", model: "Example" }} labels={labels} />);
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(within(dialog).getByText(labels.hint.touchSingle)).toBeTruthy();
  act(() => (init.mock.contexts[0] as PhotoSwipe).dispatch("pointerDown", { originalEvent: { pointerType: "mouse" } as PointerEvent }));
  expect(within(dialog).getByText(labels.hint.mouseSingle)).toBeTruthy();
});

it("shows a localized load error and still allows closing", async () => {
  vi.mocked(loadGalleryImage).mockResolvedValueOnce({ width: 0, height: 0 });
  render(<LensImageGallery lens={{ id: "example", model: "Example" }} labels={labels} />);
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  fireEvent.error(within(dialog).getByRole("img", { name: "Example" }));
  expect(dialog.querySelector<HTMLElement>(".pswp__error-msg")?.innerText).toBe(labels.error);
  fireEvent.click(within(dialog).getByRole("button", { name: labels.close }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
});

it("restores scrolling and removes the viewer on unmount", async () => {
  const { unmount } = render(<LensImageGallery lens={{ id: "example", model: "Example" }} labels={labels} />);
  const previousOverflow = document.body.style.overflow;
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  await screen.findByRole("dialog", { name: "Example" });
  expect(document.body.style.overflow).toBe("hidden");
  unmount();
  expect(document.body.querySelector(".pswp")).toBeNull();
  expect(document.body.style.overflow).toBe(previousOverflow);
});

it("opens a single primary image without paging controls", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example" }} labels={labels} />);
  expect(screen.getAllByRole("button").map(button => button.getAttribute("aria-label"))).toEqual([labels.open]);
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(within(dialog).getAllByRole("button").map(button => button.getAttribute("aria-label"))).toEqual([labels.zoom, labels.close]);
  expect(within(dialog).getByRole("img", { name: "Example" })).toBeTruthy();
});
