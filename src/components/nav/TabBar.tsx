"use client";

import { useEffect, useState } from "react";
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
import { ASK_IRIS_PATH, PROFILE_PATH } from "@/lib/url/routes";
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

// Fields that raise the on-screen keyboard; checkboxes and the like do not.
const TEXT_FIELD = "input:not([type=checkbox],[type=radio],[type=button],[type=submit],[type=reset],[type=range],[type=file]), textarea, [contenteditable='true'], [contenteditable='']";

function isTextField(target: EventTarget | null) {
  return target instanceof Element && target.matches(TEXT_FIELD);
}

// A keyboard takes far more than browser toolbars do; this tells the two apart.
const KEYBOARD_MIN_PX = 150;

/**
 * Whether the on-screen keyboard is up for a text field: one has focus and the visible viewport
 * has shrunk. iOS 26 Safari lifts fixed elements by the keyboard's height (WebKit bug 297779),
 * which put the tab bar over the focused field. Focus alone is not enough: an autofocused field
 * raises no keyboard.
 */
function useKeyboardUp() {
  const [up, setUp] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    let field: EventTarget | null = document.activeElement;
    const update = () => {
      const shrunk = !viewport || window.innerHeight - viewport.height > KEYBOARD_MIN_PX;
      setUp(isTextField(field) && shrunk);
    };
    const onFocusIn = (event: FocusEvent) => {
      field = event.target;
      update();
    };
    const onFocusOut = (event: FocusEvent) => {
      field = event.relatedTarget;
      update();
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    viewport?.addEventListener("resize", update);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      viewport?.removeEventListener("resize", update);
    };
  }, []);
  return up;
}

/** The site's sections on phones, fixed to the bottom below the sm breakpoint; `--tab-bar-height` is its height. */
export default function TabBar() {
  const t = useTranslations("Nav");
  const { section, browseHref, chartsHref } = useNavLinks();
  const { openIris } = useIris();
  const keyboardUp = useKeyboardUp();

  return (
    <nav
      aria-label={t("tabBar")}
      hidden={keyboardUp}
      className={cn(
        "fixed inset-x-0 bottom-0 grid h-[var(--tab-bar-height)] grid-cols-4 border-t border-zinc-200 bg-white pb-[var(--safe-inset-bottom)] sm:hidden",
        Z.shell,
      )}
    >
      <Link
        href={browseHref}
        aria-current={section === "lenses" ? "page" : undefined}
        onClick={() => trackTab("lenses")}
        className={itemCls(section === "lenses")}
      >
        <LayoutGrid className="size-5" aria-hidden="true" />
        {t("lenses")}
      </Link>
      <Link
        href={chartsHref}
        aria-current={section === "charts" ? "page" : undefined}
        onClick={() => trackTab("charts")}
        className={itemCls(section === "charts")}
      >
        <ChartColumn className="size-5" aria-hidden="true" />
        {t("charts")}
      </Link>
      <Link
        href={ASK_IRIS_PATH}
        aria-current={section === "iris" ? "page" : undefined}
        onClick={(event) => {
          trackTab("iris");
          // openIris adds the page left behind, which picks Iris's first example questions.
          event.preventDefault();
          if (section !== "iris") {
            openIris({ from: "tab_bar" });
          }
        }}
        className={cn(itemCls(section === "iris"), "relative")}
      >
        <Iris config={IRIS_TAB_BAR} uid="tab-bar" size={20} />
        {t("askIris")}
        <AiTag className="absolute top-[7px] left-[calc(50%+0.75rem)] ring-2 ring-white" />
      </Link>
      <Link
        href={PROFILE_PATH}
        aria-current={section === "me" ? "page" : undefined}
        onClick={() => trackTab("profile")}
        className={itemCls(section === "me")}
      >
        <UserRound className="size-5" aria-hidden="true" />
        {t("me")}
      </Link>
    </nav>
  );
}
