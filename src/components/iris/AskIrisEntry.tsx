"use client";

import Iris from "@/components/iris/Iris";
import AiTag from "@/components/iris/AiTag";
import { IRIS_NAV } from "@/config/iris-config";
import { ACTION_OUTLINE_CLS } from "@/config/ui-tokens";
import { useIris } from "@/context/IrisPanelProvider";
import { cn } from "@/lib/utils";
import type { IrisEntryPoint } from "@/lib/url/askiris";

/**
 * Asks Iris one question about what the page shows, sent as soon as Iris opens; `label` says what
 * it asks, so it never reads as the nav's general "Ask Iris". `id` names the entry, in analytics
 * too, and must be unique on a page.
 */
export default function AskIrisEntry({
  id,
  label,
  question,
  className,
}: {
  id: Extract<IrisEntryPoint, "alternatives" | "browse" | "empty" | "compare">;
  label: string;
  question: string;
  className?: string;
}) {
  const { openIris } = useIris();
  return (
    <button
      type="button"
      onClick={() => openIris({ from: id, request: { kind: "question", text: question } })}
      className={cn(ACTION_OUTLINE_CLS, "shrink-0 gap-2 whitespace-nowrap", className)}
    >
      <Iris config={IRIS_NAV} uid={`entry-${id}`} size={16} />
      {label}
      <AiTag />
    </button>
  );
}
