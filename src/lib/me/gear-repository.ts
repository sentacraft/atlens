import "server-only";

import type { Mount } from "@/lib/types";
import { manualLensSchema, type GearItem, type GearKind, type ManualLens } from "@/lib/me/gear-schema";

export const MAX_GEAR_ITEMS = 200;

export class GearLimitError extends Error {
  constructor() {
    super("gear_limit_reached");
    this.name = "GearLimitError";
  }
}

export type NewGearItem = Omit<GearItem, "id" | "createdAt">;

interface GearRow {
  id: string;
  kind: GearKind;
  catalog_id: string | null;
  name: string;
  brand: string;
  mount: Mount;
  manual_json: string | null;
  created_at: number;
}

function toGearItem(row: GearRow): GearItem {
  const item: GearItem = {
    id: row.id,
    kind: row.kind,
    name: row.name,
    brand: row.brand,
    mount: row.mount,
    createdAt: row.created_at,
  };
  if (row.catalog_id !== null) {
    item.catalogId = row.catalog_id;
  }
  if (row.manual_json !== null) {
    item.manual = manualLensSchema.parse(JSON.parse(row.manual_json));
  }
  return item;
}

function serializeManual(manual: ManualLens | undefined): string | null {
  return manual ? JSON.stringify(manualLensSchema.parse(manual)) : null;
}

export async function listUserGear(db: D1Database, userId: string): Promise<GearItem[]> {
  const { results } = await db
    .prepare("SELECT * FROM user_gear WHERE user_id = ? ORDER BY created_at, id")
    .bind(userId)
    .all<GearRow>();
  return results.map(toGearItem);
}

function findCatalogGear(db: D1Database, userId: string, item: NewGearItem) {
  return db
    .prepare("SELECT * FROM user_gear WHERE user_id = ? AND kind = ? AND catalog_id = ?")
    .bind(userId, item.kind, item.catalogId ?? null)
    .first<GearRow>();
}

/**
 * Adds one item and returns it. Adding a catalog item the user already owns returns
 * the existing row, so "I own this" is safe to repeat.
 */
export async function addUserGear(
  db: D1Database,
  input: { userId: string; item: NewGearItem; id?: string; now?: number },
): Promise<GearItem> {
  const { userId, item } = input;
  if (item.catalogId) {
    const existing = await findCatalogGear(db, userId, item);
    if (existing) {
      return toGearItem(existing);
    }
  }

  const count = await db
    .prepare("SELECT COUNT(*) AS n FROM user_gear WHERE user_id = ?")
    .bind(userId)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= MAX_GEAR_ITEMS) {
    throw new GearLimitError();
  }

  const id = input.id ?? crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO user_gear (id, user_id, kind, catalog_id, name, brand, mount, manual_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (user_id, kind, catalog_id) DO NOTHING`,
    )
    .bind(
      id,
      userId,
      item.kind,
      item.catalogId ?? null,
      item.name,
      item.brand,
      item.mount,
      serializeManual(item.manual),
      input.now ?? Date.now(),
    )
    .run();

  const row = item.catalogId
    ? await findCatalogGear(db, userId, item)
    : await db.prepare("SELECT * FROM user_gear WHERE id = ?").bind(id).first<GearRow>();
  if (!row) {
    throw new Error("gear_insert_failed");
  }
  return toGearItem(row);
}

/** False when the item is missing or belongs to someone else. */
export async function deleteUserGear(
  db: D1Database,
  input: { userId: string; gearId: string },
): Promise<boolean> {
  const row = await db
    .prepare("DELETE FROM user_gear WHERE id = ? AND user_id = ? RETURNING id")
    .bind(input.gearId, input.userId)
    .first<{ id: string }>();
  return row !== null;
}
