import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Type guard for "is this string one of a fixed set of literals". Widens the
 * readonly literal array so `.includes` accepts a plain string, and narrows
 * `value` to the element union on the true branch — so callers drop both the
 * `as readonly string[]` assertion and the post-check cast.
 */
export function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}
