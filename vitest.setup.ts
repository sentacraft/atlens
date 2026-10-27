import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver; components that only watch for size changes need it to mount.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
