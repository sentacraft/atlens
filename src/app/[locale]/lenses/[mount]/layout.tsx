import { notFound } from "next/navigation";
import { urlSegmentToMount } from "@/lib/mount";

export function generateStaticParams() {
  return [{ mount: "x" }, { mount: "gfx" }];
}

export default async function MountLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string; mount: string }>;
  children: React.ReactNode;
}) {
  const { mount } = await params;
  if (!urlSegmentToMount(mount)) notFound();
  return <>{children}</>;
}
