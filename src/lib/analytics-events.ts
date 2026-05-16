// Shared event schema. Imported by both the client `track()` helper and the
// `/api/track` route so the wire format stays in lock-step with the AE row
// layout used downstream by the dashboard.
//
// AE layout (fixed positional, single dataset `xglass_events`):
//   indexes: [event_name]
//   blobs:   [sid, locale, path, primary_string, secondary_string]
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
  blobs: [string, string, string, string, string];
  doubles: [number];
}

export function toDataPoint(
  event: EventName,
  sid: string,
  locale: string,
  props: EventProps,
): AnalyticsEnginePoint {
  const primaryString =
    props.query ??
    props.filters_json ??
    props.lens_slug ??
    props.href ??
    props.to_mount ??
    props.feedback_type ??
    "";
  const secondaryString =
    props.lens_slugs ??
    props.method ??
    props.from_mount ??
    props.referrer ??
    "";
  const primaryNumber =
    props.results_count ??
    props.depth_pct ??
    props.lens_count ??
    0;

  return {
    indexes: [event],
    blobs: [sid, locale, props.path ?? "", primaryString, secondaryString],
    doubles: [primaryNumber],
  };
}
