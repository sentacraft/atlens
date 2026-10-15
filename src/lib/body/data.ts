import bodiesData from "@/data/bodies.json";
import { bodyCatalogSchema, type Body } from "@/lib/body/schema";

const catalog = bodyCatalogSchema.parse(bodiesData);

export const bodies: readonly Body[] = catalog.bodies;

const byId = new Map(bodies.map((body) => [body.id, body]));

export function getBodyById(id: string): Body | undefined {
  return byId.get(id);
}
