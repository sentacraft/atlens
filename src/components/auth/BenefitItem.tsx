import type { ReactNode } from "react";
import { Check } from "lucide-react";

/** One reason to sign in, ticked: in the sign-in dialog and the prompts that lead to it. */
export default function BenefitItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 text-sm text-zinc-700">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" strokeWidth={2.5} />
      {children}
    </li>
  );
}
