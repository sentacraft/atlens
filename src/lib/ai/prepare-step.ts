import type { ModelMessage } from "ai";
import { ASK_CHOICES } from "@/lib/ai/choice-request";
import { hasRepeatedToolFailure } from "@/lib/ai/repeated-tool-failure";

interface StepContent {
  content: ReadonlyArray<{ type: string; toolName?: string; input?: unknown }>;
}

const CATALOG_RESEARCH_TOOLS = new Set([
  "queryLenses",
  "searchLensByName",
  "lensDetails",
  "lensReviews",
  "showLensImages",
]);

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

/** True once any prior step queried or inspected lenses in the catalog. */
export function hasCatalogResearch(steps: ReadonlyArray<StepContent>): boolean {
  return steps.some((step) =>
    step.content.some(
      (part) =>
        part.type === "tool-result" &&
        part.toolName !== undefined &&
        CATALOG_RESEARCH_TOOLS.has(part.toolName),
    ),
  );
}

function lastUserText(messages: ReadonlyArray<ModelMessage>): string {
  const userMessage = messages.findLast((message) => message.role === "user");
  if (!userMessage) {
    return "";
  }
  if (typeof userMessage.content === "string") {
    return userMessage.content;
  }
  return userMessage.content
    .filter((part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

function resolveLanguageReminder(messages: ReadonlyArray<ModelMessage>, fallbackReminder: string): string {
  if (/[\u4e00-\u9fff]/.test(lastUserText(messages))) {
    return "Reply in Simplified Chinese from the very first word, including before any tool call. Never output an English preamble.";
  }
  return fallbackReminder;
}

const BUDGET_REACHED_NOTICE =
  "You have reached the maximum tool-call step limit for this turn, so tools are now disabled " +
  "for this final step. Do not attempt or output any tool calls. Answer the user directly in " +
  "plain prose using the information you already gathered; if anything remains unchecked, say " +
  "so plainly and invite the user to follow up.";

const REPEATED_FAILURE_NOTICE =
  "The same tool call has failed twice in a row, so tools are now disabled for the rest of " +
  "this turn to prevent a loop. Do not attempt or output any tool calls. Answer the user " +
  "directly in plain prose using what you already have, and state plainly anything you could " +
  "not fetch.";

/**
 * Per-step overrides for Ask Iris: enforces the loop budget, explains why tools are turned off,
 * stops empty-handed choice pauses once catalog research starts, and pins the reply language.
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

    const repeatedFailure = hasRepeatedToolFailure(steps);
    const budgetReached = stepNumber >= stepBudget - 1;
    const stopNotice = repeatedFailure
      ? REPEATED_FAILURE_NOTICE
      : budgetReached
        ? BUDGET_REACHED_NOTICE
        : null;

    if (stopNotice) {
      overrides.toolChoice = "none";
    } else if (
      !hasPresentedLenses(steps) &&
      (stepNumber >= 2 || (stepNumber >= 1 && hasCatalogResearch(steps))) &&
      activeTools.includes(ASK_CHOICES as TName)
    ) {
      // Avoid burning research steps only to pause empty-handed on a choice card.
      overrides.activeTools = activeTools.filter((name) => name !== (ASK_CHOICES as TName));
    }

    const resolvedLanguage = resolveLanguageReminder(messages, languageReminder);
    const content = stopNotice ? `${stopNotice}\n\n${resolvedLanguage}` : resolvedLanguage;
    overrides.messages = [...messages, { role: "system", content }];

    return overrides;
  };
}
