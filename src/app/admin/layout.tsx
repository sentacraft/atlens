// Gated by Cloudflare Access in production.

import { fontClassName } from "../fonts";
import "../globals.css";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassName}>
      <body className="bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}
