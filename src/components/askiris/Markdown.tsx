"use client";

import type { ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
// CommonMark's flanking rules leave ** literal around CJK punctuation such as corner brackets; this relaxes them.
import remarkCjkFriendly from "remark-cjk-friendly";
import { ArrowUpRight, LogIn, MessageSquare } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import { useChatLinkTargets } from "@/components/askiris/ChatLinkContext";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { escapeLensLinkLabels } from "@/lib/ai/lens-ref";
import { PAGE_LINKS, isChatLinkHref, parseChatLink, type ChatLink } from "@/lib/askiris/inline-links";
import { mountHasCollections } from "@/lib/mount";
import { buildComparePath } from "@/lib/url/compare";
import { collectionPath, lensPath } from "@/lib/url/routes";

const PROSE_CLS =
  "prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:mb-1 prose-hr:hidden";

const CHIP_CLS =
  "not-prose bg-muted text-foreground hover:bg-muted/70 mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-baseline text-[0.95em] font-medium no-underline transition-colors";
const CHIP_ICON_CLS = "text-muted-foreground size-3.5 shrink-0";

// New tab: a same-tab navigation would discard the conversation.
function ChipLink({ href, external, children }: { href: string; external?: boolean; children?: ReactNode }) {
  const content = (
    <>
      {children}
      <ArrowUpRight className={CHIP_ICON_CLS} aria-hidden />
    </>
  );
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={CHIP_CLS}>
      {content}
    </a>
  ) : (
    <Link href={href} prefetch={false} target="_blank" rel="noopener noreferrer" className={CHIP_CLS}>
      {content}
    </Link>
  );
}

function SignInChip({ children }: { children?: ReactNode }) {
  const openSignIn = useSignInDialog();
  return (
    <button type="button" onClick={() => openSignIn()} className={CHIP_CLS}>
      <LogIn className={CHIP_ICON_CLS} aria-hidden />
      {children}
    </button>
  );
}

// An unknown target renders as plain text, never as a dead link.
function ChatLinkAnchor({ link, children }: { link: ChatLink; children?: ReactNode }) {
  const targets = useChatLinkTargets();
  const mount = useEffectiveMount();
  switch (link.kind) {
    case "lens": {
      const entry = targets?.lenses[link.ref];
      if (!entry) {
        return <>{children}</>;
      }
      return (
        <Link
          href={lensPath(entry)}
          prefetch={false}
          onClick={() => track("askiris_rec_click", { lens_id: entry.id, source: "askiris_prose" })}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </Link>
      );
    }
    case "page": {
      const page: { href: string; external?: boolean } = PAGE_LINKS[link.key];
      return (
        <ChipLink href={page.href} external={page.external}>
          {children}
        </ChipLink>
      );
    }
    case "action":
      return link.action === "feedback" ? (
        <FeedbackTrigger type="general" className={CHIP_CLS}>
          <MessageSquare className={CHIP_ICON_CLS} aria-hidden />
          {children}
        </FeedbackTrigger>
      ) : (
        <SignInChip>{children}</SignInChip>
      );
    case "compare": {
      const entries = link.refs.map((ref) => targets?.lenses[ref]);
      const known = entries.filter((entry) => entry !== undefined);
      if (known.length !== entries.length || new Set(known.map((entry) => entry.mount)).size !== 1) {
        return <>{children}</>;
      }
      return (
        <ChipLink href={buildComparePath(known[0].mount, known.map((entry) => entry.id))}>{children}</ChipLink>
      );
    }
    case "collection":
      if (!targets?.collections.includes(link.slug) || !mountHasCollections(mount)) {
        return <>{children}</>;
      }
      return <ChipLink href={collectionPath(mount, link.slug)}>{children}</ChipLink>;
  }
}

function ProseAnchor({ href, children }: { href?: string; children?: ReactNode }) {
  const link = parseChatLink(href);
  if (link) {
    return <ChatLinkAnchor link={link}>{children}</ChatLinkAnchor>;
  }
  return href && isChatLinkHref(href) ? <>{children}</> : <a href={href}>{children}</a>;
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
        // The default transform strips unknown protocols, which would empty chat-link hrefs.
        urlTransform={(url) => (isChatLinkHref(url) ? url : defaultUrlTransform(url))}
        components={{ a: ProseAnchor }}
      >
        {escapeLensLinkLabels(children)}
      </ReactMarkdown>
    </div>
  );
}
