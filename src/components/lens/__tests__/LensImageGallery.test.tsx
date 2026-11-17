// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LensImageGallery from "../LensImageGallery";
import { ACTIVE_DOT_CLS } from "@/config/ui-tokens";

type MockApi = {
  selectedScrollSnap: () => number;
  scrollTo: (index: number, jump?: boolean) => void;
  on: (event: string, callback: (api: MockApi) => void) => void;
  off: (event: string, callback: (api: MockApi) => void) => void;
  emit: (event: string) => void;
};

const mocks = vi.hoisted(() => ({ instances: [] as MockApi[] }));

vi.mock("@/data/lens-images.generated", () => ({
  LENS_IMAGE_HASHES: {},
  LENS_SUPPLEMENTAL_IMAGES: {
    "example/001": "/r2-assets/example/001.webp",
    "example/003": "/r2-assets/example/003.webp",
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

afterEach(() => {
  cleanup();
  mocks.instances.length = 0;
});

const labels = {
  images: ["Main", "Image 2", "Image 3"],
  open: "Enlarge",
  close: "Close",
  previous: "Previous",
  next: "Next",
};

it("starts on the primary image and opens the selected supplemental image", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }, { id: "001", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
  fireEvent.click(screen.getAllByRole("button", { name: "Image 2" })[0]);
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(within(dialog).getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain(encodeURIComponent("/r2-assets/example/003.webp"));
  fireEvent.keyDown(dialog, { key: "ArrowRight" });
  expect(within(dialog).getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain(encodeURIComponent("/r2-assets/example/001.webp"));
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

it("moves the shared active-dot style to the selected image", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }] }} labels={labels} />);
  const main = screen.getAllByRole("button", { name: "Main" }).find(button => !button.querySelector("img"))!;
  const next = screen.getAllByRole("button", { name: "Image 2" }).find(button => !button.querySelector("img"))!;
  expect(main.firstElementChild!.classList.contains(ACTIVE_DOT_CLS)).toBe(true);
  expect(next.firstElementChild!.classList.contains(ACTIVE_DOT_CLS)).toBe(false);
  fireEvent.click(next);
  expect(main.firstElementChild!.classList.contains(ACTIVE_DOT_CLS)).toBe(false);
  expect(next.firstElementChild!.classList.contains(ACTIVE_DOT_CLS)).toBe(true);
});

it("keeps both carousels synchronized and restores the selected image on reopening", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", images: [{ id: "003", role: "product" }, { id: "001", role: "product" }] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  const main = mocks.instances[0];
  act(() => main.scrollTo(1));
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(trigger);
  let dialog = await screen.findByRole("dialog", { name: "Example" });
  const viewer = mocks.instances[1];
  expect(viewer.selectedScrollSnap()).toBe(1);
  act(() => viewer.scrollTo(2));
  expect(main.selectedScrollSnap()).toBe(2);
  fireEvent.click(within(dialog).getByRole("button", { name: labels.close }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(viewer.off).toHaveBeenCalledWith("select", expect.any(Function));
  fireEvent.click(trigger);
  dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(mocks.instances[2].selectedScrollSnap()).toBe(2);
  expect(within(dialog).getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain(encodeURIComponent("/r2-assets/example/001.webp"));
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

it("opens a single primary image without paging controls", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example" }} labels={labels} />);
  expect(screen.getAllByRole("button").map(button => button.getAttribute("aria-label"))).toEqual([labels.open]);
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(within(dialog).getAllByRole("button").map(button => button.getAttribute("aria-label"))).toEqual([labels.close]);
  expect(within(dialog).getByRole("img", { name: "Example" })).toBeTruthy();
});
