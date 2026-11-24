import { promoFileName, PROMO_WIDTH } from "@/lib/promo-collection";

export async function exportPromoZip(nodes: readonly HTMLElement[], slug: string, onPage: (page: number) => void) {
  const [{ rasterizePoster }, { zipSync }] = await Promise.all([import("@/lib/share-image"), import("fflate")]);
  await document.fonts.ready;
  const files: Record<string, Uint8Array> = {};
  for (const [index, node] of nodes.entries()) {
    onPage(index + 1);
    await Promise.all(Array.from(node.querySelectorAll("img"), (image) => image.decode()));
    const png = await rasterizePoster(node, { maxWidth: PROMO_WIDTH });
    files[promoFileName(slug, index + 1)] = new Uint8Array(await (await fetch(png)).arrayBuffer());
  }
  const buffer = Uint8Array.from(zipSync(files, { level: 0 })).buffer;
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/zip" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug}-xiaohongshu.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
