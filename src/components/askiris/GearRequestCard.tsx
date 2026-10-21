"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import { getBodyById } from "@/lib/body/data";
import type { LensSummary } from "@/lib/lens/data";
import { accountUser, authClient } from "@/lib/auth-client";
import type { GearRequestInput, GearRequestOutput } from "@/lib/ai/gear-request";
import { resolveGearHints } from "@/lib/me/gear-hints";
import { ACTION_OUTLINE_CLS, ACTION_PRIMARY_CLS, ACTION_QUIET_CLS, CHAT_CARD_CLS, CHIP_ACTIVE_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import { useGearAdders } from "@/components/me/useGearAdders";
import AnsweredLine from "@/components/askiris/AnsweredLine";
import SignInCard from "@/components/askiris/SignInCard";

/** The in-chat card Iris shows through the askForGear client tool. */
export default function GearRequestCard({
  input,
  output,
  active,
  lenses,
  signInReturnTo,
  onAnswer,
}: {
  input: GearRequestInput;
  output?: GearRequestOutput;
  /** False once the conversation has moved past this request. */
  active: boolean;
  lenses: LensSummary[];
  signInReturnTo: () => string;
  onAnswer: (output: GearRequestOutput) => void;
}) {
  const t = useTranslations("AskIris.gearCard");
  const tSignIn = useTranslations("AskIris.signInCard");
  const locale = useLocale();
  const { data: session } = authClient.useSession();
  const user = accountUser(session);

  if (output) {
    const text =
      output.outcome === "saved"
        ? output.saved?.length
          ? t("savedItems", { items: listNames(locale, output.saved) })
          : t("saved")
        : output.outcome === "skipped"
          ? t("skipped")
          : tSignIn("declined");
    return <AnsweredLine done={output.outcome === "saved"}>{text}</AnsweredLine>;
  }
  if (!active) {
    return <AnsweredLine done={false}>{t("unanswered")}</AnsweredLine>;
  }
  return user ? (
    <GearPicker userId={user.id} input={input} lenses={lenses} onAnswer={onAnswer} />
  ) : (
    <SignInCard reason="gear" returnTo={signInReturnTo} onNotNow={() => onAnswer({ outcome: "not_signed_in" })} />
  );
}

function listNames(locale: string, names: string[]): string {
  return new Intl.ListFormat(locale, { type: "conjunction", style: "narrow" }).format(names);
}

function GearPicker({
  userId,
  input,
  lenses,
  onAnswer,
}: {
  userId: string;
  input: GearRequestInput;
  lenses: LensSummary[];
  onAnswer: (output: GearRequestOutput) => void;
}) {
  const t = useTranslations("AskIris.gearCard");
  const tBrand = useTranslations("Brands");
  const locale = useLocale();
  const { gear, openBodyDialog, openLensSearch, addCatalog, adding, dialogs } = useGearAdders({ userId, lenses });
  const hints = useMemo(() => resolveGearHints(input, lenses), [input, lenses]);
  const [pending, setPending] = useState({ bodies: hints.bodies, lenses: hints.lenses });
  const lensById = useMemo(() => new Map(lenses.map((lens) => [lens.id, lens])), [lenses]);

  const brandName = (slug: string) => (tBrand.has(slug) ? tBrand(slug) : slug);
  const savedBodies = gear.filter((item) => item.kind === "body");
  const savedLenses = gear.filter((item) => item.kind === "lens");
  const savedIds = new Set(gear.flatMap((item) => (item.catalogId ? [item.catalogId] : [])));
  const pendingBodies = pending.bodies.filter((id) => !savedIds.has(id));
  const pendingLenses = pending.lenses.filter((id) => !savedIds.has(id));
  const canSave = gear.length > 0 || pendingBodies.length > 0 || pendingLenses.length > 0;

  function drop(kind: "bodies" | "lenses", id: string) {
    setPending((prev) => ({ ...prev, [kind]: prev[kind].filter((value) => value !== id) }));
  }

  function save() {
    const names = [
      ...savedBodies.map((item) => item.name),
      ...pendingBodies.flatMap((id) => getBodyById(id)?.name ?? []),
      ...savedLenses.map((item) => item.name),
      ...pendingLenses.flatMap((id) => lensById.get(id)?.model ?? []),
    ];
    addCatalog({ bodies: pendingBodies, lenses: pendingLenses }, { onSuccess: () => onAnswer({ outcome: "saved", saved: names }) });
  }

  return (
    <section aria-label={t("title")} className={CHAT_CARD_CLS}>
      <h3 className="px-4 pt-4 text-[15px] font-semibold text-zinc-900">{t("title")}</h3>
      <GearRow label={t("bodies")} addLabel={t("addBody")} onAdd={openBodyDialog}>
        {savedBodies.map((item) => (
          <SavedChip key={item.id} label={`${brandName(item.brand)} ${item.name}`} />
        ))}
        {pendingBodies.map((id) => {
          const body = getBodyById(id);
          return body ? (
            <PendingChip
              key={id}
              label={`${brandName("fujifilm")} ${body.name}`}
              removeLabel={t("removePending", { name: body.name })}
              onRemove={() => drop("bodies", id)}
            />
          ) : null;
        })}
      </GearRow>
      <GearRow label={t("lenses")} addLabel={t("addLens")} onAdd={openLensSearch}>
        {savedLenses.map((item) => (
          <SavedChip key={item.id} label={item.name} />
        ))}
        {pendingLenses.map((id) => {
          const lens = lensById.get(id);
          return lens ? (
            <PendingChip
              key={id}
              label={lens.model}
              removeLabel={t("removePending", { name: lens.model })}
              onRemove={() => drop("lenses", id)}
            />
          ) : null;
        })}
      </GearRow>
      {hints.unresolved.length > 0 && (
        <p className="px-4 pb-3 text-xs leading-5 text-zinc-500">
          {t("unresolved", { names: listNames(locale, hints.unresolved) })}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
        <span className="text-xs text-zinc-500">{t("footerHint")}</span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={() => onAnswer({ outcome: "skipped" })} className={ACTION_QUIET_CLS}>
            {t("skip")}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave || adding}
            className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium")}
          >
            {adding ? t("saving") : t("save")}
          </button>
        </div>
      </div>
      {dialogs}
    </section>
  );
}

function GearRow({
  label,
  addLabel,
  onAdd,
  children,
}: {
  label: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {children}
        <button type="button" onClick={onAdd} className={cn(ACTION_OUTLINE_CLS, "h-8 gap-1 px-3 text-[13px]")}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function SavedChip({ label }: { label: string }) {
  return <span className={cn(CHIP_BASE_CLS, CHIP_IDLE_CLS, "h-8 cursor-default px-3")}>{label}</span>;
}

function PendingChip({ label, removeLabel, onRemove }: { label: string; removeLabel: string; onRemove: () => void }) {
  return (
    <button type="button" onClick={onRemove} aria-label={removeLabel} className={cn(CHIP_BASE_CLS, CHIP_ACTIVE_CLS, "h-8 px-3")}>
      {label}
      <X className="h-3 w-3" />
    </button>
  );
}
