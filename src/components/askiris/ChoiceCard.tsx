"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";
import type { ChoiceRequestInput, ChoiceRequestOutput } from "@/lib/ai/choice-request";
import { ACTION_PRIMARY_CLS, ACTION_QUIET_CLS, CHAT_CARD_CLS, CHIP_ACTIVE_CLS, CHIP_BASE_CLS, CHIP_IDLE_CLS } from "@/config/ui-tokens";
import { cn } from "@/lib/utils";
import AnsweredLine from "@/components/askiris/AnsweredLine";

// The free-text row is exactly one chip tall, so opening it moves nothing below.
const CHIP_SIZE_CLS = "min-h-8 px-3.5 text-[13px] max-sm:min-h-10";
const CHIP_ROW_HEIGHT_CLS = "h-8 max-sm:h-10";

/** The in-chat card Iris shows through the askChoices client tool. */
export default function ChoiceCard({
  input,
  output,
  active,
  onAnswer,
}: {
  input: ChoiceRequestInput;
  output?: ChoiceRequestOutput;
  /** False once the conversation has moved past this request. */
  active: boolean;
  onAnswer: (output: ChoiceRequestOutput) => void;
}) {
  const t = useTranslations("AskIris.choiceCard");
  if (output) {
    if (output.outcome === "skipped" || !output.answers) {
      return <AnsweredLine done={false}>{t("skipped")}</AnsweredLine>;
    }
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-3 py-2 text-sm">
          {output.answers.map((answer) => (
            <div key={answer.question}>
              {answer.question}: {answer.picked.length > 0 ? answer.picked.join(", ") : t("notSaid")}
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!active) {
    return <AnsweredLine done={false}>{t("unanswered")}</AnsweredLine>;
  }
  return <ChoicePicker input={input} onAnswer={onAnswer} />;
}

function ChoicePicker({ input, onAnswer }: { input: ChoiceRequestInput; onAnswer: (output: ChoiceRequestOutput) => void }) {
  const t = useTranslations("AskIris.choiceCard");
  const [picked, setPicked] = useState<string[][]>(() => input.questions.map(() => []));
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  // One single-choice question needs no confirm step: the tap is the answer.
  const tapAnswers = input.questions.length === 1 && !input.questions[0].multiple;

  function submit(next: string[][]) {
    onAnswer({
      outcome: "answered",
      answers: input.questions.map((question, index) => ({ question: question.question, picked: next[index] })),
    });
  }

  function choose(group: number, value: string) {
    const current = picked[group];
    const next = picked.map((list, index) => {
      if (index !== group) {
        return list;
      }
      if (list.includes(value)) {
        return list.filter((item) => item !== value);
      }
      return input.questions[group].multiple ? [...list, value] : [value];
    });
    if (tapAnswers && !current.includes(value)) {
      submit(next);
      return;
    }
    setPicked(next);
  }

  function addCustom(group: number) {
    const value = draft.trim().slice(0, 40);
    setEditing(null);
    setDraft("");
    if (value && !picked[group].includes(value)) {
      choose(group, value);
    }
  }

  return (
    <section aria-label={t("title")} className={CHAT_CARD_CLS}>
      <div className="flex flex-col gap-4 p-4">
        {input.questions.map((question, group) => {
          const options = [...question.options, ...picked[group].filter((value) => !question.options.includes(value))];
          return (
            <div key={question.question} role="group" aria-label={question.question} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-semibold text-zinc-900">{question.question}</span>
                <span className="text-xs text-zinc-500">{question.multiple ? t("pickAny") : t("pickOne")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const selected = picked[group].includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => choose(group, option)}
                      className={cn(CHIP_BASE_CLS, CHIP_SIZE_CLS, selected ? CHIP_ACTIVE_CLS : CHIP_IDLE_CLS)}
                    >
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                      {option}
                    </button>
                  );
                })}
              </div>
              <div>
                {editing === group ? (
                  <form
                    className={cn(CHIP_ROW_HEIGHT_CLS, "flex w-full items-center gap-2 rounded-full border border-zinc-900 bg-white pr-1 pl-3.5 sm:max-w-[320px]")}
                    onSubmit={(event) => {
                      event.preventDefault();
                      addCustom(group);
                    }}
                  >
                    <input
                      autoFocus
                      value={draft}
                      maxLength={40}
                      onChange={(event) => setDraft(event.target.value)}
                      aria-label={t("somethingElse")}
                      className="min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className={cn(ACTION_PRIMARY_CLS, "h-6 rounded-full px-3 text-xs font-medium max-sm:h-8")}
                    >
                      {t("add")}
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(group);
                      setDraft("");
                    }}
                    className={cn(CHIP_BASE_CLS, CHIP_SIZE_CLS, "border-dashed border-zinc-300 bg-white text-zinc-600 hover:border-zinc-900")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t("somethingElse")}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {!tapAnswers && (
        <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3">
          <button
            type="button"
            disabled={picked.every((list) => list.length === 0)}
            onClick={() => submit(picked)}
            className={cn(ACTION_PRIMARY_CLS, "h-9 rounded-lg px-4 text-sm font-medium max-sm:h-11")}
          >
            {t("done")}
          </button>
          <button type="button" onClick={() => onAnswer({ outcome: "skipped" })} className={cn(ACTION_QUIET_CLS, "max-sm:h-11")}>
            {t("skip")}
          </button>
        </div>
      )}
      {tapAnswers && (
        <div className="flex border-t border-zinc-100 px-4 py-2">
          <button type="button" onClick={() => onAnswer({ outcome: "skipped" })} className={cn(ACTION_QUIET_CLS, "max-sm:h-11")}>
            {t("skip")}
          </button>
        </div>
      )}
    </section>
  );
}
