// Minimal layout for the admin section. No i18n, no nav — gated by
// Cloudflare Access in production (see PR description for setup).
// Shares the main site's font stack (Geist Sans + Source Serif 4) via
// the exported fontClassName so admin looks of-a-piece with the product.

import { fontClassName } from "../fonts";
import "../globals.css";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassName}>
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
