import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface SectionTab {
  key: string;
  label: string;
  href: string;
}

/** The pages of one site section (the lens library, the charts) as tabs at the top of each of them. */
export default function SectionTabs({
  label,
  tabs,
  active,
  action,
}: {
  label: string;
  tabs: SectionTab[];
  active: string;
  /** Sits at the right end of the tab row, such as a page's share button. */
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-200">
      <nav aria-label={label} className="-mb-px flex min-w-0 gap-6 overflow-x-auto whitespace-nowrap [scrollbar-width:none]">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.key === active ? "page" : undefined}
            className={cn(
              "border-b-2 pt-1 pb-3 text-[15px] font-semibold transition-colors",
              tab.key === active ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-500 hover:text-zinc-900",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {action ? <div className="shrink-0 pb-1.5">{action}</div> : null}
    </div>
  );
}
