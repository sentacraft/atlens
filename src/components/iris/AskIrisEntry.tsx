"use client";

import { useTranslations } from "next-intl";
import Iris from "@/components/iris/Iris";
import AiTag from "@/components/iris/AiTag";
import { IRIS_NAV } from "@/config/iris-config";
import { ACTION_OUTLINE_CLS } from "@/config/ui-tokens";
import { LENS_ACTION_FIT as fit } from "@/config/lens-action-fit";
import { useIris } from "@/context/IrisPanelProvider";
import { cn } from "@/lib/utils";
import type { IrisEntryPoint, IrisRequest } from "@/lib/url/askiris";

/**
 * Opens Iris about the page it sits on, handing it `request`. `id` names the entry, in analytics
 * too, and must be unique on a page. `labelFit` is how the label gives way to a narrow row:
 * "full" never; "phone" says just "Ask Iris" below sm; "container" follows the nearest
 * `@container`, the lens page's action row, at the widths `LENS_ACTION_FIT` sets.
 */
export default function AskIrisEntry({
  id,
  label,
  labelFit,
  request,
  className,
}: {
  id: Extract<IrisEntryPoint, "lens" | "alternatives" | "browse" | "empty" | "compare">;
  label: string;
  labelFit: "full" | "phone" | "container";
  request: IrisRequest;
  className?: string;
}) {
  const tNav = useTranslations("Nav");
  const { openIris } = useIris();
  return (
    <button
      type="button"
      onClick={() => openIris({ from: id, request })}
      aria-label={labelFit === "container" ? label : undefined}
      className={cn(
        ACTION_OUTLINE_CLS,
        "shrink-0 gap-2 whitespace-nowrap",
        labelFit === "container" && fit.irisPadding,
        className,
      )}
    >
      <Iris config={IRIS_NAV} uid={`entry-${id}`} size={16} />
      {labelFit === "phone" ? (
        <>
          <span className="max-sm:hidden">{label}</span>
          <span className="sm:hidden">{tNav("askIris")}</span>
        </>
      ) : labelFit === "container" ? (
        <>
          <span className={fit.irisFull}>{label}</span>
          <span className={fit.irisShort}>{tNav("askIris")}</span>
        </>
      ) : (
        label
      )}
      <AiTag />
    </button>
  );
}
