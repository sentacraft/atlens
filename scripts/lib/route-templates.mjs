/**
 * Picks one path per route template and locale/mount from a build's prerender manifest; the rest
 * share its code. Paths the manifest does not know (dynamic or unlisted) are all kept.
 */
export function oneEachTemplate(paths, manifest) {
  const seen = new Set();
  const picked = [];
  for (const path of paths.slice().sort()) {
    const template = manifest.routes[path]?.srcRoute;
    if (!template) {
      picked.push(path);
      continue;
    }
    const pathParts = path.split("/");
    const templateParts = template.split("/");
    const dynamic = templateParts.flatMap((part, i) => (part.startsWith("[") ? [i] : []));
    const last = templateParts.length - 1;
    const key = templateParts
      .map((part, i) => (part.startsWith("[") && !(i === last && dynamic.length > 1) ? pathParts[i] : part))
      .join("/");
    if (!seen.has(key)) {
      seen.add(key);
      picked.push(path);
    }
  }
  return picked;
}
