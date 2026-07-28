import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
// CommonMark's emphasis flanking rules mis-classify **bold** hugged by CJK text and
// punctuation (e.g. **「…」** after a Chinese char), leaving the ** literal. This
// relaxes the rules for CJK so Iris's bold renders.
import remarkCjkFriendly from "remark-cjk-friendly";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import { mountToUrlSegment } from "@/lib/mount";
import { useLensLinks } from "@/components/askiris/LensLinkContext";

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
  const lensIndex = useLensLinks();
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkCjkFriendly, remarkGfm]}
        // The default transform strips unknown protocols (its job: javascript: etc.),
        // which would empty our lens: hrefs before the component override sees them.
        // Whitelist only lens: — it never reaches the DOM raw; the override below
        // either resolves it to a site path or renders plain text.
        urlTransform={(url) => (url.startsWith("lens:") ? url : defaultUrlTransform(url))}
        components={{
          // The `lens:<ref>` scheme: Iris references a lens inline as
          // [name](lens:<ref>), and it renders as a click-through to the lens page —
          // the reason hand-typed lens mentions were banned. Non-lens hrefs keep the
          // default anchor.
          a: ({ href, children: linkChildren }) => {
            if (!href?.startsWith("lens:")) {
              return <a href={href}>{linkChildren}</a>;
            }
            const entry = lensIndex?.[href.slice(5)];
            if (!entry) {
              return <>{linkChildren}</>;
            }
            const { id, mount } = entry;
            return (
              <Link
                href={`/lenses/${mountToUrlSegment(mount)}/${id}`}
                prefetch={false}
                onClick={() => track("askiris_rec_click", { lens_id: id, source: "askiris_prose" })}
                // New tab, same as the cards: the thread is ephemeral client state.
                target="_blank"
                rel="noopener noreferrer"
              >
                {linkChildren}
              </Link>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
