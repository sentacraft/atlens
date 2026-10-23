/** Position of `f` between `lo` and `hi` on a log scale, 0 at `lo` and 1 at `hi`. */
export function logFrac(f: number, lo: number, hi: number): number {
  return Math.log(f / lo) / Math.log(hi / lo);
}

// Two decimals: the browser re-serializes inline styles, and longer values or calc() come back in a
// different form, which React reports as a hydration mismatch.
export function pct(frac: number): string {
  return `${(frac * 100).toFixed(2)}%`;
}
