// Minimal layout for the admin section. No i18n, no nav — gated by
// Cloudflare Access in production (see PR description for setup).

import "../globals.css";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 antialiased">
        {children}
      </body>
    </html>
  );
}
