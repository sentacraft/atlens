"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface BreadcrumbSegment {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  segments: BreadcrumbSegment[];
  current: string;
}

const linkCls =
  "text-zinc-500 transition-colors hover:text-zinc-900";

export default function Breadcrumb({ segments, current }: BreadcrumbProps) {
  const parent = segments[segments.length - 1];

  return (
    <>
      {parent && (
        <Link
          href={parent.href}
          className={`inline-flex w-fit items-center gap-1.5 text-sm sm:hidden ${linkCls}`}
        >
          <ArrowLeft className="size-3.5" />
          {parent.label}
        </Link>
      )}

      <nav
        aria-label="breadcrumb"
        className="hidden items-center gap-1.5 text-xs sm:flex"
      >
        {segments.map((seg, i) => (
          <span key={i} className="contents">
            <Link href={seg.href} className={linkCls}>
              {seg.label}
            </Link>
            <ChevronRight className="size-3 text-zinc-300" />
          </span>
        ))}
        <span className="text-zinc-900">{current}</span>
      </nav>
    </>
  );
}
