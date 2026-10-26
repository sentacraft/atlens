"use client";

import { useTranslations } from "next-intl";
import { ChartColumn, LayoutGrid, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Iris from "@/components/iris/Iris";
import AiTag from "@/components/iris/AiTag";
import { IRIS_TAB_BAR } from "@/config/iris-config";
import { Z } from "@/config/ui";
import { useIris } from "@/context/IrisPanelProvider";
import { useNavLinks } from "@/hooks/useNavLinks";
import { track } from "@/lib/analytics/analytics";
import { PROFILE_PATH } from "@/lib/url/routes";
import { cn } from "@/lib/utils";

function itemCls(current: boolean) {
  return cn(
    "flex flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors",
    current ? "font-semibold text-zinc-900" : "font-medium text-zinc-500 hover:text-zinc-900",
  );
}

function trackTab(item: string) {
  track("nav_click", { item, place: "tab_bar" });
}

/** The site's sections on phones, fixed to the bottom below the sm breakpoint; `--tab-bar-height` is its height. */
export default function TabBar() {
  const t = useTranslations("Nav");
  const { section, browseHref, chartsHref } = useNavLinks();
  const { openIris, closeIris, irisShown } = useIris();
  const irisCurrent = irisShown || section === "iris";

  // Iris covers the page; its section's tab closes it, where following the link would go nowhere.
  function onSectionClick(event: React.MouseEvent, item: string, current: boolean) {
    trackTab(item);
    if (irisShown && current) {
      event.preventDefault();
      closeIris();
    }
  }

  return (
    <nav
      aria-label={t("tabBar")}
      className={cn(
        "fixed inset-x-0 bottom-0 grid h-[var(--tab-bar-height)] grid-cols-4 border-t border-zinc-200 bg-white pb-[var(--safe-inset-bottom)] sm:hidden",
        Z.shell,
      )}
    >
      <Link
        href={browseHref}
        aria-current={section === "lenses" && !irisShown ? "page" : undefined}
        onClick={(event) => onSectionClick(event, "lenses", section === "lenses")}
        className={itemCls(section === "lenses" && !irisShown)}
      >
        <LayoutGrid className="size-5" aria-hidden="true" />
        {t("lenses")}
      </Link>
      <Link
        href={chartsHref}
        aria-current={section === "charts" && !irisShown ? "page" : undefined}
        onClick={(event) => onSectionClick(event, "charts", section === "charts")}
        className={itemCls(section === "charts" && !irisShown)}
      >
        <ChartColumn className="size-5" aria-hidden="true" />
        {t("charts")}
      </Link>
      <button
        type="button"
        aria-pressed={irisShown}
        onClick={() => {
          trackTab("iris");
          if (irisShown) {
            closeIris();
          } else {
            openIris({ from: "tab_bar" });
          }
        }}
        className={cn(itemCls(irisCurrent), "relative")}
      >
        <Iris config={IRIS_TAB_BAR} uid="tab-bar" size={20} />
        {t("askIris")}
        <AiTag className="absolute top-[7px] left-[calc(50%+0.75rem)] ring-2 ring-white" />
      </button>
      <Link
        href={PROFILE_PATH}
        aria-current={section === "me" && !irisShown ? "page" : undefined}
        onClick={(event) => onSectionClick(event, "profile", section === "me")}
        className={itemCls(section === "me" && !irisShown)}
      >
        <UserRound className="size-5" aria-hidden="true" />
        {t("me")}
      </Link>
    </nav>
  );
}
