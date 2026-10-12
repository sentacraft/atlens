// A page's `searchParams` yields an array when a key repeats; callers that expect a
// single value take the first.
export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
