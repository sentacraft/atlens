import Link from "next/link";
import { ADMIN_ANALYTICS_PATH } from "@/lib/url/routes";

const MODULES = [
  {
    href: ADMIN_ANALYTICS_PATH,
    title: "Analytics",
    description: "Product events and Ask Iris turn metrics for the last 30 days.",
  },
];

export default function AdminIndex() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="font-heading text-3xl font-bold text-zinc-900">Admin</h1>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {MODULES.map((module) => (
          <li key={module.href}>
            <Link
              href={module.href}
              className="block rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-zinc-400"
            >
              <h2 className="font-heading text-base font-semibold text-zinc-900">{module.title}</h2>
              <p className="mt-1 text-sm text-zinc-500">{module.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
