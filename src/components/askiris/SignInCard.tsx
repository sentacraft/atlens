"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { accountUser, authClient } from "@/lib/auth-client";
import { SIGN_IN_CARD_SOURCE, type SignInCardReason } from "@/lib/sign-in-pitch";
import SignInBenefits from "@/components/auth/SignInBenefits";
import FreeNote from "@/components/auth/FreeNote";
import { ACTION_PRIMARY_CLS, ACTION_QUIET_CLS, CHAT_CARD_CLS, IRIS_PROSE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import type { SignInOutput } from "@/lib/ai/sign-in-request";
import AnsweredLine from "@/components/askiris/AnsweredLine";

/** The in-chat card Iris shows a guest when what they asked for needs an account, led by a line saying why. */
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
    <>
      <div className={IRIS_PROSE_CLS}>
        <p>{t(`leadIn.${reason}`)}</p>
      </div>
      <section aria-label={t(`title.${reason}`)} className={cn(CHAT_CARD_CLS, "flex flex-col gap-3.5 p-4")}>
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[15px] font-semibold text-zinc-900">{t(`title.${reason}`)}</h3>
          <FreeNote />
        </div>
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
    </>
  );
}

/** The shared sign-in interaction for account tools and server approvals. */
export function SignInInteraction({ reason, outcome, active, returnTo, onAnswer }: {
  reason: SignInCardReason;
  outcome: SignInOutput["outcome"] | null;
  active: boolean;
  returnTo: () => string;
  onAnswer: (output: SignInOutput) => void;
}) {
  const t = useTranslations("AskIris.signInCard");
  const { data: session } = authClient.useSession();
  const signedIn = Boolean(accountUser(session));
  const waiting = outcome === null && active;
  const sent = useRef(false);
  function answer(output: SignInOutput) {
    if (sent.current) {return;}
    sent.current = true;
    onAnswer(output);
  }
  useEffect(() => {
    if (waiting && signedIn && !sent.current) {
      sent.current = true;
      onAnswer({ outcome: "signed_in" });
    }
  }, [waiting, signedIn, onAnswer]);

  if (outcome === "signed_in") {
    return <AnsweredLine done>{t("signedIn")}</AnsweredLine>;
  }
  if (!waiting) {
    return <AnsweredLine done={false}>{t("declined")}</AnsweredLine>;
  }
  if (signedIn) {return null;}
  return <SignInCard reason={reason} returnTo={returnTo} onNotNow={() => answer({ outcome: "cancelled" })} />;
}
