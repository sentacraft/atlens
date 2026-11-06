"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { readStatsEnabled, saveStatsPreference } from "@/lib/analytics/stats-preference-client";

const subscribe = () => () => {};

export function StatsPreference() {
  const t = useTranslations("About");
  const stored = useSyncExternalStore(subscribe, readStatsEnabled, () => true);
  const [override, setOverride] = useState<boolean | null>(null);
  const enabled = override ?? stored;

  function onChange(next: boolean) {
    setOverride(next);
    saveStatsPreference({ enabled: next }).catch(() => setOverride(!next));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span id="stats-preference-label" className="text-sm font-semibold text-zinc-900">
            {t("statsPreferenceTitle")}
          </span>
          <p className="text-[13px] leading-5 text-zinc-600">{t("statsPreferenceBody")}</p>
          {!enabled && <p className="text-[13px] leading-5 text-zinc-900">{t("statsPreferenceOff")}</p>}
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={onChange}
          aria-labelledby="stats-preference-label"
          className="mt-0.5"
        />
      </div>
      <p className="px-1 text-xs leading-4 text-zinc-500">{t("statsPreferenceCloudflare")}</p>
    </div>
  );
}
