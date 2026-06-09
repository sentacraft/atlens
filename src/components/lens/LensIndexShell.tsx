import type { ReactNode } from "react";
import { LENS_INDEX_SHELL_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import LensSectionNav from "@/components/lens/LensSectionNav";

/**
 * Shared outer shell for the two tab-bearing lens index views (All Lenses and
 * Collections). It owns the section nav's position — horizontal width/padding
 * and top offset — in a single place, so the tab row sits at the exact same
 * spot on both routes and never shifts when the user switches tabs. Each page
 * passes its own bottom padding via `className` and renders its page-specific
 * content (filters, summaries, grids) as children below the nav, where
 * differing spacing is harmless because it cannot move the nav.
 */
export default function LensIndexShell({
  navRightSlot,
  className,
  children,
}: {
  navRightSlot?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn(`${LENS_INDEX_SHELL_CLS} flex flex-col pt-4 sm:pt-8`, className)}>
      <LensSectionNav rightSlot={navRightSlot} />
      {children}
    </div>
  );
}
