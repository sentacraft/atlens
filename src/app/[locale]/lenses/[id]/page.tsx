import { redirect } from "next/navigation";

export default async function LegacyLensDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/lenses/x/${id}`);
}
