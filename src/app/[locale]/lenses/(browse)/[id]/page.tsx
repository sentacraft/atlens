import { redirect } from "next/navigation";

export default async function LegacyLensDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/lenses/x/${id}`);
}
