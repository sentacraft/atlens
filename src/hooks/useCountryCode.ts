import { useSyncExternalStore } from "react";

const COOKIE_NAME = "xg_country";
const DEFAULT_COUNTRY = "US";

function getSnapshot(): string {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`),
  );
  return match?.[1] ?? DEFAULT_COUNTRY;
}

function getServerSnapshot(): string {
  return DEFAULT_COUNTRY;
}

function subscribe(_cb: () => void): () => void {
  return () => {};
}

export function useCountryCode(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
