import type { ReactNode } from "react";
import { AI_TAG_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";

export default function AiTag({ className }: { className?: string }) {
  return <span className={cn(AI_TAG_CLS, className)}>AI</span>;
}

/** The `<iris>` tag in UI copy: Iris's name with an AI tag, where a reader may not yet know who Iris is. */
export function tagIris(name: ReactNode): ReactNode {
  return (
    <>
      {name} <AiTag className="align-[1px]" />
    </>
  );
}
