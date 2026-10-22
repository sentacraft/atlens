import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { SIGN_IN_BENEFIT_VALUES, SIGN_IN_PITCHES, type SignInSource } from "@/lib/sign-in-pitch";
import { cn } from "@/lib/utils";

/** What an account adds, as ticked lines in the order the source pitches them. */
export default function SignInBenefits({ source, className }: { source: SignInSource; className?: string }) {
  const t = useTranslations("Auth");
  return (
    <ul className={cn("flex flex-col gap-2 text-zinc-700", className)}>
      {SIGN_IN_PITCHES[source].benefits.map((key) => (
        <li key={key} className="flex gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" strokeWidth={2.5} />
          {t(key, SIGN_IN_BENEFIT_VALUES)}
        </li>
      ))}
    </ul>
  );
}
