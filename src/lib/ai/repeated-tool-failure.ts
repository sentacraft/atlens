import type { ToolSet } from "ai";

interface StepContent {
  content: ReadonlyArray<{ type: string; toolName?: string; input?: unknown }>;
}

const MAX_IDENTICAL_FAILURES = 2;

const REPEATED_FAILURE_NOTICE =
  "This exact call has now failed twice, so tools are off for the rest of this turn. Answer with " +
  "what you already have, and tell the user plainly what you couldn't show.";

function failureKey(toolName: string | undefined, input: unknown): string {
  return `${toolName}:${JSON.stringify(input)}`;
}

/** True once any tool has failed MAX_IDENTICAL_FAILURES times with the same input. */
export function hasRepeatedToolFailure(steps: ReadonlyArray<StepContent>): boolean {
  const failures = new Map<string, number>();
  for (const step of steps) {
    for (const part of step.content) {
      if (part.type !== "tool-error") {
        continue;
      }
      const key = failureKey(part.toolName, part.input);
      const count = (failures.get(key) ?? 0) + 1;
      if (count >= MAX_IDENTICAL_FAILURES) {
        return true;
      }
      failures.set(key, count);
    }
  }
  return false;
}

/**
 * Appends REPEATED_FAILURE_NOTICE to the error a tool throws on its second identical failure,
 * the failure after which hasRepeatedToolFailure turns tools off.
 */
export function withRepeatedFailureNotice<TOOLS extends ToolSet>(tools: TOOLS): TOOLS {
  const failures = new Map<string, number>();
  const wrapped = Object.entries(tools).map(([name, definition]) => {
    const execute = definition.execute;
    if (!execute) {
      return [name, definition];
    }
    return [
      name,
      {
        ...definition,
        execute: async (input: unknown, options: Parameters<typeof execute>[1]) => {
          try {
            return await execute(input, options);
          } catch (error) {
            const key = failureKey(name, input);
            const count = (failures.get(key) ?? 0) + 1;
            failures.set(key, count);
            if (count < MAX_IDENTICAL_FAILURES) {
              throw error;
            }
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`${message} ${REPEATED_FAILURE_NOTICE}`);
          }
        },
      },
    ];
  });
  return Object.fromEntries(wrapped) as TOOLS;
}
