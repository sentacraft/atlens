import { notFound } from "next/navigation";
import { urlSegmentToMount } from "@/lib/mount";
import type { MountSegment } from "@/lib/mount";
import MountSwitcher from "@/components/MountSwitcher";

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

  return (
    <div className="flex flex-col min-h-screen">
      <MountSwitcher currentMount={mount as MountSegment} />
      {children}
    </div>
  );
}
