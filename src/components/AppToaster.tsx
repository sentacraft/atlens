"use client";

import { Toaster } from "sonner";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export default function AppToaster() {
  const isDesktop = useBreakpoint("sm");

  return (
    <Toaster
      position={isDesktop ? "top-center" : "bottom-center"}
      offset={16}
      toastOptions={{ className: "whitespace-nowrap" }}
    />
  );
}
