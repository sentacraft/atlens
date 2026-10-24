import { z } from "zod";
import {
  REVIEW_AGREEMENTS,
  REVIEW_ASPECTS,
  REVIEW_KINDS,
  REVIEW_POLARITIES,
  STALENESS_REASONS,
  type LensReviewClaim,
  type LensReviewSource,
  type ReviewAspect,
} from "./reviews";

/** What a lens page shows of the review store: one language, and only the fields it renders. */
export const lensReviewsViewSchema = z.object({
  sources: z.array(
    z.object({
      id: z.string(),
      url: z.string(),
      site: z.string(),
      kind: z.enum(REVIEW_KINDS),
      published: z.string().optional(),
      bodies: z.array(z.string()).optional(),
    }),
  ),
  claims: z.array(
    z.object({
      aspect: z.enum(REVIEW_ASPECTS),
      polarity: z.enum(REVIEW_POLARITIES),
      agreement: z.enum(REVIEW_AGREEMENTS),
      text: z.string(),
      sources: z.array(z.string()),
      reviewCount: z.number(),
      outletCount: z.number(),
      details: z.array(z.object({ id: z.string(), text: z.string() })),
      /** Why some of the claim's sources may not hold on current bodies; empty when none applies. */
      staleness: z.array(z.enum(STALENESS_REASONS)),
      otherMount: z.boolean(),
    }),
  ),
  /** Set when only the collapsed findings were sent: what the full view, for an account, holds. */
  locked: z
    .object({
      total: z.number(),
      sourceCount: z.number(),
      disputed: z.array(z.enum(REVIEW_ASPECTS)),
      /** The best-supported aspects among the findings left out, named to show what signing in adds. */
      hiddenAspects: z.array(z.enum(REVIEW_ASPECTS)),
    })
    .optional(),
});
export type LensReviewsView = z.infer<typeof lensReviewsViewSchema>;
export type ReviewClaimView = LensReviewsView["claims"][number];
export type ReviewSourceView = LensReviewsView["sources"][number];

/** Narrows a stored row to what a lens page renders, in the page's language. */
export function toLensReviewsView(
  row: { sources: LensReviewSource[]; claims: LensReviewClaim[] },
  locale: string,
): LensReviewsView {
  const zh = locale === "zh";
  return {
    sources: row.sources.map(({ id, url, site, kind, published, bodies }) => ({ id, url, site, kind, published, bodies })),
    claims: row.claims.map((claim) => ({
      aspect: claim.aspect,
      polarity: claim.polarity,
      agreement: claim.agreement,
      text: zh ? claim.textZh : claim.text,
      sources: claim.sources,
      reviewCount: claim.reviewCount,
      outletCount: claim.outletCount,
      details: (claim.details ?? []).map((detail) => ({ id: detail.id, text: zh ? detail.textZh : detail.text })),
      staleness: [...new Set((claim.staleness ?? []).map((entry) => entry.reason))],
      otherMount: claim.otherMount === true,
    })),
  };
}

/** The sections a lens page groups claims into, in order; `overall` leads on its own and `award` is not shown. */
export const REVIEW_GROUPS = {
  image: [
    "resolution_center", "resolution_edge", "bokeh", "chromatic_aberration", "flare", "distortion", "vignetting",
    "color", "field_curvature", "astigmatism", "coma", "focus_shift", "sunstar",
  ],
  focus: ["autofocus", "manual_focus", "focus_breathing", "stabilization"],
  build: ["build", "handling", "size_weight", "weather_sealing", "close_focus", "compatibility", "sample_variation"],
} as const satisfies Record<string, readonly ReviewAspect[]>;
export type ReviewGroup = keyof typeof REVIEW_GROUPS;

const COLLAPSED_PER_SIDE = 4;
const HIDDEN_ASPECTS_NAMED = 3;

// Within a group, findings more reviews agree on come first; ties keep the group's aspect order.
function byWeight(order: readonly ReviewAspect[]) {
  return (a: ReviewClaimView, b: ReviewClaimView) =>
    b.reviewCount - a.reviewCount || order.indexOf(a.aspect) - order.indexOf(b.aspect);
}

export interface ReviewLayout {
  overall?: ReviewClaimView;
  groups: { group: ReviewGroup; claims: ReviewClaimView[] }[];
  /** The collapsed view: the best-supported strengths and weaknesses. */
  pros: ReviewClaimView[];
  cons: ReviewClaimView[];
  /** Source ids in the order their markers are numbered, across the expanded view. */
  sourceOrder: string[];
  total: number;
}

/** Arranges a lens's claims for its page: the overall verdict, the groups, and the collapsed strengths and weaknesses. */
export function layoutReviews(view: LensReviewsView): ReviewLayout {
  const allAspects = Object.values(REVIEW_GROUPS).flat() as ReviewAspect[];
  const overall = view.claims.find((claim) => claim.aspect === "overall");
  const groups = (Object.keys(REVIEW_GROUPS) as ReviewGroup[])
    .map((group) => ({
      group,
      claims: view.claims
        .filter((claim) => (REVIEW_GROUPS[group] as readonly ReviewAspect[]).includes(claim.aspect))
        .sort(byWeight(REVIEW_GROUPS[group])),
    }))
    .filter(({ claims }) => claims.length > 0);
  const ranked = groups.flatMap(({ claims }) => claims).sort(byWeight(allAspects));
  const sourceOrder = [
    ...new Set(
      [...(overall ? [overall] : []), ...groups.flatMap(({ claims }) => claims)].flatMap((claim) => [
        ...claim.sources,
        ...claim.details.map((detail) => detail.id),
      ]),
    ),
  ];
  return {
    overall,
    groups,
    pros: ranked.filter((claim) => claim.polarity === "positive").slice(0, COLLAPSED_PER_SIDE),
    cons: ranked.filter((claim) => claim.polarity === "negative").slice(0, COLLAPSED_PER_SIDE),
    sourceOrder,
    total: (overall ? 1 : 0) + ranked.length,
  };
}

/** What a guest gets: the collapsed findings without their details, and only the sources those cite. */
export function previewReviews(view: LensReviewsView): LensReviewsView {
  const layout = layoutReviews(view);
  const claims = [...(layout.overall ? [layout.overall] : []), ...layout.pros, ...layout.cons].map((claim) => ({ ...claim, details: [] }));
  const cited = new Set(claims.flatMap((claim) => claim.sources));
  const shown = new Set([...layout.pros, ...layout.cons]);
  const allAspects = Object.values(REVIEW_GROUPS).flat() as ReviewAspect[];
  const hidden = layout.groups
    .flatMap(({ claims }) => claims)
    .filter((claim) => !shown.has(claim))
    .sort(byWeight(allAspects));
  const known = new Set(view.sources.map((source) => source.id));
  return {
    sources: view.sources.filter((source) => cited.has(source.id)),
    claims,
    locked: {
      total: layout.total,
      sourceCount: layout.sourceOrder.filter((id) => known.has(id)).length,
      disputed: [
        ...new Set(
          layout.groups.flatMap(({ claims }) => claims).filter((claim) => claim.agreement === "conflict").map((claim) => claim.aspect),
        ),
      ],
      hiddenAspects: [...new Set(hidden.map((claim) => claim.aspect))].slice(0, HIDDEN_ASPECTS_NAMED),
    },
  };
}
