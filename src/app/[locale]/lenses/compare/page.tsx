import { redirect } from "next/navigation";

export default async function CompareRedirect({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string; from?: string; lensId?: string; preset?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.ids) qs.set("ids", sp.ids);
  if (sp.from) qs.set("from", sp.from);
  if (sp.lensId) qs.set("lensId", sp.lensId);
  if (sp.preset) qs.set("preset", sp.preset);
  const query = qs.toString();
  redirect(`/lenses/x/compare${query ? `?${query}` : ""}`);
}
