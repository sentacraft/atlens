"use client";

import { useState } from "react";
import { ArrowDown, ChevronRight } from "lucide-react";
import type { BreakdownNode, FunnelStep } from "@/lib/analytics/breakdown";
import { SERIES, SERIES_PART } from "@/components/admin/chart-colors";

const fmt = (value: number) => value.toLocaleString("en-US");

function share(part: number, whole: number): string {
  if (whole <= 0) {
    return "—";
  }
  const value = (part / whole) * 100;
  return `${value >= 10 || value === 0 ? Math.round(value) : value.toFixed(1)}%`;
}

const width = (part: number, whole: number) => `${whole > 0 ? Math.max((part / whole) * 100, 0.5) : 0}%`;

/** Which nodes are open, by their path of values; a level opens on its own when it is shallow enough. */
function useOpenPaths(openDepth: number) {
  const [toggled, setToggled] = useState<Set<string>>(() => new Set());
  const isOpen = (path: string, depth: number) => (depth < openDepth) !== toggled.has(path);
  const toggle = (path: string) =>
    setToggled((previous) => {
      const next = new Set(previous);
      if (!next.delete(path)) {
        next.add(path);
      }
      return next;
    });
  return { isOpen, toggle };
}

type OpenPaths = ReturnType<typeof useOpenPaths>;

function NodeRows({
  nodes,
  parentCount,
  depth,
  indent,
  path,
  open,
}: {
  nodes: BreakdownNode[];
  parentCount: number;
  depth: number;
  indent: number;
  path: string;
  open: OpenPaths;
}) {
  return nodes.map((node) => {
    const nodePath = `${path}/${node.value ?? ""}`;
    const expandable = node.children.length > 0;
    const expanded = expandable && open.isOpen(nodePath, depth);
    return (
      <li key={nodePath}>
        <div className="grid grid-cols-[minmax(0,1fr)_4rem_3rem] items-center gap-x-2 border-t border-zinc-100 py-1" style={{ paddingLeft: indent * 16 }}>
          <div className="min-w-0">
            {expandable ? (
              <button
                type="button"
                onClick={() => open.toggle(nodePath)}
                aria-expanded={expanded}
                className="flex min-h-7 max-w-full items-center gap-1 text-left text-sm text-zinc-800 hover:text-zinc-950"
              >
                <ChevronRight size={14} aria-hidden className={`shrink-0 text-zinc-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
                <span className="truncate" title={node.label}>{node.label}</span>
              </button>
            ) : (
              <span className="block min-h-7 truncate pl-[18px] text-sm leading-7 text-zinc-700" title={node.label}>
                {node.label}
              </span>
            )}
            {(nodes.length > 1 || depth > 0 || indent > 0) && (
              <div className="ml-[18px] h-1 rounded-full bg-zinc-100">
                <div className="h-1 rounded-full" style={{ width: width(node.count, parentCount), background: SERIES_PART }} />
              </div>
            )}
          </div>
          <span className="text-right text-sm tabular-nums text-zinc-900">{fmt(node.count)}</span>
          <span className="text-right text-xs tabular-nums text-zinc-500">{nodes.length > 1 || depth > 0 || indent > 0 ? share(node.count, parentCount) : ""}</span>
        </div>
        {expanded && (
          <ul>
            <NodeRows nodes={node.children} parentCount={node.count} depth={depth + 1} indent={indent + 1} path={nodePath} open={open} />
          </ul>
        )}
      </li>
    );
  });
}

/** Counts split into nested groups; each row's share is of the row above it, a lone top row has none. */
export function BreakdownTree({ nodes, unit }: { nodes: BreakdownNode[]; unit: string }) {
  // A few groups open on their own; a longer list starts closed so the card stays scannable.
  const open = useOpenPaths(nodes.length <= 3 ? 1 : 0);
  if (nodes.length === 0) {
    return <p className="text-sm text-zinc-500">No data in this range.</p>;
  }
  const total = nodes.reduce((sum, node) => sum + node.count, 0);
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_4rem_3rem] gap-x-2 pb-1.5 text-xs uppercase tracking-wider text-zinc-500">
        <span />
        <span className="text-right">{unit}</span>
        <span className="text-right">Share</span>
      </div>
      <ul>
        <NodeRows nodes={nodes} parentCount={total} depth={0} indent={0} path="" open={open} />
      </ul>
    </div>
  );
}

/**
 * Funnel steps with their bars against the first step. Nested steps are subsets of the one above,
 * so the gap between them reads as a conversion; other steps only share a starting group.
 */
export function Funnel({
  steps,
  unit,
  nested,
  previous,
}: {
  steps: FunnelStep[];
  unit: string;
  nested: boolean;
  previous: FunnelStep[] | null;
}) {
  const open = useOpenPaths(1);
  const first = steps[0]?.count ?? 0;
  const previousFirst = previous?.[0]?.count ?? 0;
  return (
    <div>
      <p className="pb-2 text-xs uppercase tracking-wider text-zinc-500">{unit}</p>
      <ol>
      {steps.map((step, i) => {
        const path = `step-${i}`;
        const expandable = step.breakdown.length > 0;
        const expanded = expandable && open.isOpen(path, 0);
        const before = previous?.[i];
        return (
          <li key={step.label}>
            {nested && i > 0 && (
              <p className="flex items-center gap-1.5 py-0.5 pl-1 text-xs text-zinc-500">
                <ArrowDown size={12} aria-hidden />
                {share(step.count, steps[i - 1].count)} of the step above
              </p>
            )}
            <div className="py-1.5">
              <div className="flex items-baseline justify-between gap-3">
                {expandable ? (
                  <button
                    type="button"
                    onClick={() => open.toggle(path)}
                    aria-expanded={expanded}
                    className="flex min-h-8 min-w-0 items-center gap-1.5 text-left text-sm font-semibold text-zinc-900"
                  >
                    <ChevronRight size={16} aria-hidden className={`shrink-0 text-zinc-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
                    <span className="truncate">{step.label}</span>
                  </button>
                ) : (
                  <span className="flex min-h-8 min-w-0 items-center truncate pl-[22px] text-sm font-semibold text-zinc-900">{step.label}</span>
                )}
                <span className="shrink-0 tabular-nums">
                  <span className="font-heading text-xl font-bold text-zinc-900">{fmt(step.count)}</span>
                  {i > 0 && <span className="ml-1.5 text-xs text-zinc-500">{share(step.count, first)} of first step</span>}
                </span>
              </div>
              <div className="ml-[22px] mt-1 h-3 rounded-full bg-zinc-100">
                <div className="h-3 rounded-full" style={{ width: width(step.count, first), background: SERIES }} />
              </div>
              {i > 0 && before && previousFirst > 0 && (
                <p className="ml-[22px] mt-0.5 text-xs text-zinc-500">Previous period {share(before.count, previousFirst)} of first step</p>
              )}
            </div>
            {expanded && (
              <ul className="mb-2 ml-[22px]">
                <NodeRows nodes={step.breakdown} parentCount={step.count} depth={1} indent={0} path={path} open={open} />
              </ul>
            )}
          </li>
        );
      })}
      </ol>
    </div>
  );
}
