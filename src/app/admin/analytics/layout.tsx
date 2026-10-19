import { Suspense } from "react";
import AnalyticsFrame from "@/components/admin/AnalyticsFrame";

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
        <h1 className="font-heading text-3xl font-bold text-zinc-900">Analytics</h1>
      </header>
      <Suspense>
        <AnalyticsFrame>{children}</AnalyticsFrame>
      </Suspense>
    </>
  );
}
