import { getToolName, isToolUIPart, type UIMessage } from "ai";

export function withHistoricalTablePresentation(message: UIMessage): UIMessage {
  if (message.role !== "assistant") {return message;}
  return {
    ...message,
    parts: message.parts.map((part) => {
      if (!isToolUIPart(part) || part.state !== "output-available" || getToolName(part) !== "listLenses") {return part;}
      const output = part.output;
      if (!output || typeof output !== "object" || Array.isArray(output)) {return part;}
      return { ...part, output: { ...output, historical: true } };
    }),
  };
}
