// Minimal layout for the admin section. No i18n, no nav — gated by
// Cloudflare Access in production (see PR description for setup).
// Shares the main site's font stack (Geist Sans + Source Serif 4) via
// the exported fontClassName so admin looks of-a-piece with the product.

import { cookies } from "next/headers";
import { fontClassName } from "../fonts";
import "../globals.css";

const INTERNAL_COOKIE = "xg_internal";
const ONE_YEAR = 60 * 60 * 24 * 365;

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!jar.has(INTERNAL_COOKIE)) {
    jar.set(INTERNAL_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONE_YEAR,
    });
  }

  return (
    <html lang="en" className={fontClassName}>
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        {children}
      </body>
    </html>
  );
}
