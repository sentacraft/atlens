import type { Mount } from "@/lib/mount";

/**
 * Sentinel value for a field where the concept does not apply to this lens
 * (as opposed to "data missing"). Examples:
 * - filterMm = "N/A" on bulbous fisheye lenses (no front filter thread)
 * - focusMotor = "N/A" on manual-focus lenses (no AF motor)
 * - apertureBladeCount = "N/A" on fixed-aperture lenses (no diaphragm at all)
 * - powerZoom / internalZoom = "N/A" on primes (no zoom mechanism)
 *
 * Use this whenever a structured field's domain is undefined for a class of
 * lenses, rather than picking 0 / 1 / -1 placeholder values that would be
 * ambiguous with real data. When a field uses "N/A", consider also adding
 * an entry in {@link Lens.fieldNotes} to explain to the end user *why* the
 * concept doesn't apply.
 */
export const SPEC_NA = "N/A" as const;

/**
 * User-facing official product links grouped by market channel.
 * A lens may expose different official URLs for mainland China and global users.
 */
export interface LensOfficialLinks {
  /**
   * Mainland China official product page.
   * @example "https://www.fujifilm-x.com/zh-cn/products/lenses/xf35mmf14-r/"
   */
  cn?: string;

  /**
   * Global or English official product page.
   * @example "https://www.fujifilm-x.com/en-us/products/lenses/xf35mmf14-r/"
   */
  global?: string;
}

/**
 * Optional length variants for lenses whose physical length changes by state
 * or zoom position. Write wide and tele whenever the source gives both values,
 * even when they are equal.
 */
export interface LensLengthVariants {
  /**
   * Retracted or collapsed length in millimeters.
   * @example 37.5
   */
  retracted?: number;

  /**
   * Physical length at the wide end in millimeters.
   * @example 55.6
   */
  wide?: number;

  /**
   * Physical length at the tele end in millimeters.
   * @example 57.2
   */
  tele?: number;
}

/**
 * Physical length of the lens body, with optional per-state variants.
 */
export interface LensLength {
  /**
   * Primary physical length in millimeters (standard / extended-ready position).
   * @example 50.4
   */
  mm: number;

  /**
   * Optional breakdown by physical state (retracted, wide, tele).
   * Write wide and tele whenever the source gives both values, even when
   * they are equal.
   * @example { retracted: 37.5, tele: 57.2 }
   * @example { wide: 87, tele: 87 }
   */
  variants?: LensLengthVariants;
}

/**
 * MFD for one focus mode. Fill as follows:
 * 1. `cm` — always required. Use the value the manufacturer states for this mode.
 *    - Single value (prime, or zoom with one uniform distance): fill `cm` only.
 *    - Two values per focal length (zoom): fill `cm` = wide-end, `teleCm` = tele-end.
 * 2. `teleCm` — only when the source explicitly gives a different tele-end distance.
 *    Omit when the manufacturer gives only one number, regardless of lens type.
 */
export interface FocusDistanceMode {
  /** Wide-end or single MFD value in cm. @example 15 */
  cm: number;
  /** Tele-end MFD in cm. Only when source gives a separate tele-end value. @example 24 */
  teleCm?: number;
}

/**
 * Minimum focus distance. Fill as follows:
 * 1. Always fill `normal` with the normal-mode MFD (follow FocusDistanceMode rules).
 * 2. Fill `macro` only when ALL of the following are true:
 *    - The source explicitly labels a separate macro / close-focus mode.
 *    - That mode's starting distance is strictly shorter than normal mode.
 *    If the macro and normal starting distances are equal, the macro mode does
 *    not enable closer focus — omit `macro`.
 * 3. Within `macro`, follow the same FocusDistanceMode rules as `normal`.
 */
export interface MinFocusDistance {
  normal: FocusDistanceMode;
  macro?: FocusDistanceMode;
}

/**
 * Wide/Tele breakdown of maximum magnification for zoom lenses.
 */
export interface MagnificationVariants {
  /**
   * Maximum magnification at the wide end.
   * @example 0.25
   */
  wide?: number;

  /**
   * Maximum magnification at the tele end.
   * @example 0.13
   */
  tele?: number;
}

