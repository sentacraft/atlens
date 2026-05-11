import type { Metadata } from "next";
import { fontClassName } from "../fonts";
import "../globals.css";

// Standalone layout for /offline so this route can render its own <html>/<body>
// independently of the [locale] tree. Hardcoded English: this page is served
// by the service worker as a network-fail fallback and must not depend on
// locale resolution or next-intl.
export const metadata: Metadata = {
  title: "Offline | X-Glass",
};

export default function OfflineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontClassName}>
      <body>{children}</body>
    </html>
  );
}
