import type { ReactNode } from "react";
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
import { LENS_LINK_PREFIX, parseLensLink } from "@/lib/ai/lens-ref";

// Renders Iris's Markdown. react-markdown + remark-gfm only parse Markdown into
// semantic HTML; styling is @tailwindcss/typography's `prose` — the one-stop that
// covers every element (headings, lists, tables, hr, code…) instead of per-element
// classes. Callers can override `className` for a compact, non-prose context (cards).
// The system prompt already asks Iris not to use `---`; this suppresses the rule
// on the occasions it does anyway (headings + decks already separate sections).
const PROSE_CLS =
  "prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mb-1 prose-hr:hidden";

// An anchor that knows about the `lens:<ref>` scheme: Iris references a lens inline as
// [name](lens:<ref>) and it renders as a click-through to that lens's page — the reason
// a hand-typed lens name was worth banning. A ref no catalogue entry backs falls back to
// the plain text, so an invented one loses its link rather than becoming a dead one.
// Any other href is an ordinary link.
function LensAwareAnchor({ href, children }: { href?: string; children?: ReactNode }) {
  const lensIndex = useLensLinks();
  const ref = parseLensLink(href);
  if (ref === null) {
    return <a href={href}>{children}</a>;
  }
  const entry = lensIndex?.[ref];
  if (!entry) {
    return <>{children}</>;
  }
  return (
    <Link
      href={`/lenses/${mountToUrlSegment(entry.mount)}/${entry.id}`}
      prefetch={false}
      onClick={() => track("askiris_rec_click", { lens_id: entry.id, source: "askiris_prose" })}
      // New tab, same as the cards: the thread is ephemeral client state.
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </Link>
  );
}

export default function Markdown({
  children,
  className = PROSE_CLS,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkCjkFriendly, remarkGfm]}
        // The default transform strips unknown protocols (its job: javascript: etc.),
        // which would empty our lens: hrefs before the component override sees them.
        // Whitelist only lens: — it never reaches the DOM raw; the override below
        // either resolves it to a site path or renders plain text.
        urlTransform={(url) => (url.startsWith(LENS_LINK_PREFIX) ? url : defaultUrlTransform(url))}
        components={{ a: LensAwareAnchor }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