/**
 * Maximum magnification, with optional per-focal-length breakdown for zoom lenses.
 */
export interface MaxMagnification {
  /**
   * Highest magnification value across all focal lengths. Used for sorting and filtering.
   * @example 0.15
   * @example 1.0
   */
  value: number;

  /**
   * Wide/Tele breakdown for zoom lenses.
   * @example { wide: 0.25, tele: 0.13 }
   */
  variants?: MagnificationVariants;
}

/**
 * Structured optical formula parsed from a source page.
 */
export interface LensConfiguration {
  /**
   * Number of optical groups.
   * @example 10
   */
  groups: number;

  /**
   * Number of optical elements.
   * @example 14
   */
  elements: number;

  /**
   * Number of aspherical elements when explicitly stated.
   * @example 4
   */
  aspherical?: number;

  /**
   * Number of ED elements when explicitly stated.
   * @example 4
   */
  ed?: number;

  /**
   * Number of Super ED elements when explicitly stated.
   * @example 3
   */
  superEd?: number;

  /**
   * Number of Sigma SLD (Special Low Dispersion) elements.
   * Optically equivalent to ED; kept separate to preserve manufacturer naming.
   * @example 2
   */
  sld?: number;

  /**
   * Number of Sigma FLD (F Low Dispersion / fluorite-grade) elements.
   * Optically equivalent to Super ED; kept separate to preserve manufacturer naming.
   * @example 1
   */
  fld?: number;

  /**
   * Number of high-refractive-index elements (Tamron HR, Sigma HRI, generic high-index).
   * @example 2
   */
  highRefractive?: number;

  /**
   * Raw source wording kept for traceability and future parser refinement.
   * @example "10 groups 14 elements (incl. 4 aspherical, 4 ED)"
   */
  sourceText?: string;
}

export type ApertureValue = number | [number, number];

/**
 * Flat optical and form-factor traits. Each trait is independent — no
 * implicit pairing required.
 *
 * Trait definitions (apply when the source or model name explicitly indicates):
 * - "macro"      — marketed as a macro lens, typically ≥0.5x magnification.
 *                  Ultra-macro (>1.0x) is derived from {@link Lens.maxMagnification}
 *                  and is no longer a separate trait.
 * - "anamorphic" — uses anamorphic optics for cinematic squeeze. In practice
 *                  always paired with `isCine: true` on the lens, but the trait
 *                  itself is just "the optics are anamorphic".
 * - "tilt"       — supports tilt movements (tilt-shift or Lensbaby-style).
 * - "shift"      — supports shift movements.
 * - "fisheye"    — fisheye projection (≥180° diagonal or circular).
 * - "probe"      — probe / periscope form factor (e.g. Laowa Probe). Form-factor
 *                  trait — orthogonal to macro capability; pair with "macro"
 *                  when the lens also supports macro focusing.
 */
export const OPTICAL_TRAITS = [
  "macro",
  "anamorphic",
  "tilt",
  "shift",
  "fisheye",
  "probe",
] as const;
export type OpticalTrait = (typeof OPTICAL_TRAITS)[number];

/**
 * All valid keys for {@link Lens.fieldNotes}. Defined as a const tuple so that
 * lens-schema.ts can derive its Zod enum without duplicating the list.
 *
 * Only structured fields where the typed value cannot fully express the source
 * information are eligible. Free-form string fields (e.g. angleOfView, lensMaterial)
 * are excluded because they carry their own context directly.
 */
export const FIELD_NOTE_KEYS = [
  "wr",
  "weightG",
  "lengthMm",
  "diameterMm",
  "filterMm",
  "minFocusDistance",
  "maxMagnification",
  "lensConfiguration",
  "ois",
  "focusMotor",
  "apertureRing",
  "maxAperture",
  "minAperture",
  "apertureBladeCount",
  "internalZoom",
] as const;
export type FieldNoteKey = (typeof FIELD_NOTE_KEYS)[number];

/**
 * Fujifilm camera mount that the lens is being catalogued under.
 * "X" = Fujifilm X mount (APS-C bodies).
 * "G" = Fujifilm G mount (GFX medium-format bodies).
 *
 * The same physical lens design from a third-party brand may exist for
 * multiple systems; in this catalogue each mount is a separate record.
 */
