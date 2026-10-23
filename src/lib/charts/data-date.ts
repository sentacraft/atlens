/** The data snapshot date for a poster footer: 2026-10-22 in Chinese, Oct 22, 2026 in English. */
export function formatDataDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (locale === "zh") {
    return date.toISOString().slice(0, 10);
  }
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}
