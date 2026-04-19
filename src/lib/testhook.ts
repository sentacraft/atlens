import type { ReadonlyURLSearchParams } from "next/navigation";

// -- Constants ----------------------------------------------------------------

export const TESTHOOK_QUERY_KEYS = {
  testHook: "testhook",
} as const;

export const TESTHOOK_ALLOWED = process.env.NODE_ENV !== "production";

// -- Types --------------------------------------------------------------------

interface TestHookOptionValueDefinition {
  id: string;
  label: string;
  description: string;
  css?: string;
}

interface TestHookOptionDefinition {
  key: string;
  label: string;
  description: string;
  values: readonly TestHookOptionValueDefinition[];
  defaultValue?: string;
}

export interface TestHookState {
  testHook: boolean;
  options: Record<string, string>;
}

// -- Option CSS ---------------------------------------------------------------

const CSS_CARD_CHROME_BARE = `
[data-ui-hook="card"] {
  border-color: transparent !important;
  box-shadow: none !important;
}

[data-ui-hook="card"][class*="border-zinc-900"] {
  border-color: rgb(24 24 27) !important;
  box-shadow: 0 0 0 1px rgb(24 24 27) !important;
}
`;

const CSS_CARD_DENSITY_COMPACT = `
[data-ui-hook="cardMedia"] {
  aspect-ratio: 1.55 / 1 !important;
}

[data-ui-hook="cardMediaInner"] {
  padding: 1rem !important;
}

[data-ui-hook="cardBody"] {
  gap: 0.5rem !important;
  padding: 0.75rem !important;
}

[data-ui-hook="cardBody"] > :first-child {
  gap: 0.25rem !important;
}

[data-ui-hook="cardBody"] h3 {
  min-height: 2.1rem !important;
  font-size: 0.875rem !important;
  line-height: 1.25rem !important;
}

[data-ui-hook="cardBody"] dl {
  row-gap: 0.125rem !important;
}

[data-ui-hook="cardFooter"] {
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  padding-bottom: 0.75rem !important;
}

[data-ui-hook="cardFooter"] button {
  padding-top: 0.375rem !important;
  padding-bottom: 0.375rem !important;
}
`;

const CSS_GRID_DENSITY_COMFORTABLE = `
[data-ui-hook="grid"] {
  gap: 1.25rem !important;
}

@media (min-width: 640px) {
  [data-ui-hook="grid"] {
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)) !important;
  }
}
`;

const CSS_GRID_DENSITY_TIGHT = `
[data-ui-hook="grid"] {
  gap: 0.75rem !important;
}

@media (min-width: 640px) {
  [data-ui-hook="grid"] {
    grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)) !important;
  }
}

@media (min-width: 1280px) {
  [data-ui-hook="grid"] {
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)) !important;
  }
}
`;

// -- Option definitions -------------------------------------------------------

export const TESTHOOK_OPTION_DEFINITIONS: readonly TestHookOptionDefinition[] = [
  {
    key: "lensCardChrome",
    label: "Lens Card Chrome",
    description: "Control border and shadow treatment on the Lenses page cards.",
    defaultValue: "default",
    values: [
      {
        id: "default",
        label: "Default",
        description: "Keep the current framed card treatment.",
      },
      {
        id: "bare",
        label: "Bare",
        description: "Remove the default border and shadow from each card.",
        css: CSS_CARD_CHROME_BARE,
      },
    ],
  },
  {
    key: "lensCardDensity",
    label: "Lens Card Density",
    description: "Adjust thumbnail height and text block compactness on the Lenses page cards.",
    defaultValue: "default",
    values: [
      {
        id: "default",
        label: "Default",
        description: "Keep the current card proportions.",
      },
      {
        id: "compact",
        label: "Compact",
        description: "Reduce media height and tighten the text section.",
        css: CSS_CARD_DENSITY_COMPACT,
      },
    ],
  },
  {
    key: "lensGridDensity",
    label: "Lens Grid Density",
    description: "Adjust card spacing and how densely the card grid packs on the Lenses page.",
    defaultValue: "default",
    values: [
      {
        id: "default",
        label: "Default",
        description: "Keep the current gap and breakpoint-driven grid.",
      },
      {
        id: "comfortable",
        label: "Comfortable",
        description: "Use larger gaps and slightly wider cards.",
        css: CSS_GRID_DENSITY_COMFORTABLE,
      },
      {
        id: "tight",
        label: "Tight",
        description: "Use tighter gaps and pack more cards per row when space allows.",
        css: CSS_GRID_DENSITY_TIGHT,
      },
    ],
  },
];

// -- State helpers ------------------------------------------------------------

export function getDefaultTestHookState(): TestHookState {
  const options = Object.fromEntries(
    TESTHOOK_OPTION_DEFINITIONS.flatMap((option) =>
      option.defaultValue ? [[option.key, option.defaultValue]] : []
    )
  );

  return { testHook: false, options };
}

export function parseTestHookState(
  input: URLSearchParams | ReadonlyURLSearchParams
): TestHookState {
  const defaults = getDefaultTestHookState();
  const options = { ...defaults.options };

  for (const option of TESTHOOK_OPTION_DEFINITIONS) {
    const candidate = input.get(option.key);
    if (candidate && option.values.some((v) => v.id === candidate)) {
      options[option.key] = candidate;
    }
  }

  return {
    testHook: input.get(TESTHOOK_QUERY_KEYS.testHook) === "1",
    options,
  };
}

// -- DOM helpers --------------------------------------------------------------

export function resolveTestHookCss(state: TestHookState): string {
  return TESTHOOK_OPTION_DEFINITIONS.flatMap((option) => {
    const value = option.values.find((v) => v.id === state.options[option.key]);
    return value?.css ? [value.css] : [];
  }).join("\n");
}

export function buildTestHookSearchParams(
  current: URLSearchParams,
  state: TestHookState
): URLSearchParams {
  const next = new URLSearchParams(current.toString());

  if (!state.testHook) {
    next.delete(TESTHOOK_QUERY_KEYS.testHook);
    for (const option of TESTHOOK_OPTION_DEFINITIONS) {
      next.delete(option.key);
    }
    return next;
  }

  next.set(TESTHOOK_QUERY_KEYS.testHook, "1");

  for (const option of TESTHOOK_OPTION_DEFINITIONS) {
    const value = state.options[option.key];
    if (!value || value === option.defaultValue) {
      next.delete(option.key);
    } else {
      next.set(option.key, value);
    }
  }

  return next;
}