export type { Mount };

/**
 * One retail source's price/purchase observation for a lens in one market.
 * `price`/`currency` are optional: a source may contribute only a purchase
 * link (e.g. Amazon ASIN with no sampled price). `url` is the product page
 * (purchase-link base when `channel` is set). `channel`, when present, marks
 * this source as a buyable purchase channel — derived at publish time.
 */
export interface LensPriceEntry {
  price?: number;
  currency?: "CNY" | "USD";
  source: string;
  url?: string;
  /** When present, this source is a buyable purchase channel of the given
   *  kind (its `url` becomes a purchase link). Absent = price-only source
   *  (e.g. a brand info page). ebay/bhphoto are search-driven and never here. */
  purchasableChannel?: "official" | "amazon" | "jd" | "tmall";
  /** ISO date YYYY-MM-DD when sampled. */
  sampledAt: string;
}

/** Purchase channels the frontend renders a buy button for. */
export type PurchaseChannelType = "official" | "amazon" | "ebay" | "bhphoto" | "jd" | "taobao";

/** Translated user-facing fields for a single locale. */
interface LensLocaleTranslations {
  fieldNotes?: Partial<Record<FieldNoteKey, string>>;
  lensMaterial?: string;
  accessories?: string[];
}

/**
 * Canonical lens record used by the X-Glass app.
 */
export interface Lens {
  /**
   * Stable unique slug for routing, comparison state, and cross-file references.
   * The trailing "-x" / "-g" reflects the mount.
   * @example "fujifilm-xf-35mm-f14-r-x"
   * @example "fujifilm-gf-50mm-f35-r-lm-wr-g"
   */
  id: string;

  /**
   * Manufacturer brand shown to users.
   * @example "Fujifilm"
   * @example "Sigma"
   */
  brand: string;

  /**
   * Camera mount this lens record covers. Determines which dataset the lens
   * belongs to (lenses.json for X, lenses-gfx.json for G) and which front-end
   * routes serve it.
   */
  mount: Mount;

  /**
   * Product line or series name as used by the manufacturer.
   * Omit (undefined or empty string) when the brand does not expose a formal series name.
   *
   * @example "XF"       // Fujifilm XF prime/zoom
   * @example "XC"       // Fujifilm XC budget line
   * @example "Art"      // Sigma Art line
   * @example "Contemporary" // Sigma Contemporary line
   */
  series?: string;

  /**
   * Official marketing model name.
   * @example "XF35mmF1.4 R"
   */
  model: string;

  /**
   * Numeric generation marker for lenses that supersede an earlier version
   * under the same brand and model line. Set this when the manufacturer uses
   * "II", "Mark II", "2nd generation", or a clearly updated model name for
   * the same focal-length / aperture combination.
   * Omit for first-generation or single-generation lenses. 
   *
   * @example 2
   */
  generation?: number;

  /**
   * Wide-end focal length in millimeters.
   * For prime lenses, this should equal {@link focalLengthMax}.
   * @example 35
   */
  focalLengthMin: number;

  /**
   * Tele-end focal length in millimeters.
   * For prime lenses, this should equal {@link focalLengthMin}.
   * @example 35
   */
  focalLengthMax: number;

  /**
   * Largest available aperture as a bare f-number (numeric value only, no
   * "f/" prefix). A smaller number means a wider aperture.
   * - Prime or constant-aperture zoom: single number (e.g. 1.4).
   * - Variable-aperture zoom: [wideEnd, teleEnd] tuple (e.g. [3.5, 6.3]).
   *
   * Source text like "F1.4", "f/1.4", "1:1.4" should all be stored as 1.4.
   *
   * Optional because some cine lenses publish only T-stop. Either this pair
   * (maxAperture+minAperture) or the T-stop pair (maxTStop+minTStop) must be
   * fully populated; both pairs together is also valid.
   *
   * @example 1.4
   * @example [3.5, 6.3]
   */
  maxAperture?: ApertureValue;

