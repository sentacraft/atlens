import { z } from "zod";

type FieldKind = "string" | "number" | "boolean";
type FieldValue = { string: string; number: number; boolean: boolean };

/** The props each event may carry; anything else is dropped before it is stored. */
const EVENT_FIELDS = {
  search: { query: "string", results_count: "number" },
  filter_apply: { filters_json: "string" },
  filter_reset: {},
  compare_add: { lens_slug: "string" },
  compare_view: { lens_slugs: "string", lens_count: "number" },
  compare_scroll: { lens_slugs: "string" },
  lens_view: { lens_slug: "string", referrer: "string" },
  lens_scroll: { lens_slug: "string", depth_pct: "number" },
  feedback_open: { feedback_type: "string" },
  feedback_submit: { feedback_type: "string" },
  install_action: {},
  share_action: { method: "string" },
  outbound_click: { href: "string" },
  mount_switch: { from_mount: "string", to_mount: "string" },
  purchase_click: { channel: "string", lens_id: "string", source: "string", is_affiliate: "boolean" },
  pwa_launch: { source: "string" },
  askiris_view: {},
  askiris_open: { entry: "string", surface: "string", pool: "string" },
  askiris_message: { method: "string", pool: "string" },
  askiris_rec_click: { lens_id: "string", source: "string" },
  askiris_context_remove: { page_kind: "string" },
  askiris_new_conversation: { reason: "string" },
  page_view: { referrer: "string", from_path: "string" },
  search_select: { query: "string", lens_id: "string", rank: "number" },
  sign_in_open: { reason: "string" },
  sign_in_submit: { method: "string" },
} as const satisfies Record<string, Record<string, FieldKind>>;

export type EventName = keyof typeof EVENT_FIELDS;

export const EVENT_NAMES = Object.keys(EVENT_FIELDS) as [EventName, ...EventName[]];

export type EventProps<E extends EventName> = {
  -readonly [K in keyof (typeof EVENT_FIELDS)[E]]?: FieldValue[(typeof EVENT_FIELDS)[E][K] & FieldKind];
};

const MAX_PROP_STRING_LENGTH = 256;

// Props are best-effort: a malformed prop is dropped, not a reason to lose the event.
const FIELD_SCHEMAS: Record<FieldKind, z.ZodType> = {
  string: z
    .string()
    .transform((value) => value.slice(0, MAX_PROP_STRING_LENGTH))
    .optional()
    .catch(undefined),
  number: z.number().optional().catch(undefined),
  boolean: z.boolean().optional().catch(undefined),
};

const PROPS_SCHEMAS = Object.fromEntries(
  Object.entries(EVENT_FIELDS).map(([event, fields]) => [
    event,
    z.object(
      Object.fromEntries(
        Object.entries(fields as Record<string, FieldKind>).map(([key, kind]) => [key, FIELD_SCHEMAS[kind]]),
      ),
    ),
  ]),
) as Record<EventName, z.ZodObject>;

/** The event's declared props, with malformed values and undeclared keys dropped. */
export function parseEventProps(event: EventName, props: Record<string, unknown> = {}): Record<string, unknown> {
  const parsed = PROPS_SCHEMAS[event].parse(props);
  return Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined));
}

export const trackPayloadSchema = z.object({
  event: z.enum(EVENT_NAMES),
  locale: z.string().optional(),
  path: z.string().optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});

export type TrackPayload = z.input<typeof trackPayloadSchema>;

/** Written by the chat route once per Ask Iris turn; never accepted from the client. */
export const ASKIRIS_TURN_EVENT = "askiris_turn";

export interface AskIrisTurnProps {
  mount: string;
  conversation_id: string;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  step_count: number;
  budget_hit: boolean;
  max_context_tokens: number;
}
