"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffectiveMount } from "@/hooks/useMountParam";
import { mountHasCharts } from "@/lib/mount";
import { browsePath, chartsPath, navSection } from "@/lib/url/routes";

/** The section links the header and the phone tab bar share, and which section is current. */
export function useNavLinks() {
  const pathname = usePathname();
  const mount = useEffectiveMount();
  return {
    section: navSection(pathname),
    browseHref: browsePath(mount),
    chartsHref: chartsPath(mountHasCharts(mount) ? mount : "X"),
  };
}
