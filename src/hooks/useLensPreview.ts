"use client";

import { useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { readLensPreview, withLensPreview } from "@/lib/url/lens-preview";

// Set when this tab pushed the preview's history entry, so closing can step back over it; a
// preview opened from a shared link has no entry of ours to step back over.
let pushedPreview = false;

/** The lens previewed over the current page, from the URL, and the actions that open and close it. */
export function useLensPreview() {
  const lensId = readLensPreview(useSearchParams());
  useEffect(() => {
    // Back or forward left the preview by itself; the entry is no longer ours to step over.
    if (!lensId) {
      pushedPreview = false;
    }
  }, [lensId]);

  const openLensPreview = useCallback((id: string) => {
    const url = withLensPreview(window.location, id);
    if (readLensPreview(new URLSearchParams(window.location.search))) {
      window.history.replaceState(null, "", url);
    } else {
      window.history.pushState(null, "", url);
      pushedPreview = true;
    }
  }, []);

  const closeLensPreview = useCallback(() => {
    if (pushedPreview) {
      pushedPreview = false;
      window.history.back();
    } else {
      window.history.replaceState(null, "", withLensPreview(window.location, null));
    }
  }, []);

  return { lensId, openLensPreview, closeLensPreview };
}

/**
 * A lens link's click handler that previews the lens instead; modified and middle clicks keep
 * the link's own behaviour, opening the full page.
 */
export function previewOnPlainClick(event: React.MouseEvent, preview: () => void) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  event.preventDefault();
  preview();
}
