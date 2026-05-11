"use client";

import { Toaster } from "sonner";

export default function AppToaster() {
  return (
    <Toaster
      position="top-center"
      offset={16}
      toastOptions={{ className: "whitespace-nowrap" }}
    />
  );
}