  /**
   * Smallest available aperture as a bare f-number (numeric value only, no
   * "f/" prefix). A larger number means a narrower aperture.
   * - Prime or constant-aperture zoom: single number (e.g. 16).
   * - Variable-aperture zoom: [wideEnd, teleEnd] tuple (e.g. [16, 22]).
   *
   * Same population rules as {@link maxAperture}.
   *
   * @example 16
   * @example [16, 22]
   */
  minAperture?: ApertureValue;

  /**
   * Largest available transmission stop as a bare T-number (numeric only).
   * Only populate when the source explicitly publishes T-stop data (common
   * for cine lenses). Omit for stills-only lenses that only list f-numbers.
   * - Constant T-stop: single number. Variable: [wideEnd, teleEnd] tuple.
   *
   * @example 2.9
   * @example [2.9, 4]
   */
  maxTStop?: ApertureValue;

  /**
   * Smallest available transmission stop as a bare T-number (numeric only).
   * Same population rules as maxTStop.
   * - Constant T-stop: single number. Variable: [wideEnd, teleEnd] tuple.
   *
   * @example 22
   * @example [22, 32]
   */
  minTStop?: ApertureValue;

  /**
   * Whether the lens is marketed as a cinema / motion lens (T-stop rated,
   * geared rings, standardized front diameter, etc.).
   *
   * Omit the field when the lens is a regular photo lens (do not store `false`).
   *
   * @example true
   */
  isCine?: boolean;

  /**
   * Optical / form-factor traits. Flat multi-select — every value in this
   * array is independent, with no implicit pairing or hierarchy. See
   * {@link OPTICAL_TRAITS} for the full list and per-trait definitions.
   *
   * Omit the field entirely when no traits apply (do not store an empty array).
   *
   * @example ["macro"]
   * @example ["fisheye"]
   * @example ["anamorphic"]
   * @example ["macro", "probe"]
   */
  opticalTraits?: OpticalTrait[];

  /**
   * Whether the lens supports autofocus.
   * @example true
   */
  af: boolean;

  /**
   * Whether the lens includes optical image stabilization.
   * Set to true when the source mentions OIS, IS, VC, OS, VR, "optical image stabilization",
   * "Image Stabilization", or equivalent terminology.
   *
   * @example true
   */
  ois: boolean;

  /**
   * OIS effectiveness in stops of compensation, when the source explicitly
   * states a numeric value (e.g. "6.0-stop", "5.5 stops"). Store the number only.
   * Omit when the source says OIS is present but does not quantify stops.
   *
   * @example 6
   */
  oisStops?: number;

  /**
   * Whether the lens is weather-resistant / weather-sealed.
   * - `true`     — full weather sealing; source uses WR, "Weather Resistant",
   *                "Weather Sealed", "dustproof and splash-resistant", or equivalent.
   * - `"partial"` — some environmental protection but not full sealing (e.g.
   *                dust-resistant only, splash-resistant, a subset of seals).
   *                Always add a {@link fieldNotes} entry for "wr" explaining
   *                the specific protection level in the source's own terms.
   * - `false`    — no weather protection stated.
   *
   * @example true
   * @example "partial"
   */
  wr: boolean | "partial";

  /**
   * Whether the lens has a physical aperture ring.
   * This is intentionally separate from autofocus and motor metadata.
   * @example true
   */
  apertureRing: boolean;

  /**
   * Whether the lens uses a power zoom (motorized zoom) mechanism.
   *
   * - `true` — has a motorized zoom.
   * - `false` — manual zoom ring.
   * - `"N/A"` — not applicable (prime lenses have no zoom mechanism).
   *
   * @example true
   * @example false
   * @example "N/A"
   */
  powerZoom: boolean | typeof SPEC_NA;

  /**
   * Whether the lens uses internal zoom — the overall barrel length does not
   * change when zooming.
   *
   * - `true` — barrel length stays constant across the zoom range.
   * - `false` — barrel extends or retracts during zooming.
   * - `"N/A"` — not applicable (prime lenses have no zoom mechanism).
   *
   * @example true
   * @example false
   * @example "N/A"
   */
  internalZoom: boolean | typeof SPEC_NA;

