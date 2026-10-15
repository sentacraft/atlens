import bodiesData from "@/data/bodies.json";
import { bodyCatalogSchema, type Body } from "@/lib/body/schema";
import { normalizeLensSearchText } from "@/lib/lens/search";

const catalog = bodyCatalogSchema.parse(bodiesData);

export const bodies: readonly Body[] = catalog.bodies;

const byId = new Map(bodies.map((body) => [body.id, body]));

export function getBodyById(id: string): Body | undefined {
  return byId.get(id);
}

function bodyKey(text: string): string {
  return normalizeLensSearchText(text).replace(/ /g, "");
}

/**
 * Bodies whose name or an alias contains the query, ignoring case, spaces and hyphens;
 * exact matches first, then catalog order.
 */
export function searchBodies(query: string): Body[] {
  const key = bodyKey(query);
  if (!key) {
    return [...bodies];
  }
  const keys = (body: Body) => [body.name, ...(body.aliases ?? [])].map(bodyKey);
  const matches = bodies.filter((body) => keys(body).some((name) => name.includes(key)));
  const exact = (body: Body) => (keys(body).includes(key) ? 0 : 1);
  return matches.sort((a, b) => exact(a) - exact(b));
}
