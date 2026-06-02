// Shared feedback types. Kept in lib (not a component) so both the form/dialog
// components and the server-side field reconstruction can import them without
// creating a component → lib cycle.

export type FeedbackType = "data_issue" | "general";

export interface FeedbackField {
  /** The label exactly as shown on the page, used both as display text and issue payload. */
  label: string;
  /** Current display value for this field on this lens, shown read-only after selection. */
  currentValue?: string;
  /** Group label for the dropdown. Fields with the same group are rendered together. */
  group?: string;
  /** When true, the current value is not shown to the user (e.g. internal image paths). */
  hideCurrentValue?: boolean;
}

export interface FeedbackContext {
  lensId?: string;
  lensModel?: string;
  lensBrand?: string;
  searchQuery?: string;
  field?: string;
}
