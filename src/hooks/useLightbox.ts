"use client";

import { useState, useCallback, useRef } from "react";
import type { RefObject } from "react";
import { rasterizePoster } from "@/lib/share-image";

export interface LightboxState {
  open: boolean;
  imageUrl: string | null;
  imageLoading: boolean;
  hasScrolled: boolean;
  isScrollable: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  handleOpen: () => Promise<void>;
  handleClose: () => void;
  handleScroll: () => void;
  handleImageLoad: () => void;
}

export function useLightbox(posterRef: RefObject<HTMLDivElement | null>): LightboxState {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const handleOpen = useCallback(async () => {
    setOpen(true);
    if (!posterRef.current) return;
    setImageLoading(true);
    try {
      const url = await rasterizePoster(posterRef.current);
      setImageUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setImageLoading(false);
    }
  }, [posterRef]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setImageUrl(null);
    setImageLoading(false);
    setHasScrolled(false);
    setIsScrollable(false);
  }, []);

  const handleScroll = useCallback(() => {
    setHasScrolled(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    const el = scrollRef.current;
    if (el) {
      setIsScrollable(el.scrollHeight > el.clientHeight + 1);
    }
  }, []);

  return {
    open,
    imageUrl,
    imageLoading,
    hasScrolled,
    isScrollable,
    scrollRef,
    handleOpen,
    handleClose,
    handleScroll,
    handleImageLoad,
  };
}
