import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isOneOf<T extends string>(value: string, options: readonly T[]): value is T {
  return (options as readonly string[]).includes(value);
}

export function parsePositiveDecimal(value: string | null): number | null {
  if (!value || !/^\d+(?:[.,]\d+)?(?:e[+-]?\d+)?$/i.test(value)) {
    return null;
  }
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : null;
}
