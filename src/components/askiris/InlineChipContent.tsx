import type { ReactNode } from "react";

/**
 * Binds a trailing glyph to the final word (or final CJK characters) of an inline chip so long
 * labels wrap naturally across lines without ever stranding the icon alone on a new line.
 */
export function InlineChipContent({ children, icon }: { children?: ReactNode; icon: ReactNode }) {
  if (typeof children === "string" && children.length > 0) {
    const spaceMatch = children.match(/^(.*\s)(\S+)$/);
    if (spaceMatch) {
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
    const splitAt = Math.max(0, children.length - 2);
    return (
      <>
        {children.slice(0, splitAt)}
        <span className="whitespace-nowrap">
          {children.slice(splitAt)}
          {icon}
        </span>
      </>
    );
  }
  return (
    <span className="whitespace-nowrap">
      {children}
      {icon}
    </span>
  );
}
