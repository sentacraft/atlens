"use client";

import { useEffect, useState } from "react";

export function usePwa(): boolean {
  const [isPwa, setIsPwa] = useState(false);
  useEffect(() => {
    setIsPwa(window.matchMedia("(display-mode: standalone)").matches);
  }, []);
  return isPwa;
}
