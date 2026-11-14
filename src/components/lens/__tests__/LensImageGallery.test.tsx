// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import LensImageGallery from "../LensImageGallery";
import { ACTIVE_DOT_CLS } from "@/config/ui-tokens";

afterEach(cleanup);

const labels = {
  images: ["Main", "Image 2", "Image 3"],
  open: "Enlarge",
  close: "Close",
  previous: "Previous",
  next: "Next",
};

it("starts on the primary image and opens the selected supplemental image", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", alternateImages: ["003", "001"] }} labels={labels} />);

  const trigger = screen.getByRole("button", { name: labels.open });
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
  fireEvent.click(screen.getAllByRole("button", { name: "Image 2" })[0]);
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(within(dialog).getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain(encodeURIComponent("/lenses/example/003.webp"));
  fireEvent.keyDown(dialog, { key: "ArrowRight" });
  expect(within(dialog).getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain(encodeURIComponent("/lenses/example/001.webp"));
  expect((within(dialog).getByRole("button", { name: labels.next }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(within(dialog).getByRole("button", { name: labels.close }));
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example/001.webp"));
});

it("switches images from the page arrows without opening the viewer", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", alternateImages: ["003"] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  const previous = screen.getByRole("button", { name: labels.previous }) as HTMLButtonElement;
  const next = screen.getByRole("button", { name: labels.next }) as HTMLButtonElement;

  expect(previous.disabled).toBe(true);
  expect(trigger.querySelector("button")).toBeNull();
  fireEvent.click(next);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example/003.webp"));
  expect(next.disabled).toBe(true);
  fireEvent.click(previous);
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("moves the shared active-dot style to the selected image", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", alternateImages: ["003"] }} labels={labels} />);
  const dots = screen.getAllByRole("button", { name: "Main" }).filter(button => !button.querySelector("img"));
  const nextDots = screen.getAllByRole("button", { name: "Image 2" }).filter(button => !button.querySelector("img"));
  const dot = dots[0].firstElementChild!;
  const nextDot = nextDots[0].firstElementChild!;

  expect(dot.classList.contains(ACTIVE_DOT_CLS)).toBe(true);
  expect(nextDot.classList.contains(ACTIVE_DOT_CLS)).toBe(false);
  fireEvent.click(nextDots[0]);
  expect(dot.classList.contains(ACTIVE_DOT_CLS)).toBe(false);
  expect(nextDot.classList.contains(ACTIVE_DOT_CLS)).toBe(true);
});

it("does not switch images or open the viewer after a multi-finger gesture", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", alternateImages: ["003"] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  fireEvent.touchStart(trigger, { touches: [{ clientX: 200, clientY: 200 }] });
  fireEvent.touchStart(trigger, { touches: [{ clientX: 200, clientY: 200 }, { clientX: 250, clientY: 200 }] });
  fireEvent.touchEnd(trigger, { touches: [{ clientX: 250, clientY: 200 }], changedTouches: [{ clientX: 130, clientY: 200 }] });
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("opens a single primary image without paging controls", async () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example" }} labels={labels} />);
  expect(screen.getAllByRole("button").map(button => button.getAttribute("aria-label"))).toEqual([labels.open]);
  fireEvent.click(screen.getByRole("button", { name: labels.open }));
  const dialog = await screen.findByRole("dialog", { name: "Example" });
  expect(within(dialog).getAllByRole("button").map(button => button.getAttribute("aria-label"))).toEqual([labels.close]);
  expect(within(dialog).getByRole("img", { name: "Example" })).toBeTruthy();
});

it("switches on a horizontal gesture and leaves vertical gestures to the page", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example", alternateImages: ["003"] }} labels={labels} />);
  const trigger = screen.getByRole("button", { name: labels.open });
  const touch = (clientX: number, clientY: number) => ({ clientX, clientY });
  fireEvent.touchStart(trigger, { touches: [touch(200, 200)] });
  fireEvent.touchEnd(trigger, { changedTouches: [touch(150, 300)] });
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
  fireEvent.touchStart(trigger, { touches: [touch(200, 200)] });
  fireEvent.touchEnd(trigger, { changedTouches: [touch(130, 206)] });
  fireEvent.click(trigger, { detail: 1 });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(within(trigger).getByRole("img").getAttribute("src")).toContain(encodeURIComponent("/lenses/example/003.webp"));
});
