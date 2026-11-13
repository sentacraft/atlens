// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import LensImageGallery from "../LensImageGallery";

afterEach(cleanup);

it("starts on the primary image and preserves the catalog order of supplemental images", () => {
  render(<LensImageGallery
    lens={{ id: "example", model: "Example", alternateImages: ["003", "001"] }}
    primaryLabel="Main"
    imageLabels={["Image 2", "Image 3"]}
  />);

  const image = screen.getByRole("img", { name: "Example" });
  expect(image.getAttribute("src")).toContain(encodeURIComponent("/lenses/example.webp"));
  expect(screen.getAllByRole("button").map(button => button.getAttribute("aria-label")))
    .toEqual(["Main", "Image 2", "Image 3"]);
  fireEvent.click(screen.getByRole("button", { name: "Image 2" }));
  expect(screen.getByRole("img", { name: "Example" }).getAttribute("src"))
    .toContain(encodeURIComponent("/lenses/example/003.webp"));
  fireEvent.click(screen.getByRole("button", { name: "Main" }));
  expect(screen.getByRole("button", { name: "Main" }).getAttribute("aria-pressed")).toBe("true");
});

it("shows a single image without gallery controls for existing catalog entries", () => {
  render(<LensImageGallery lens={{ id: "example", model: "Example" }} primaryLabel="Main" />);
  expect(screen.getByRole("img", { name: "Example" })).toBeTruthy();
  expect(screen.queryByRole("button")).toBeNull();
});
