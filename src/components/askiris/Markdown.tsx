import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders Iris's Markdown. react-markdown + remark-gfm only parse Markdown into
// semantic HTML; styling is @tailwindcss/typography's `prose` — the one-stop that
// covers every element (headings, lists, tables, hr, code…) instead of per-element
// classes. Callers can override `className` for a compact, non-prose context (cards).
// The system prompt already asks Iris not to use `---`; this suppresses the rule
// on the occasions it does anyway (headings + decks already separate sections).
const PROSE_CLS =
  "prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mb-1 prose-hr:hidden";

export default function Markdown({
  children,
  className = PROSE_CLS,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
