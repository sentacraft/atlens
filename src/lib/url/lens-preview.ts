/** The query param that opens a lens preview over whatever page carries it. */
export const LENS_PREVIEW_PARAM = "lens";

const LENS_ID = /^[a-z0-9-]{1,120}$/;

/** The previewed lens id, or null when the param is missing or not a lens id. */
export function readLensPreview(params: URLSearchParams): string | null {
  const value = params.get(LENS_PREVIEW_PARAM);
  return value && LENS_ID.test(value) ? value : null;
}

/** The same location with the preview set to `lensId`, or removed for null. */
export function withLensPreview(location: { pathname: string; search: string; hash: string }, lensId: string | null): string {
  const params = new URLSearchParams(location.search);
  if (lensId) {
    params.set(LENS_PREVIEW_PARAM, lensId);
  } else {
    params.delete(LENS_PREVIEW_PARAM);
  }
  const query = params.toString();
  return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
}