  /**
   * Brand's verbatim AF motor or actuator label, copied from the source
   * spec sheet or product page without normalization. The display layer
   * renders this string as the brand subvalue and feeds it through
   * {@link classifyFocusMotor} for the canonical class label (linear /
   * stepping / dc / other).
   *
   * **Fill only when an official source explicitly names the motor.** If
   * the brand publishes nothing about the focus drive, omit this field;
   * the agent should not infer a value from reviews or general knowledge.
   * Older Fujifilm XF / XC product pages routinely document no motor type,
   * so absence is the expected state on that generation rather than a
   * coverage gap.
   *
   * Common values seen in source material:
   * - Fujifilm: "LM" (model-name suffix on linear-motor lenses),
   *   "Stepping Motor" (older marketing wording, sometimes shortened to
   *   "STM"), "DC Motor", "DC Coreless Motor", "High-Precision Motor"
   *   (older XF / XC marketing label — surfaces as DC class with a
   *   fieldNote disambiguating it), "Triple Linear Motor" / "Quad Linear
   *   Motor" (LM lenses with multiple actuators).
   * - Sigma: "HLA" (linear), "Stepping Motor".
   * - Tamron: "RXD" (stepping), "VXD" (linear).
   * - Viltrox: "STM", "VCM", "Dual HyperVCM".
   * - Third-party APS-C brands: "STM", sometimes "STM+Lead screw" where
   *   the source spec sheet pairs the motor with its transmission
   *   mechanism.
   *
   * Manual-focus-only lenses use the sentinel `SPEC_NA` (`"N/A"`),
   * written automatically by the compute stage when `af === false`.
   * Do not use `"N/A"` to mean "data missing" — leave the field
   * undefined instead.
   *
   * @example "LM"
   * @example "HLA"
   * @example "VXD"
   * @example "DC Motor"
   * @example "N/A"
   */
  focusMotor?: string;

  /**
   * Whether the lens uses internal focusing — the overall barrel length does
   * not change and the front element does not rotate during focus.
   * This matters for video shooters (no focus breathing artifacts from length
   * change) and macro/filter users (polarizer orientation stays fixed).
   *
   * Set to true only when the source explicitly states "internal focusing" or
   * equivalent wording. Omit (undefined) when the information is not available.
   *
   * @example true
   */
  internalFocusing?: boolean;

  /**
   * Total weight of the lens body only, in grams. Exclude lens hood, caps,
   * and other detachable accessories. When the source lists multiple weights,
   * use the "body only" or "without hood" figure.
   *
   * Convert from other units if needed: 1 oz ≈ 28.35 g.
   *
   * - Single `number`: the common case.
   * - `[min, max]` tuple: use when the source gives a weight range (e.g.
   *   weight differs across mount variants or optional accessories). Always
   *   add a {@link fieldNotes} entry for "weightG" explaining what drives
   *   the range.
   *
   * @example 187
   * @example [340, 395]
   */
  weightG: number | [number, number];

  /**
   * Maximum outer diameter in millimeters.
   * @example 65
   */
  diameterMm: number;

  /**
   * Physical length of the lens body, measured from the mount flange to the
   * front of the barrel (excluding hood and caps). `mm` is the primary display
   * value; use `variants` when the source lists multiple physical states.
   *
   * @example { mm: 50.4 }
   * @example { mm: 57.2, variants: { retracted: 37.5, wide: 55.6, tele: 57.2 } }
   */
  length: LensLength;

  /**
   * Filter thread diameter in millimeters.
   * - Use the numeric diameter when the source lists a standard filter size.
   * - Use "N/A" (SPEC_NA) when the lens explicitly has no front filter thread
   *   (e.g. bulbous fisheye, rear-filter-only designs).
   * - Omit (undefined) when the information is not available in the source.
   *
   * @example 52
   * @example "N/A"
   */
  filterMm?: number | typeof SPEC_NA;

  /**
   * Minimum focus distance in normal shooting mode. `cm` is the shortest value
   * across all focal lengths (used for sorting/filtering). Use `macroCm` when
   * the source distinguishes a dedicated macro mode, and `variants` for the
   * per-focal-length breakdown of zoom lenses.
   *
   * Convert from other units: 1 m = 100 cm, 1 ft ≈ 30.48 cm.
   *
   * @example { cm: 15 }
   * @example { cm: 15, variants: { wide: 15, tele: 24 } }
   * @example { cm: 35, macroCm: 14 }
   */
  minFocusDistance?: MinFocusDistance;

