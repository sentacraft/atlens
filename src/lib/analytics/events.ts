// Shared event schema. Imported by both the client `track()` helper and the
// `/api/track` route so the wire format stays in lock-step with the AE row
// layout used downstream by the dashboard.
//
// AE layout (fixed positional, single dataset `xglass_events`):
//   indexes: [event_name]
//   blobs:   [sid, locale, path, primary_string, secondary_string, tertiary_string, internal]
//   doubles: [primary_number]
//
// Keeping the layout positional (instead of named) is what makes the
// dashboard SQL simple: blob3 always means the same column class regardless
// of event type.

export const EVENT_NAMES = [
  "search",
  "filter_apply",
  "filter_reset",
  "compare_add",
  "compare_view",
  "compare_scroll",
  "lens_view",
  "lens_scroll",
  "feedback_open",
  "feedback_submit",
  "install_action",
  "share_action",
  "outbound_click",
  "mount_switch",
  "purchase_click",
  "pwa_launch",
  // AskIris funnel: a page view (funnel entry / PV + UV), one per user turn (query
  // text + how it originated), and a click from a recommendation card through to a lens.
  "askiris_view",
  "askiris_message",
  "askiris_rec_click",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface EventProps {
  // Common
  path?: string;

  // Search
  query?: string;
  results_count?: number;

  // Filters
  filters_json?: string;

  // Compare / detail
  lens_slug?: string;
  lens_slugs?: string;
  lens_count?: number;
  depth_pct?: number;

  // CTA / feedback
  feedback_type?: string;
  method?: string;

  // Outbound / mount
  href?: string;
  from_mount?: string;
  to_mount?: string;

  // Purchase
  channel?: string;
  lens_id?: string;
  source?: string;
  is_affiliate?: boolean;

  // Context
  referrer?: string;
}

export interface TrackPayload {
  event: EventName;
  locale?: string;
  props?: EventProps;
}

export const EVENT_NAME_SET: ReadonlySet<string> = new Set<string>(EVENT_NAMES);

interface AnalyticsEnginePoint {
  indexes: [string];
  blobs: [string, string, string, string, string, string, string];
  doubles: [number];
}

export function toDataPoint(
  event: EventName,
  sid: string,
  locale: string,
  props: EventProps,
  internal: boolean,
): AnalyticsEnginePoint {
  const primaryString =
    props.query ??
    props.filters_json ??
    props.lens_slug ??
    props.href ??
    props.to_mount ??
    props.feedback_type ??
    props.channel ??
    "";
  const secondaryString =
    props.lens_slugs ??
    props.method ??
    props.from_mount ??
    props.referrer ??
    props.lens_id ??
    "";
  const tertiaryString =
    props.source ??
    "";
  const primaryNumber =
    props.results_count ??
    props.depth_pct ??
    props.lens_count ??
    (props.is_affiliate ? 1 : 0);

  return {
    indexes: [event],
    blobs: [sid, locale, props.path ?? "", primaryString, secondaryString, tertiaryString, internal ? "1" : ""],
    doubles: [primaryNumber],
  };
}

// AskIris per-turn metrics, written straight to AE from the chat route's onEnd —
// server-only (the client never sees token usage), so it skips the /api/track path.
// Its own positional layout in the same dataset; query it by the index. Token counts
// can be missing from a provider, recorded as 0.
//   indexes: [askiris_turn]
//   blobs:   [mount, locale, sid, segment_id, internal]
//   doubles: [total, input, output, cacheRead tokens, step_count, budget_hit]
export const ASKIRIS_TURN_EVENT = "askiris_turn";

export interface AskIrisTurnMetrics {
  mount: string;
  locale: string;
  // Session-funnel join keys: sid = the anonymous visit (xg_sid cookie, read
  // server-side), segmentId = the conversation segment (a new one starts on a mount
  // switch or "new chat"). Together they give visitors → sessions → turns, and are
  // the same keys a future transcript replay would persist against. Either can be ""
  // when unknown (no cookie yet / a legacy client), which the queries filter out.
  sid: string;
  segmentId: string;
  // Keep this row out of the dashboards (dogfooding / load tests via the bypass or
  // xg_internal cookie). The row is still written — the AskIris queries filter it.
  internal: boolean;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  stepCount: number;
  budgetHit: boolean;
}

export function askirisTurnDataPoint(m: AskIrisTurnMetrics): {
  indexes: [string];
  blobs: [string, string, string, string, string];
  doubles: [number, number, number, number, number, number];
} {
  return {
    indexes: [ASKIRIS_TURN_EVENT],
    blobs: [m.mount, m.locale, m.sid, m.segmentId, m.internal ? "1" : ""],
    doubles: [
      m.totalTokens,
      m.inputTokens,
      m.outputTokens,
      m.cacheReadTokens,
      m.stepCount,
      m.budgetHit ? 1 : 0,
    ],
  };
}
