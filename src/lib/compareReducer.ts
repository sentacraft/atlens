import { MAX_COMPARE } from "./lens";
import type { Mount } from "./types";

export type CompareState = { X: string[]; G: string[] };

export type CompareAction =
  | { type: "add"; id: string; mount: Mount }
  | { type: "remove"; id: string; mount: Mount }
  | { type: "reorder"; ids: string[]; mount: Mount }
  | { type: "clear"; mount: Mount }
  | { type: "seed"; ids: string[]; mount: Mount };

// Mount-less shape the public useCompare hook accepts. The hook injects
// `mount` from the URL before forwarding to the reducer, so call sites
// don't restate something the URL already guarantees.
//
// Derived from CompareAction via distributive Omit — the `T extends any`
// trick forces TypeScript to apply Omit to each member of the union
// individually instead of merging them into a single intersection.
export type ScopedCompareAction = CompareAction extends infer A
  ? A extends { mount: Mount }
    ? Omit<A, "mount">
    : never
  : never;

export const initialCompareState: CompareState = { X: [], G: [] };

export function compareReducer(
  state: CompareState,
  action: CompareAction,
): CompareState {
  switch (action.type) {
    case "add": {
      const slot = state[action.mount];
      if (slot.includes(action.id) || slot.length >= MAX_COMPARE) {
        return state;
      }
      return { ...state, [action.mount]: [...slot, action.id] };
    }
    case "remove": {
      const slot = state[action.mount];
      if (!slot.includes(action.id)) {
        return state;
      }
      return { ...state, [action.mount]: slot.filter((x) => x !== action.id) };
    }
    case "reorder": {
      const slot = state[action.mount];
      if (
        slot.length === action.ids.length &&
        slot.every((id, i) => id === action.ids[i])
      ) {
        return state;
      }
      return { ...state, [action.mount]: action.ids };
    }
    case "clear":
      return { ...state, [action.mount]: [] };
    case "seed": {
      const next = Array.from(new Set(action.ids)).slice(0, MAX_COMPARE);
      const slot = state[action.mount];
      if (
        slot.length === next.length &&
        slot.every((id, i) => id === next[i])
      ) {
        return state;
      }
      return { ...state, [action.mount]: next };
    }
  }
}
