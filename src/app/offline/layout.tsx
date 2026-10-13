import type { Metadata } from "next";
import { fontClassName } from "../fonts";
import "../globals.css";

// Its own <html> and hardcoded English: the service worker serves it when the network fails.
export const metadata: Metadata = {
  title: "Offline | Atlens",
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
