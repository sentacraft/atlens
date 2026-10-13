"use client";

import type { ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
// CommonMark's flanking rules leave ** literal around CJK punctuation (**「…」**); this relaxes them.
import remarkCjkFriendly from "remark-cjk-friendly";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import { mountToUrlSegment } from "@/lib/mount";
import { useLensLinks } from "@/components/askiris/LensLinkContext";
import { LENS_LINK_PREFIX, escapeLensLinkLabels, parseLensLink } from "@/lib/ai/lens-ref";

const PROSE_CLS =
  "prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mb-1 prose-hr:hidden";

// An unknown ref renders as plain text, never as a dead link.
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
        // The default transform strips unknown protocols, which would empty lens: hrefs.
        urlTransform={(url) => (url.startsWith(LENS_LINK_PREFIX) ? url : defaultUrlTransform(url))}
        components={{ a: LensAwareAnchor }}
      >
        {escapeLensLinkLabels(children)}
      </ReactMarkdown>
    </div>
  );
}
