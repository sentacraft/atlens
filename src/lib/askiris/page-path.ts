import { z } from "zod";

/** The path and query of the page a turn was asked from; the server reads the page context out of it. */
export const pagePathSchema = z.string().startsWith("/").max(2048);

export function currentPagePath(): string {
  return `${window.location.pathname}${window.location.search}`;
}
