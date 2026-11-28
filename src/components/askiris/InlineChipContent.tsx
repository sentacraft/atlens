import type { ReactNode } from "react";

const LONG_TAIL_THRESHOLD = 12;

/**
 * Binds a trailing glyph to the final word (or final CJK characters) of an inline chip so long
 * labels wrap naturally across lines without ever stranding the icon alone on a new line.
 */
export function InlineChipContent({ children, icon }: { children?: ReactNode; icon: ReactNode }) {
  if (typeof children === "string" && children.length > 0) {
    const spaceMatch = children.match(/^(.*\s)(\S+)$/);
    if (spaceMatch) {
      const tailChars = Array.from(spaceMatch[2]);
      if (tailChars.length <= LONG_TAIL_THRESHOLD) {
        return (
          <>
            {spaceMatch[1]}
            <span className="whitespace-nowrap">
              {spaceMatch[2]}
              {icon}
            </span>
          </>
        );
      }
      const tailSplit = tailChars.length - 2;
      return (
        <>
          {spaceMatch[1]}
          {tailChars.slice(0, tailSplit).join("")}
          <span className="whitespace-nowrap">
            {tailChars.slice(tailSplit).join("")}
            {icon}
          </span>
        </>
      );
    }
    const chars = Array.from(children);
    const splitAt = Math.max(0, chars.length - 2);
    return (
      <>
        {chars.slice(0, splitAt).join("")}
        <span className="whitespace-nowrap">
          {chars.slice(splitAt).join("")}
          {icon}
        </span>
      </>
    );
  }
  return (
    <>
      {children}
      <span className="whitespace-nowrap">{icon}</span>
    </>
  );
}
