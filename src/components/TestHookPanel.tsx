"use client";

import { useContext, useState } from "react";
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

export default function TestHookPanel() {
  const context = useContext(TestHookContext);

  if (!context || !context.state.testHook) {
    return null;
  }

  const { state, setOption, setTestHook, reset, buildShareableLink } = context;
  const [copied, setCopied] = useState(false);

  return (
    <aside className="fixed bottom-4 right-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
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

      <div className="mt-4 space-y-4">
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
