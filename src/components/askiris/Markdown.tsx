"use client";

import { isValidElement, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
// CommonMark's flanking rules leave ** literal around CJK punctuation such as corner brackets; this relaxes them.
import remarkCjkFriendly from "remark-cjk-friendly";
import { ArrowUpRight, LogIn, MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/analytics";
import { useChatLinkTargets } from "@/components/askiris/ChatLinkContext";
import { InlineChipContent } from "@/components/askiris/InlineChipContent";
import ReviewSearchChip from "@/components/askiris/ReviewSearchChip";
import { SourceMarker } from "@/components/askiris/ReviewSources";
import { SOURCE_MARKER_LABEL } from "@/lib/askiris/review-citations";
import FeedbackTrigger from "@/components/feedback/FeedbackTrigger";
import { useSignInDialog } from "@/context/SignInDialogProvider";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { escapeLensLinkLabels, normalizeRefListLinks, type LensLinkTarget } from "@/lib/ai/lens-ref";
import { PAGE_LINKS, isChatLinkHref, parseChatLink, type ChatLink } from "@/lib/askiris/inline-links";
import { mountHasCharts, mountHasCollections } from "@/lib/mount";
import { buildComparePath } from "@/lib/url/compare";
import { brandPath, chartPath, collectionPath, lensPath } from "@/lib/url/routes";
import { IRIS_PROSE_CLS } from "@/config/ui-tokens";

// Anchor (`<a>`) chips wrap inline with box-decoration-clone; native `<button>` triggers stay text-left.
const CHIP_CLS =
  "not-prose bg-muted text-foreground hover:bg-muted/70 mx-0.5 inline box-decoration-clone rounded-md px-1.5 py-0.5 text-left text-[0.95em] font-medium no-underline transition-colors";
const CHIP_ICON_CLS = "text-muted-foreground ml-1 inline-block size-3.5 align-[-2px]";

function hasVisibleLabel(children: ReactNode): boolean {
  if (children === null || children === undefined || typeof children === "boolean") {
    return false;
  }
  if (typeof children === "string") {
    return children.trim().length > 0;
  }
  if (Array.isArray(children)) {
    return children.some(hasVisibleLabel);
  }
  if (isValidElement<{ children?: ReactNode }>(children)) {
    return hasVisibleLabel(children.props.children);
  }
  return true;
}

function FallbackCompareChip({ href, count }: { href: string; count: number }) {
  const t = useTranslations("AskIris.reviewSearch");
  return <ChipLink href={href}>{t("compareAction", { count: String(count) })}</ChipLink>;
}

function FallbackReviewsChip({ lenses }: { lenses: LensLinkTarget[] }) {
  const t = useTranslations("AskIris.reviewSearch");
  const label = lenses.length === 1 ? t("triggerSingle") : t("triggerMulti", { count: String(lenses.length) });
  return (
    <ReviewSearchChip lenses={lenses} className={CHIP_CLS} iconClassName={CHIP_ICON_CLS} iconPosition="trailing">
      {label}
    </ReviewSearchChip>
  );
}

// New tab: a same-tab navigation would discard the conversation.
function ChipLink({ href, external, children }: { href: string; external?: boolean; children?: ReactNode }) {
  const content = <InlineChipContent icon={<ArrowUpRight className={CHIP_ICON_CLS} aria-hidden />}>{children}</InlineChipContent>;
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
    <button type="button" onClick={() => openSignIn("iris_reply")} className={CHIP_CLS}>
      <InlineChipContent icon={<LogIn className={CHIP_ICON_CLS} aria-hidden />}>{children}</InlineChipContent>
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
          <InlineChipContent icon={<MessageSquare className={CHIP_ICON_CLS} aria-hidden />}>{children}</InlineChipContent>
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
      const href = buildComparePath(known[0].mount, known.map((entry) => entry.id));
      return hasVisibleLabel(children) ? (
        <ChipLink href={href}>{children}</ChipLink>
      ) : (
        <FallbackCompareChip href={href} count={known.length} />
      );
    }
    case "reviews": {
      const entries = link.refs.map((ref) => targets?.lenses[ref]);
      const known = entries.filter((entry) => entry !== undefined);
      if (known.length !== entries.length) {
        return <>{children}</>;
      }
      return hasVisibleLabel(children) ? (
        <ReviewSearchChip lenses={known} className={CHIP_CLS} iconClassName={CHIP_ICON_CLS} iconPosition="trailing">
          {children}
        </ReviewSearchChip>
      ) : (
        <FallbackReviewsChip lenses={known} />
      );
    }
    case "source":
      // A label other than the bare marker is a name the sentence needs, such as its subject.
      return (
        <>
          {children === SOURCE_MARKER_LABEL ? null : children}
          <SourceMarker sourceKey={link.key} />
        </>
      );
    case "collection":
      if (!targets?.collections.includes(link.slug) || !mountHasCollections(mount)) {
        return <>{children}</>;
      }
      return <ChipLink href={collectionPath(mount, link.slug)}>{children}</ChipLink>;
    case "brand":
      if (!targets?.brands.includes(link.slug) || !mountHasCollections(mount)) {
        return <>{children}</>;
      }
      return <ChipLink href={brandPath(mount, link.slug)}>{children}</ChipLink>;
    case "chart":
      if (!mountHasCharts(mount)) {
        return <>{children}</>;
      }
      return <ChipLink href={chartPath(mount, link.chart)}>{children}</ChipLink>;
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
  className = IRIS_PROSE_CLS,
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
        {escapeLensLinkLabels(normalizeRefListLinks(children))}
      </ReactMarkdown>
    </div>
  );
}
