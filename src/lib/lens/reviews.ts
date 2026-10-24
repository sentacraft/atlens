/**
 * What published reviews say about a lens, as stored in the `lens_reviews` table of `CATALOG_DB`.
 * The data pipeline writes these rows; Ask Iris reads them. Each claim is written in our own words
 * and cites the reviews it rests on.
 */

/**
 * What a claim is about. Values that are not self-explanatory:
 * - `resolution_center` / `resolution_edge`: sharpness in the middle / outer frame and corners.
 * - `field_curvature`: the plane of focus bows, so flat subjects are sharp in the centre or the edges but not both.
 * - `coma`, `astigmatism`: point lights smeared into wings or lines, mostly at the frame edge (astro, night).
 * - `focus_shift`: focus moves when stopping down after focusing wide open.
 * - `focus_breathing`: framing changes as focus distance changes (video).
 * - `sunstar`: the rays drawn from point lights when stopped down.
 * - `handling`: controls and how it sits and operates on the camera (rings, switches, balance, behaviour on attach).
 * - `compatibility`: works or fails with particular bodies, firmware, adapters or accessories.
 * - `close_focus`: minimum focus distance and magnification in practice.
 * - `sample_variation`: copy-to-copy differences, decentering, quality control.
 * - `color`: rendering, contrast and colour cast, not chromatic aberration.
 * - `award`: a prize or editor's choice the reviewer gave or reports.
 * - `overall`: the reviewer's summary verdict on the lens as a whole.
 */
export const REVIEW_ASPECTS = [
  "resolution_center", "resolution_edge", "field_curvature", "distortion", "vignetting", "chromatic_aberration",
  "bokeh", "flare", "sunstar", "coma", "astigmatism", "focus_shift", "autofocus", "manual_focus", "focus_breathing",
  "stabilization", "build", "weather_sealing", "handling", "size_weight", "close_focus", "compatibility",
  "sample_variation", "color", "award", "overall",
] as const;
export type ReviewAspect = (typeof REVIEW_ASPECTS)[number];

/**
 * How the reviewer reached the findings:
 * - `measured`: test charts or instruments with numbers (resolution charts, distortion %, vignetting in stops).
 * - `hands_on`: shooting impressions without a standardized measurement.
 * On measurable aspects (resolution, distortion, vignetting, chromatic aberration, focus breathing) a `measured`
 * source outranks `hands_on` ones.
 */
export const REVIEW_KINDS = ["measured", "hands_on"] as const;

/** Whether the reviewed copy was a shipping lens or a pre-production sample. */
export const REVIEW_SAMPLES = ["production", "pre-production"] as const;

/**
 * The reviewer's tie to the maker or seller, as the review discloses it (affiliate links do not count):
 * - `independent`: bought or borrowed with no tie.
 * - `loaned`: lent by the maker, a distributor or a retailer for the review.
 * - `brand_partner`: sponsored, ambassador or other paid relationship with the brand.
 */
export const REVIEW_AFFILIATIONS = ["independent", "loaned", "brand_partner"] as const;

/** Whether the finding counts for (`positive`) or against (`negative`) the lens, or both (`mixed`). */
export const REVIEW_POLARITIES = ["positive", "negative", "mixed"] as const;

/**
 * How the cited sources relate:
 * - `consensus`: two or more sources, at least two without a brand partnership, say the same thing.
 * - `single_source`: only one source says it.
 * - `conflict`: sources disagree and nothing in their test setups explains it; the claim text says who said what.
 * - `basis_differs`: sources disagree because they tested differently (RAW vs in-camera JPEG, sensor resolution,
 *   body generation, firmware); `basis` says how each tested.
 */
export const REVIEW_AGREEMENTS = ["consensus", "single_source", "conflict", "basis_differs"] as const;

/**
 * Why a source's body- or firmware-dependent finding may not hold on current bodies:
 * - `pre_x_trans_iv_body`: every body it used predates X-Trans IV (X-T3), whose autofocus and firmware differ.
 * - `pre_production`: it reviewed a pre-production sample.
 * - `unknown_body`: it does not say which body it used.
 */
export const STALENESS_REASONS = ["pre_x_trans_iv_body", "pre_production", "unknown_body"] as const;

/** One published review that a lens's claims cite. */
export interface LensReviewSource {
  /**
   * Short handle, unique within the lens, that claims cite. Carries no meaning.
   * @example "ol"
   */
  id: string;
  url: string;
  /**
   * Display name of the site or channel.
   * @example "OpticalLimits"
   */
  site: string;
  /**
   * Language of the review, BCP 47.
   * @example "en"
   */
  lang: string;
  kind: (typeof REVIEW_KINDS)[number];
  /**
   * Mount of the lens copy reviewed: `X` for Fujifilm X, otherwise another mount's version of the same lens.
   * Absent means `X`.
   * @example "E"
   */
  mountTested?: string;
  /**
   * Camera bodies the review used. Absent when the review does not say.
   * @example ["X-T5"]
   */
  bodies?: string[];
  /**
   * Sensor resolutions of the test bodies in megapixels; sharpness findings are relative to them.
   * @example [26, 40]
   */
  testMegapixels?: number[];
  /**
   * Publication date, `YYYY-MM` or `YYYY-MM-DD`.
   * @example "2024-12"
   */
  published?: string;
  /** Absent when the review does not say. */
  sample?: (typeof REVIEW_SAMPLES)[number];
  /** Absent when the review does not say. */
  affiliation?: (typeof REVIEW_AFFILIATIONS)[number];
  /** The outlet that published it. Reviews from the same outlet count as one outlet. */
  publisher?: string;
}

/** A source behind a body- or firmware-dependent claim whose finding may not hold on current bodies. */
export interface StaleSource {
  id: string;
  reason: (typeof STALENESS_REASONS)[number];
  bodies?: string[];
  published?: string;
}

/** One finding about one aspect of a lens. */
export interface LensReviewClaim {
  aspect: ReviewAspect;
  polarity: (typeof REVIEW_POLARITIES)[number];
  agreement: (typeof REVIEW_AGREEMENTS)[number];
  /**
   * The core finding, limited to what every source in `sources` says.
   * @example "Strong vignetting wide open."
   */
  text: string;
  /**
   * How each source tested, when that explains a difference or qualifies a number.
   * @example "Kok: 40MP X-T5; Radojuva: 24MP X-T2"
   */
  basis?: string;
  /** Ids of the sources behind `text`. */
  sources: string[];
  /** Number of reviews behind `text`. */
  reviewCount: number;
  /** Number of distinct publishers behind `text`; lower than `reviewCount` when one outlet ran several reviews. */
  outletCount: number;
  /** Findings only one source reports (numbers, comparisons with other lenses, hit rates). */
  details?: { id: string; text: string }[];
  /** Set when only other-mount reviews cover a mount-dependent aspect; reference only for X mount. */
  otherMount?: boolean;
  /** Sources, core or detail, tested in conditions that may not match current bodies. Only on body-dependent aspects. */
  staleness?: StaleSource[];
}
