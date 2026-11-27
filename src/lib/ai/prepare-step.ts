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

/**
 * Per-step overrides for Ask Iris: enforces the loop budget, stops empty-handed choice pauses
 * once catalog research starts, and pins the reply-language reminder on every step.
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
      !hasPresentedLenses(steps) &&
      (stepNumber >= 2 || (stepNumber >= 1 && hasCatalogResearch(steps))) &&
      activeTools.includes(ASK_CHOICES as TName)
    ) {
      // Avoid burning research steps only to pause empty-handed on a choice card.
      overrides.activeTools = activeTools.filter((name) => name !== (ASK_CHOICES as TName));
    }

    overrides.messages = [
      ...messages,
      { role: "system", content: resolveLanguageReminder(messages, languageReminder) },
    ];

    return overrides;
  };
}
