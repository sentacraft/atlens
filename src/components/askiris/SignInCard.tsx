"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { accountUser, authClient } from "@/lib/auth-client";
import { SIGN_IN_CARD_SOURCE, type SignInCardReason } from "@/lib/sign-in-pitch";
import SignInBenefits from "@/components/auth/SignInBenefits";
import { ACTION_PRIMARY_CLS, ACTION_QUIET_CLS, CHAT_CARD_CLS, IRIS_PROSE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import AnsweredLine from "@/components/askiris/AnsweredLine";

/** The in-chat card Iris shows a guest when what they asked for needs an account. */
export default function SignInCard({
  reason,
  returnTo,
  onNotNow,
}: {
  reason: SignInCardReason;
  /** Where a sign-in that leaves the page brings the user back. */
  returnTo: () => string;
  onNotNow: () => void;
}) {
  const t = useTranslations("AskIris.signInCard");
  const openSignIn = useSignInDialog();
  return (
    <section aria-label={t(`title.${reason}`)} className={cn(CHAT_CARD_CLS, "flex flex-col gap-3.5 p-4")}>
      <h3 className="text-[15px] font-semibold text-zinc-900">{t(`title.${reason}`)}</h3>
      <SignInBenefits source={SIGN_IN_CARD_SOURCE[reason]} className="text-[13px] leading-5" />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => openSignIn(SIGN_IN_CARD_SOURCE[reason], { returnTo: returnTo() })}
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
 * A gated tool call the turn paused on: a line saying why, then the sign-in card, while the user
 * is a guest; the go-ahead once they sign in, whether in place or after the sign-in redirect
 * reloads the page.
 */
export function SignInGate({
  reason,
  answered,
  active,
  returnTo,
  onAnswer,
}: {
  reason: SignInCardReason;
  /** The user's answer, once given. */
  answered?: boolean;
  /** False once the conversation has moved past this call. */
  active: boolean;
  returnTo: () => string;
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
    return <AnsweredLine done>{t("signedIn")}</AnsweredLine>;
  }
  if (!waiting) {
    return <AnsweredLine done={false}>{t("declined")}</AnsweredLine>;
  }
  if (signedIn) {
    return null;
  }
  return (
    <>
      <div className={IRIS_PROSE_CLS}>
        <p>{t(`leadIn.${reason}`)}</p>
      </div>
      <SignInCard reason={reason} returnTo={returnTo} onNotNow={() => onAnswer(false)} />
    </>
  );
}
