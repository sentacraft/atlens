import { z } from "zod";

// AE layout is positional; the dashboard SQL depends on it.
//   indexes: [event_name]
//   blobs:   [sid, locale, path, primary_string, secondary_string, tertiary_string, internal]
//   doubles: [primary_number]

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
  "askiris_view",
  "askiris_message",
  "askiris_rec_click",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

const MAX_PROP_STRING_LENGTH = 256;

// Props are best-effort: a malformed prop is dropped, not a reason to lose the event.
const propString = z
  .string()
  .transform((value) => value.slice(0, MAX_PROP_STRING_LENGTH))
  .optional()
  .catch(undefined);
const propNumber = z.number().optional().catch(undefined);
const propBoolean = z.boolean().optional().catch(undefined);

export const eventPropsSchema = z.object({
  path: propString,

  query: propString,
  results_count: propNumber,

  filters_json: propString,

  lens_slug: propString,
  lens_slugs: propString,
  lens_count: propNumber,
  depth_pct: propNumber,

  feedback_type: propString,
  method: propString,

  href: propString,
  from_mount: propString,
  to_mount: propString,

  channel: propString,
  lens_id: propString,
  source: propString,
  is_affiliate: propBoolean,

  referrer: propString,
});

export type EventProps = z.input<typeof eventPropsSchema>;

export const trackPayloadSchema = z.object({
  event: z.enum(EVENT_NAMES),
  locale: z.string().optional(),
  props: eventPropsSchema.optional(),
});

export type TrackPayload = z.input<typeof trackPayloadSchema>;

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

// Written directly by the chat route, in its own positional layout. Missing token counts are 0.
//   indexes: [askiris_turn]
//   blobs:   [mount, locale, sid, conversation_id, internal]
//   doubles: [total, input, output, cacheRead tokens, step_count, budget_hit, max_context]
export const ASKIRIS_TURN_EVENT = "askiris_turn";

export interface AskIrisTurnMetrics {
  mount: string;
  locale: string;
  // "" when unknown; the queries filter it out.
  sid: string;
  conversationId: string;
  // Still written; the Ask Iris queries filter it out.
  internal: boolean;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  stepCount: number;
  budgetHit: boolean;
  maxContextTokens: number;
}

export function askirisTurnDataPoint(m: AskIrisTurnMetrics): {
  indexes: [string];
  blobs: [string, string, string, string, string];
  doubles: [number, number, number, number, number, number, number];
} {
  return {
    indexes: [ASKIRIS_TURN_EVENT],
    blobs: [m.mount, m.locale, m.sid, m.conversationId, m.internal ? "1" : ""],
    doubles: [
      m.totalTokens,
      m.inputTokens,
      m.outputTokens,
      m.cacheReadTokens,
      m.stepCount,
      m.budgetHit ? 1 : 0,
      m.maxContextTokens,
    ],
  };
}
