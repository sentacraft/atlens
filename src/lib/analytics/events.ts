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
  sign_in_open: { reason: "string", entry: "string" },
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

/** Written by the auth server when a sign-in creates a session; never accepted from the client. */
export const SIGN_IN_COMPLETE_EVENT = "sign_in_complete";

export interface SignInCompleteProps {
  method: "google" | "email";
  new_account: boolean;
}

/** What a stored value means and what the dashboard calls it. */
export interface ValueDoc {
  label: string;
  description: string;
}

export interface FieldDoc {
  description: string;
  values?: Record<string, ValueDoc>;
}

export interface EventDoc {
  description: string;
  fields?: Record<string, FieldDoc>;
}

type EventDocs = {
  [E in EventName]: { description: string; fields?: { [K in keyof (typeof EVENT_FIELDS)[E]]?: FieldDoc } };
} & { [ASKIRIS_TURN_EVENT]: EventDoc; [SIGN_IN_COMPLETE_EVENT]: EventDoc };

const IRIS_PAGE_KINDS: Record<string, ValueDoc> = {
  lens: { label: "Lens page", description: "A lens's detail page" },
  compare: { label: "Compare page", description: "The comparison page" },
  browse: { label: "Browse list", description: "The lens list, with its filters" },
};

const STARTER_POOLS: Record<string, ValueDoc> = {
  need: { label: "Find a lens", description: "Find lenses for a need" },
  compare: { label: "Compare", description: "Compare two lenses" },
  favorites: { label: "Favorites", description: "About the visitor's favorites; signed-in visitors with favorites only" },
  gearUnknown: { label: "Gear (unknown)", description: "About the visitor's own gear, before Iris knows it" },
  gearKnown: { label: "Gear (known)", description: "About the gear in a signed-in visitor's profile" },
  table: { label: "Spec table", description: "Ask for a spec table" },
  terms: { label: "Terms", description: "Explain a lens term" },
  about: { label: "About Iris", description: "What Iris is and can do" },
};

const MOUNT_VALUES: Record<string, ValueDoc> = {
  X: { label: "X mount", description: "Fujifilm X (APS-C)" },
  G: { label: "GF mount", description: "Fujifilm G (medium format)" },
};

