import type { ReactNode } from "react";
import { Check } from "lucide-react";

/** The one line an in-chat card leaves behind once the user has answered it. */
export default function AnsweredLine({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 px-1 text-xs leading-5 text-zinc-500">
      {done && <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-700" strokeWidth={2.5} />}
      {children}
    </p>
  );
}
