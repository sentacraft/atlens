interface StepContent {
  content: ReadonlyArray<{ type: string; toolName?: string; input?: unknown }>;
}

const MAX_IDENTICAL_FAILURES = 2;

export function hasRepeatedToolFailure(steps: ReadonlyArray<StepContent>): boolean {
  const failures = new Map<string, number>();
  for (const step of steps) {
    for (const part of step.content) {
      if (part.type !== "tool-error") {
        continue;
      }
      const key = `${part.toolName}:${JSON.stringify(part.input)}`;
      const count = (failures.get(key) ?? 0) + 1;
      if (count >= MAX_IDENTICAL_FAILURES) {
        return true;
      }
      failures.set(key, count);
    }
  }
  return false;
}
