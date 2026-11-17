// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { loadGalleryImage } from "../gallery-image";

afterEach(() => {vi.unstubAllGlobals();vi.useRealTimers();});

function mockImage() {
  const image = { naturalWidth: 1200, naturalHeight: 800, onload: null as (() => void) | null, onerror: null as (() => void) | null, src: "" };
  vi.stubGlobal("Image", class { constructor() {return image;} });
  return image;
}

it("loads the actual image aspect ratio and removes its listeners", async () => {
  const image = mockImage();
  const result = loadGalleryImage("/image.webp");
  expect(image.src).toBe("/image.webp");
  image.onload?.();
  expect(await result).toEqual({ width: 1200, height: 800 });
  expect(image.onload).toBeNull();
  expect(image.onerror).toBeNull();
});

it("resolves failed images so the viewer can show its localized error", async () => {
  const image = mockImage();
  const result = loadGalleryImage("/missing.webp");
  image.onerror?.();
  expect(await result).toEqual({ width: 0, height: 0 });
});

it("does not leave a stalled image blocking the viewer indefinitely", async () => {
  vi.useFakeTimers();
  const image = mockImage();
  const result = loadGalleryImage("/stalled.webp");
  await vi.advanceTimersByTimeAsync(8000);
  expect(await result).toEqual({ width: 0, height: 0 });
  expect(image.onload).toBeNull();
});
