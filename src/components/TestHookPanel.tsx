"use client";

import { useContext, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TestHookContext } from "@/context/TestHookProvider";
import { TESTHOOK_OPTION_DEFINITIONS } from "@/lib/testhook";
import {
  REDACTION_KEYS,
  REDACTION_QUERY_KEY,
  REDACTION_BLUR_QUERY_KEY,
  DEFAULT_REDACTION_BLUR_PX,
} from "@/lib/redaction";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const collectionsData = require("@/data/collections.json") as {
  collections: { slug: string; title: { en: string } }[];
};

const HIDDEN_ROUTES: { label: string; href: string }[] = [
  { label: "All Collections", href: "/lenses/x/collections" },
  ...collectionsData.collections.map((c) => ({
    label: c.title.en,
    href: `/lenses/x/collections/${c.slug}`,
  })),
  { label: "Design Lab — Iris", href: "/design-lab/iris" },
  { label: "Design Lab — Iris Pheno", href: "/design-lab/iris-pheno" },
  { label: "Design Lab — Outro (end card)", href: "/design-lab/outro" },
];

export default function TestHookPanel() {
  const context = useContext(TestHookContext);
  const [copied, setCopied] = useState(false);
  const [linksOpen, setLinksOpen] = useState(true);
  const [tweaksOpen, setTweaksOpen] = useState(false);

  if (!context || !context.state.testHook) {
    return null;
  }

  const { state, setOption, setTestHook, reset, buildShareableLink } = context;

  return (
    <aside className="fixed bottom-4 right-4 z-50 max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Test hooks
          </p>
          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Toggle option variants to compare visual directions.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setTestHook(false)}>
          Hide
        </Button>
      </div>

      <div className="mt-4">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setLinksOpen(!linksOpen)}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            Hidden routes ({HIDDEN_ROUTES.length})
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {linksOpen ? "▲" : "▼"}
          </span>
        </button>
        {linksOpen && (
          <ul className="mt-2 space-y-1">
            {HIDDEN_ROUTES.map((route) => (
              <li key={route.href}>
                <Link
                  href={route.href}
                  className="block rounded-md px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          className="flex w-full items-center justify-between"
          onClick={() => setTweaksOpen(!tweaksOpen)}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            UI tweaks ({TESTHOOK_OPTION_DEFINITIONS.length})
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {tweaksOpen ? "▲" : "▼"}
          </span>
        </button>
        {tweaksOpen && (
          <div className="mt-3 space-y-4">
            {TESTHOOK_OPTION_DEFINITIONS.map((option) => (
              <label key={option.key} className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  {option.label}
                </span>
                <Select
                  value={state.options[option.key] ?? option.defaultValue ?? ""}
                  onValueChange={(value) => setOption(option.key, value ?? "")}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {option.values.map((value) => (
                      <SelectItem key={value.id} value={value.id}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  {option.description}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Demo-mode redaction reference. Activated by URL query (read by the
          Redaction component), so the recording session can blur sensitive
          surfaces without touching code. Values come from the redaction
          constants to stay in sync. */}
      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Redaction (demo blur)
        </span>
        <div className="mt-2 space-y-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-zinc-700 dark:[&_code]:bg-zinc-800 dark:[&_code]:text-zinc-300">
          <p>
            <code>?{REDACTION_QUERY_KEY}={REDACTION_KEYS.join(",")}</code> — blur surfaces
          </p>
          <p>
            <code>&{REDACTION_BLUR_QUERY_KEY}={DEFAULT_REDACTION_BLUR_PX}</code> — blur px (default {DEFAULT_REDACTION_BLUR_PX})
          </p>
          <p>
            <code>?{REDACTION_QUERY_KEY}=</code> — clear all
          </p>
          <p>
            <code>price</code> = price figures · <code>priceSource</code> = buy channels + price source · <code>posterQr</code> = poster QR
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(buildShareableLink());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? "Copied!" : "Copy link"}
        </Button>
        <Button size="sm" variant="outline" onClick={reset}>
          Reset
        </Button>
      </div>
    </aside>
  );
}