/** Plain-language definitions the admin dashboard shows beside every metric. */
export const EVENT_DOCS: EventDocs = {
  search: {
    description: "A query typed in the lens search dialog, recorded once typing pauses for half a second.",
    fields: { results_count: { description: "How many lenses matched; 0 is a zero-result search." } },
  },
  filter_apply: {
    description: "The browse filters changed and stayed put for a second.",
    fields: { filters_json: { description: "Every filter set at that moment." } },
  },
  filter_reset: { description: "The browse filters went back to their defaults." },
  compare_add: { description: "A lens was added to the comparison tray." },
  compare_view: { description: "A comparison page opened, once per page load." },
  compare_scroll: { description: "A visitor scrolled the comparison table." },
  lens_view: {
    description: "A lens's detail page opened.",
    fields: { referrer: { description: "The page the browser came from, outside the site or within it." } },
  },
  lens_scroll: {
    description: "A visitor scrolled a lens page past 50% or 90% of its height.",
    fields: { depth_pct: { description: "The depth reached: 50 or 90." } },
  },
  feedback_open: {
    description: "A feedback form opened.",
    fields: {
      feedback_type: {
        description: "Which form.",
        values: {
          general: { label: "General", description: "The feedback button in the site header, or on a collection page" },
          data_issue: { label: "Data issue", description: "\"Report an issue\" on a lens page, for wrong lens data" },
        },
      },
    },
  },
  feedback_submit: {
    description: "A feedback form was sent.",
    fields: {
      feedback_type: {
        description: "Which form.",
        values: {
          general: { label: "General", description: "The general feedback form" },
          data_issue: { label: "Data issue", description: "The form for wrong lens data" },
        },
      },
    },
  },
  install_action: { description: "A visitor accepted the browser's prompt to install the app." },
  share_action: {
    description: "A visitor shared a lens or a comparison.",
    fields: {
      method: {
        description: "How it was shared.",
        values: {
          copy_link: { label: "Copy link", description: "Copied the page link" },
          native: { label: "Native share", description: "The phone's own share sheet" },
          poster_download: { label: "Poster download", description: "Saved the share poster image" },
          poster_share: { label: "Poster share", description: "Sent the share poster through the share sheet" },
        },
      },
    },
  },
  outbound_click: { description: "A click on a link that leaves the site, other than a store link." },
  mount_switch: {
    description: "A visitor switched between the X and GF lens catalogs.",
    fields: {
      from_mount: { description: "The catalog they left.", values: MOUNT_VALUES },
      to_mount: { description: "The catalog they switched to.", values: MOUNT_VALUES },
    },
  },
  purchase_click: {
    description: "A click on a store link for a lens.",
    fields: {
      channel: {
        description: "The store.",
        values: {
          official: { label: "Official", description: "The maker's own store" },
          amazon: { label: "Amazon", description: "Amazon" },
          ebay: { label: "eBay", description: "eBay" },
          bhphoto: { label: "B&H", description: "B&H Photo" },
          jd: { label: "JD", description: "JD.com, shown in Chinese only" },
          taobao: { label: "Taobao", description: "Taobao, shown in Chinese only" },
        },
      },
      source: {
        description: "Where the store link was.",
        values: {
          detail: { label: "Lens page", description: "The store menu on a lens page" },
          compare: { label: "Compare table", description: "The store row of the comparison table" },
          "compare-mobile": { label: "Compare, phone", description: "The store panel of the comparison on a phone" },
          unknown: { label: "Other", description: "A store link without a recorded place" },
        },
      },
      is_affiliate: {
        description: "Whether the link earns a commission.",
        values: {
          "1": { label: "Affiliate link", description: "Earns a commission" },
          "0": { label: "Plain link", description: "Earns nothing" },
        },
      },
    },
  },
  pwa_launch: {
    description: "The installed app was opened, once per app session.",
    fields: {
      source: {
        description: "What it was opened from.",
        values: {
          pwa: { label: "App icon", description: "The home-screen icon" },
          "pwa-browse": { label: "Browse shortcut", description: "The icon's Browse shortcut" },
          "pwa-compare": { label: "Compare shortcut", description: "The icon's Compare shortcut" },
        },
      },
    },
  },
  askiris_view: { description: "The Iris chat appeared on screen: the Ask Iris page, the side panel or the phone sheet." },
  askiris_open: {
    description: "A visitor opened Iris from a button or the home page's ask box.",
    fields: {
      entry: {
        description: "Where Iris was opened from.",
        values: {
          home: { label: "Home", description: "The ask box or an example question on the home page" },
          lens: { label: "Lens page", description: "\"Ask Iris\" on a lens's page" },
          nav: { label: "Top navigation", description: "The Iris button in the site header" },
          browse: { label: "Browse list", description: "\"Ask Iris\" in the lens list toolbar" },
          empty: { label: "No-results prompt", description: "The prompt shown when the filters match no lens" },
          compare: { label: "Compare page", description: "\"Ask Iris\" in the comparison header" },
          resume: { label: "Past chat", description: "The Ask Iris page's way back to the page it came from, which reopened its conversation in the panel. Removed in October 2026; kept to label earlier events" },
        },
      },
      surface: {
        description: "How Iris appeared.",
        values: {
          page: { label: "Full page", description: "The Ask Iris page" },
          panel: { label: "Side panel", description: "The panel beside the page on wide screens" },
          sheet: { label: "Phone sheet", description: "The same panel on a phone, rising from the bottom" },
        },
      },
      pool: { description: "Which kind of example question was clicked on the home page; empty when typed.", values: STARTER_POOLS },
    },
  },
  askiris_message: {
    description: "A message sent to Iris.",
    fields: {
      method: {
        description: "How it was sent.",
        values: {
          typed: { label: "Typed", description: "Written in the Iris composer" },
          starter: { label: "Example question", description: "One of the example questions in an empty chat that is not about a page" },
          handoff: { label: "Carried over", description: "Sent for the visitor when Iris opened from the home ask box or a page button" },
          suggestion: {
            label: "Page question",
            description: "One of the questions about the page, listed when a chat starts on a lens, compare or browse page",
          },
        },
      },
      pool: { description: "Which kind of example question; only for example questions.", values: STARTER_POOLS },
    },
  },
  askiris_rec_click: {
    description: "A visitor opened a lens that Iris recommended.",
    fields: {
      source: {
        description: "Where in the reply the lens was.",
        values: {
          askiris: { label: "Card", description: "The lens cards under a reply" },
          askiris_table: { label: "Table", description: "A row of a spec table Iris drew" },
          askiris_prose: { label: "Text link", description: "A lens name linked in the reply text" },
        },
      },
    },
  },
  askiris_context_remove: {
    description: "A visitor took the page chip out of the composer, so Iris stopped reading that page.",
    fields: { page_kind: { description: "The kind of page.", values: IRIS_PAGE_KINDS } },
  },
  askiris_new_conversation: {
    description: "A new Iris conversation started.",
    fields: {
      reason: {
        description: "Why.",
        values: {
          manual: { label: "New chat button", description: "The visitor pressed New chat" },
          page_change: { label: "Moved to another page", description: "Iris started fresh because the page it was reading changed" },
        },
      },
    },
  },
  page_view: {
    description: "A page opened, either from outside or by moving within the site.",
    fields: {
      from_path: { description: "The page before it, for a move within the site." },
      referrer: { description: "The page the browser came from, for a first page." },
    },
  },
  search_select: {
    description: "A result picked in the lens search dialog.",
    fields: { rank: { description: "The result's position in the list, from 1." } },
  },
  sign_in_open: {
    description: "The sign-in dialog opened.",
    fields: {
      reason: {
        description: "What opened it.",
        values: {
          favorite: { label: "Favorite", description: "Tried to save a favorite lens while signed out" },
          gear: { label: "Gear", description: "Tried to add a lens to their gear while signed out, on a lens page or from Iris" },
          general: { label: "General", description: "A sign-in button not tied to an action; split by entry" },
        },
      },
      entry: {
        description: "Which sign-in button, for general sign-ins; recorded since this field was added.",
        values: {
          account_menu: { label: "Account menu", description: "Sign in in the account menu of the site header" },
          profile: { label: "Profile page", description: "The sign-in button on the profile page" },
          iris_chat: { label: "Iris chat notice", description: "The sign-in link in a new Iris chat, for guests" },
          iris_history: { label: "Iris history prompt", description: "The sign-in prompt beside History in full-screen Iris, for visitors without an account" },
          iris_reply: { label: "Link in an Iris reply", description: "A sign-in chip inside one of Iris's replies" },
        },
      },
    },
  },
  sign_in_submit: {
    description: "A sign-in was sent, counted when the button is pressed and before it finishes.",
    fields: {
      method: {
        description: "How.",
        values: {
          google: { label: "Google", description: "Pressed Continue with Google, before leaving for Google" },
          email: { label: "Email code", description: "Entered the emailed code and pressed Sign in" },
        },
      },
    },
  },
  [SIGN_IN_COMPLETE_EVENT]: {
    description: "A sign-in finished and created a session, written by the server. Guest Iris sessions are left out.",
    fields: {
      method: {
        description: "How they signed in.",
        values: {
          google: { label: "Google", description: "Came back from Google signed in" },
          email: { label: "Email code", description: "Entered a valid emailed code" },
        },
      },
      new_account: {
        description: "Whether the sign-in created the account.",
        values: {
          "1": { label: "New account", description: "The account was created by this sign-in" },
          "0": { label: "Returning", description: "The account already existed" },
        },
      },
    },
  },
  [ASKIRIS_TURN_EVENT]: {
    description: "One question to Iris and its answer, written by the server.",
    fields: {
      mount: { description: "Which lens catalog the conversation was about.", values: MOUNT_VALUES },
      step_count: { description: "Model calls in the turn; Iris calls the model again after each tool it uses." },
      max_context_tokens: { description: "Input tokens of the turn's largest model call: system prompt, history and tool results." },
    },
  },
};

export interface Definition {
  term: string;
  description: string;
}

/** An event's meaning and, for each listed field, what the field holds and what its values mean. */
export function eventDefinitions(
  event: keyof EventDocs,
  fields: string[] = [],
): { description: string; fields: Array<{ description: string; values: Definition[] }> } {
  const doc: EventDoc = EVENT_DOCS[event];
  return {
    description: doc.description,
    fields: fields.flatMap((field) => {
      const fieldDoc = doc.fields?.[field];
      if (!fieldDoc) {
        return [];
      }
      const values = Object.values(fieldDoc.values ?? {}).map(({ label, description }) => ({ term: label, description }));
      return [{ description: fieldDoc.description, values }];
    }),
  };
}

/** The dashboard's name for a stored value; the raw value when it has none. */
export function valueLabel(event: keyof EventDocs, field: string, value: string): string {
  const fields: Record<string, FieldDoc> | undefined = EVENT_DOCS[event].fields;
  return fields?.[field]?.values?.[value]?.label ?? value;
}
