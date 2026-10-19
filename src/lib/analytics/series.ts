/** Trailing mean over `size` points; null until a full window is available. */
export function movingAverage(values: number[], size: number): Array<number | null> {
  let sum = 0;
  return values.map((value, i) => {
    sum += value;
    if (i >= size) {
      sum -= values[i - size];
    }
    return i >= size - 1 ? sum / size : null;
  });
}

/** Relative change from `previous` to `current`; null when there is nothing to compare against. */
export function percentChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) {
    return null;
  }
  return (current - previous) / previous;
}
