import type { ModelMessage } from "ai";
import { ASK_CHOICES } from "@/lib/ai/choice-request";
import { hasRepeatedToolFailure } from "@/lib/ai/repeated-tool-failure";

interface StepContent {
  content: ReadonlyArray<{ type: string; toolName?: string; input?: unknown }>;
}

/** True once any prior step rendered a recommendation card deck or spec table. */
export function hasPresentedLenses(steps: ReadonlyArray<StepContent>): boolean {
  return steps.some((step) =>
    step.content.some(
      (part) =>
        part.type === "tool-result" &&
        (part.toolName === "recommendLenses" || part.toolName === "listLenses"),
    ),
  );
}

/**
 * Per-step overrides for Ask Iris: enforces the loop budget, stops empty-handed choice pauses
 * once research starts, and pins the reply-language reminder after tool results.
 */
export function createPrepareStep<TName extends string>({
  activeTools,
  stepBudget,
  languageReminder,
}: {
  activeTools: readonly TName[];
  stepBudget: number;
  languageReminder: string;
}) {
  return ({
    stepNumber,
    steps,
    messages,
  }: {
    stepNumber: number;
    steps: ReadonlyArray<StepContent>;
    messages: ReadonlyArray<ModelMessage>;
  }) => {
    const overrides: {
      toolChoice?: "none";
      activeTools?: TName[];
      messages?: ModelMessage[];
    } = {};

    if (stepNumber >= stepBudget - 1 || hasRepeatedToolFailure(steps)) {
      overrides.toolChoice = "none";
    } else if (
      stepNumber >= 2 &&
      !hasPresentedLenses(steps) &&
      activeTools.includes(ASK_CHOICES as TName)
    ) {
      // Avoid burning multiple research steps only to pause empty-handed on a choice card.
      overrides.activeTools = activeTools.filter((name) => name !== (ASK_CHOICES as TName));
    }

    if (stepNumber > 0) {
      overrides.messages = [...messages, { role: "system", content: languageReminder }];
    }

    return Object.keys(overrides).length > 0 ? overrides : undefined;
  };
}
