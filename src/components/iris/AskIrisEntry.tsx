"use client";

import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import AiTag from "@/components/iris/AiTag";
import { IRIS_NAV } from "@/config/iris-config";
import { ACTION_OUTLINE_CLS } from "@/config/ui-tokens";
import { useOpenIris } from "@/context/IrisPanelProvider";
import { cn } from "@/lib/utils";
import type { IrisEntryPoint, IrisRequest } from "@/lib/url/askiris";

/**
 * Opens Iris about the page it sits on, handing it `request`. `id` names the entry, in analytics
 * too, and must be unique on a page; `phoneLabel: "short"` says just "Ask Iris" below sm, where a row has no room.
 */
export default function AskIrisEntry({
  id,
  label,
  phoneLabel,
  request,
  className,
}: {
  id: Extract<IrisEntryPoint, "lens" | "browse" | "empty" | "compare">;
  label: string;
  phoneLabel: "full" | "short";
  request: IrisRequest;
  className?: string;
}) {
  const tNav = useTranslations("Nav");
  const openIris = useOpenIris();
  return (
    <button type="button" onClick={() => openIris({ from: id, request })} className={cn(ACTION_OUTLINE_CLS, "shrink-0 gap-2 whitespace-nowrap", className)}>
      <Iris config={IRIS_NAV} uid={`entry-${id}`} size={16} />
      {phoneLabel === "short" ? (
        <>
          <span className="max-sm:hidden">{label}</span>
          <span className="sm:hidden">{tNav("askIris")}</span>
        </>
      ) : (
        label
      )}
      <AiTag />
    </button>
  );
}
