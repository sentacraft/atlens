import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

// Markdown renderer for Iris's replies. This project has no @tailwindcss/typography
// (`prose`), so the elements Iris actually emits are styled via child selectors on
// the wrapper. Raw HTML stays disabled (react-markdown's safe default).
const MARKDOWN_CLS = cn(
  "space-y-2 leading-relaxed",
  "[&_p]:m-0",
  "[&_strong]:font-semibold",
  "[&_em]:italic",
  "[&_a]:underline [&_a]:underline-offset-2",
  "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
  "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
  "[&_li]:marker:text-muted-foreground",
  "[&_code]:bg-background/60 [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
  "[&_h1]:text-base [&_h1]:font-semibold",
  "[&_h2]:text-sm [&_h2]:font-semibold",
  "[&_h3]:text-sm [&_h3]:font-semibold",
);

export default function Markdown({ children }: { children: string }) {
  return (
    <div className={MARKDOWN_CLS}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
