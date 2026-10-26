// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { cineCollectionTag } from "../CineCollectionLink";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}));

afterEach(cleanup);

describe("cineCollectionTag", () => {
  it("links the cine lens note to the cine collection", () => {
    render(<p>{cineCollectionTag("X")("cine lenses")}</p>);

    expect(screen.getByRole("link", { name: "cine lenses" })).toHaveAttribute("href", "/lenses/x/collections/cine");
  });

  it("leaves the note as text on a mount without collections", () => {
    render(<p>{cineCollectionTag("G")("cine lenses")}</p>);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("cine lenses")).toBeInTheDocument();
  });
});
