import type { ReactNode } from "react";
import { LENS_INDEX_SHELL_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import LensSectionNav from "@/components/browse/LensSectionNav";

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