  /**
   * Maximum magnification ratio. `value` is the highest across all focal
   * lengths (used for sorting/filtering). Use `variants` for the per-focal-length
   * breakdown of zoom lenses.
   *
   * Convert from common source notations:
   * - "0.15x" or "0.15 times" → 0.15
   * - "1:6.7" → 1 / 6.7 ≈ 0.149 (round to reasonable precision)
   * - "1:1" → 1.0
   * - "2:1" or "2x" → 2.0
   *
   * @example { value: 0.15 }
   * @example { value: 0.25, variants: { wide: 0.25, tele: 0.13 } }
   */
  maxMagnification?: MaxMagnification;

  /**
   * Diagonal angle of view in degrees as reported by the manufacturer.
   * - Prime: single number (e.g. 44.2).
   * - Zoom: [wideEnd, teleEnd] tuple, wide first (e.g. [86.9, 35.0]).
   *
   * Convert DMS notation (e.g. "79°55'") to decimal degrees.
   * Round to one decimal place.
   *
   * @example 44.2
   * @example [86.9, 35.0]
   */
  angleOfView?: number | [number, number];

  /**
   * Diagonal angle of view in degrees, computed from focal length via
   * 2 × arctan(sensorDiagonal / 2f) using APS-C sensor diagonal (28.3 mm).
   * Always present when focal length is known. May differ from the
   * manufacturer-reported {@link angleOfView} due to measurement methodology.
   * - Prime: single number. Zoom: [wideEnd, teleEnd] tuple.
   *
   * @example 44.2
   * @example [86.9, 35.0]
   */
  angleOfViewCalc: number | [number, number];

  /**
   * Structured optical construction data parsed from the source spec.
   * Store sourceText when you need to preserve the original wording.
   * @example { groups: 10, elements: 14, aspherical: 4, ed: 4, sourceText: "10 groups 14 elements (incl. 4 aspherical, 4 ED)" }
   */
  lensConfiguration?: LensConfiguration;

  /**
   * Number of aperture blades.
   * Use {@link SPEC_NA} for fixed-aperture lenses that have no diaphragm at
   * all (pinhole, body cap, mirror/reflex, "shaped aperture" lenses). When
   * using "N/A", add a {@link fieldNotes} entry for "apertureBladeCount"
   * explaining why the concept does not apply.
   * @example 9
   * @example "N/A"
   */
  apertureBladeCount?: number | typeof SPEC_NA;

  /**
   * Year the lens was first officially announced or released by the
   * manufacturer. When announcement and shipping years differ, prefer the
   * announcement year. Omit when the year cannot be determined.
   *
   * @example 2012
   */
  releaseYear?: number;

  /**
   * Locale-keyed search terms optimised for marketplace search engines
   * (eBay, B&H, MPB, etc.). Pipeline generates these by normalising
   * brand/model names to match how sellers actually list products.
   *
   * Front-end uses the value for the current locale to build affiliate
   * search URLs. Falls back to `brand + " " + model` when absent.
   *
   * @example { en: "7Artisans 50mm f0.95", zh: "七工匠 50mm f0.95" }
   */
  searchAliases: { en: string; zh?: string };

  /**
   * Sampled prices per market. Each market holds independent `new` (official
   * store) and `used` (secondary market) price entries — both may be present
   * and the UI renders them as separate data points.
   *
   * Markets are independent; omit a market when no price data is available.
   */
  pricing?: {
    cn?: {
      new?: LensPriceEntry[];
      used?: LensPriceEntry;
    };
    global?: {
      new?: LensPriceEntry[];
      used?: LensPriceEntry;
    };
  };

  /**
   * Mount systems this lens is available for, as stated by the manufacturer.
   * Use short canonical names to ensure consistency across all lenses:
   * "Fujifilm X", "Sony E", "Nikon Z", "Nikon F", "Canon RF", "Canon EF",
   * "Canon EF-M", "Leica L", "Micro Four Thirds".
   *
   * Omit when only a single mount is available and it is Fujifilm X (implied
   * by this being an X-mount lens database).
   *
   * @example ["Fujifilm X", "Sony E", "Nikon Z"]
   */
  compatibleMounts?: string[];

