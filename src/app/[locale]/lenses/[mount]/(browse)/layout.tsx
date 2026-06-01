import CompareBar from "@/components/CompareBar";
import { getLensesByMount } from "@/lib/lens-data";
import { urlSegmentToMount } from "@/lib/mount";

export default async function BrowseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; mount: string }>;
}) {
  const { locale, mount } = await params;
  const resolvedMount = urlSegmentToMount(mount);
  const allLenses = resolvedMount ? getLensesByMount(resolvedMount, locale) : [];

  return (
    <>
      {children}
      <CompareBar allLenses={allLenses} />
    </>
  );
}
