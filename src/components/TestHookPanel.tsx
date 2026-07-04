"use client";

import { useContext, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
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

const HIDDEN_ROUTES: { label: string; href: string }[] = [
  { label: "Design Lab — Iris", href: "/design-lab/iris" },
  { label: "Design Lab — Iris Pheno", href: "/design-lab/iris-pheno" },
  { label: "Design Lab — Outro (end card)", href: "/design-lab/outro" },
];

const TABS = [
  { id: "routes", label: "Routes" },
  { id: "ui", label: "UI tweaks" },
  { id: "askiris", label: "AskIris" },
  { id: "redaction", label: "Redaction" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function TestHookPanel() {
  const context = useContext(TestHookContext);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<TabId>("routes");

  if (!context || !context.state.testHook) {
    return null;
  }

  const { state, setOption, setTestHook, reset, buildShareableLink } = context;

  const uiTweaks = TESTHOOK_OPTION_DEFINITIONS.filter((o) => o.section !== "askiris");
  const askIrisOptions = TESTHOOK_OPTION_DEFINITIONS.filter((o) => o.section === "askiris");

  const renderOption = (option: (typeof TESTHOOK_OPTION_DEFINITIONS)[number]) => (
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
  );

  return (
    <aside className="fixed bottom-4 right-4 z-50 max-h-[calc(100dvh-2rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Test hooks</p>
        <Button size="sm" variant="ghost" onClick={() => setTestHook(false)}>
          Hide
        </Button>
      </div>

      <div className="mt-3 flex gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "routes" && (
          <ul className="space-y-1">
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

        {tab === "ui" && <div className="space-y-4">{uiTweaks.map(renderOption)}</div>}

        {tab === "askiris" && <div className="space-y-4">{askIrisOptions.map(renderOption)}</div>}

        {/* Demo-mode redaction reference. Activated by URL query (read by the
            Redaction component), so the recording session can blur sensitive
            surfaces without touching code. Values come from the redaction
            constants to stay in sync. */}
        {tab === "redaction" && (
          <div className="space-y-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400 [&_code]:rounded [&_code]:bg-zinc-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-zinc-700 dark:[&_code]:bg-zinc-800 dark:[&_code]:text-zinc-300">
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
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
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