  /**
   * Accessories included with the lens as listed by the manufacturer.
   * @example ["Lens cap", "Lens hood", "Wrapping cloth"]
   */
  accessories?: string[];

  /**
   * Lens body material as described by the manufacturer.
   * @example "Aluminum alloy"
   */
  lensMaterial?: string;

  /**
   * Per-field supplementary notes for cases where the structured field value
   * does not fully capture what the source says. Keys must match field names
   * in this interface. Values are concise English sentences describing the
   * caveat, special condition, or extra context.
   *
   * **These notes are user-facing and will be displayed in the UI.**
   * Write only information that is meaningful and relevant to the end user.
   * Do not document internal pipeline details here — data source conflicts,
   * schema limitations, or derive-stage decisions belong in `derive.notes`,
   * not here.
   *
   * Only populate when the note carries information that the field value
   * itself cannot express — not as a restatement of the value.
   *
   * Fields that commonly need a note:
   * - `"wr"` when `wr` is `"partial"` — describe the specific protection level.
   * - `"weightG"` when `weightG` is a range — explain what drives the variance.
   * - `"filterMm"` when a non-standard filter attachment is required (e.g.
   *   external holder, rear gel slot).
   *
   * @example { wr: "Dust and splash resistant only; not fully sealed.", filterMm: "Requires external 72mm filter holder; no front thread." }
   */
  fieldNotes?: Partial<Record<FieldNoteKey, string>>;

  /**
   * User-facing official product links by market channel.
   * Both at least one (cn or global) must be present.
   * @example { cn: "https://www.fujifilm-x.com/zh-cn/products/lenses/xf35mmf14-r/", global: "https://www.fujifilm-x.com/en-us/products/lenses/xf35mmf14-r/" }
   */
  officialLinks: LensOfficialLinks;

  /**
   * Localized translations of user-visible free-text fields.
   * Keys are language codes; currently only "zh" is produced.
   * English values live in the top-level fields (fieldNotes, lensMaterial,
   * accessories) and serve as the fallback when a translation is absent.
   */
  translations?: { zh?: LensLocaleTranslations };

  /**
   * Calendar date (YYYY-MM-DD) when this lens first appeared in the published
   * catalog. Publish-managed bookkeeping — NOT a spec, and NOT the pipeline
   * index date (a lens can sit in the pipeline long before it is published).
   *
   * Set once when the lens is first written to lenses.json and carried forward
   * unchanged thereafter. Seeded for the existing catalog from the data file's
   * git history. Optional because it is owned by the publish stage, not by the
   * derive/review data; every published lens has it, but a hand-authored
   * fixture or a pre-backfill record may not.
   *
   * Lenses sharing a createdAt were published in the same batch, so clustering
   * by this value yields a "what was added when" changelog for free.
   *
   * @example "2026-05-03"
   */
  createdAt?: string;

  /**
   * Calendar date (YYYY-MM-DD) when this lens's spec content last changed in
   * the published catalog. Bumped at publish time only when a meaningful field
   * differs from the previously published version; pricing / searchAliases /
   * translations refreshes do not count, and structural refactor publishes can
   * suppress the bump entirely. See {@link createdAt} for the ownership and
   * seeding model.
   *
   * @example "2026-06-13"
   */
  updatedAt?: string;

}

/**
 * Returns a shallow copy of the lens with translated free-text fields
 * promoted to top-level when a matching locale exists in `translations`.
 * Falls back to the original English values for any field without a
 * translation. Pass-through when locale is "en" or has no translations.
 */
export function resolveTranslations(lens: Lens, locale: string): Lens {
  if (locale !== "zh") {
    return lens;
  }
  const zh = lens.translations?.zh;
  if (!zh) {
    return lens;
  }
  return {
    ...lens,
    ...(zh.fieldNotes && {
      fieldNotes: { ...lens.fieldNotes, ...zh.fieldNotes },
    }),
    ...(zh.lensMaterial !== undefined && { lensMaterial: zh.lensMaterial }),
    ...(zh.accessories !== undefined && { accessories: zh.accessories }),
  };
}

/**
 * Flat lens catalog stored in src/data/lenses.json.
 */
export type LensCatalog = Lens[];
