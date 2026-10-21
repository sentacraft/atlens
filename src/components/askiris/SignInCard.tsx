"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { accountUser, authClient } from "@/lib/auth-client";
import { SIGN_IN_BENEFITS, type SignInReason } from "@/lib/sign-in-reason";
import { ACTION_PRIMARY_CLS, ACTION_QUIET_CLS, CHAT_CARD_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import AnsweredLine from "@/components/askiris/AnsweredLine";

/** The in-chat card Iris shows a guest when what they asked for needs an account. */
export default function SignInCard({ reason, onNotNow }: { reason: SignInReason; onNotNow: () => void }) {
  const t = useTranslations("AskIris.signInCard");
  const tAuth = useTranslations("Auth");
  const openSignIn = useSignInDialog();
  return (
    <section aria-label={t(`title.${reason}`)} className={cn(CHAT_CARD_CLS, "flex flex-col gap-3.5 p-4")}>
      <h3 className="text-[15px] font-semibold text-zinc-900">{t(`title.${reason}`)}</h3>
      <ul className="flex flex-col gap-2">
        {SIGN_IN_BENEFITS[reason].map((key) => (
          <li key={key} className="flex gap-2 text-[13px] leading-5 text-zinc-700">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-900" strokeWidth={2.5} />
            {tAuth(key)}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => openSignIn(reason)}
          className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}
        >
          {t("signIn")}
        </button>
        <button type="button" onClick={onNotNow} className={ACTION_QUIET_CLS}>
          {t(`notNow.${reason}`)}
        </button>
      </div>
    </section>
  );
}

/**
 * A gated tool call the turn paused on: the sign-in card while the user is a guest, and the
 * go-ahead once they sign in, whether in place or after the sign-in redirect reloads the page.
 */
export function SignInGate({
  reason,
  answered,
  active,
  onAnswer,
}: {
  reason: SignInReason;
  /** The user's answer, once given. */
  answered?: boolean;
  /** False once the conversation has moved past this call. */
  active: boolean;
  onAnswer: (approved: boolean) => void;
}) {
  const t = useTranslations("AskIris.signInCard");
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(accountUser(session));
  const waiting = answered === undefined && active;
  const sent = useRef(false);
  useEffect(() => {
    if (waiting && signedIn && !sent.current) {
      sent.current = true;
      onAnswer(true);
    }
  }, [waiting, signedIn, onAnswer]);

  if (answered) {
    return null;
  }
  if (!waiting) {
    return <AnsweredLine done={false}>{t("declined")}</AnsweredLine>;
  }
  return signedIn ? null : <SignInCard reason={reason} onNotNow={() => onAnswer(false)} />;
}
