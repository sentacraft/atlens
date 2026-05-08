import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-32 text-center">
      <h1 className="text-6xl font-bold text-zinc-200 dark:text-zinc-800 font-heading">
        404
      </h1>
      <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        {t("title")}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
        {t("description")}
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {t("home")}
      </Link>
    </div>
  );
}
