import "server-only";

import type { Mount } from "@/lib/types";
import type { GearItem, GearKind, ManualLens } from "@/lib/me/gear-schema";

export const MAX_GEAR_ITEMS = 200;

export class GearLimitError extends Error {
  constructor() {
    super("gear_limit_reached");
    this.name = "GearLimitError";
  }
}

/** A row ready to insert: a catalog item, or a manual lens entry. */
export interface NewGearItem {
  kind: GearKind;
  catalogId?: string;
  name: string;
  brand: string;
  mount: Mount;
  manual?: ManualLens;
}

interface GearRow {
  id: string;
  kind: GearKind;
  catalog_id: string | null;
  name: string;
  brand: string;
  mount: Mount;
  model: string | null;
  focal_min_mm: number | null;
  focal_max_mm: number | null;
  max_aperture_wide: number | null;
  max_aperture_tele: number | null;
  autofocus: number | null;
  ois: number | null;
  adapted: number | null;
  original_mount: string | null;
  weather_resistant: number | null;
  aperture_ring: number | null;
  power_zoom: number | null;
  internal_zoom: number | null;
  optical_traits: string | null;
  usage: ManualLens["usage"] | null;
  focus_motor: ManualLens["focusMotor"] | null;
  weight_g: number | null;
  notes: string | null;
  created_at: number;
}

function boolColumn(value: boolean | undefined): number | null {
  return value === undefined ? null : Number(value);
}

function boolField(value: number | null): boolean | undefined {
  return value === null ? undefined : value === 1;
}

function definedOnly<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function toManualLens(row: GearRow): ManualLens {
  return definedOnly({
    brand: row.brand,
    model: row.model ?? row.name,
    mount: row.mount,
    focalMinMm: row.focal_min_mm ?? 0,
    focalMaxMm: row.focal_max_mm ?? 0,
    maxApertureWide: row.max_aperture_wide ?? undefined,
    maxApertureTele: row.max_aperture_tele ?? undefined,
    autofocus: boolField(row.autofocus),
    ois: boolField(row.ois),
    adapted: boolField(row.adapted),
    originalMount: row.original_mount ?? undefined,
    weatherResistant: boolField(row.weather_resistant),
    apertureRing: boolField(row.aperture_ring),
    powerZoom: boolField(row.power_zoom),
    internalZoom: boolField(row.internal_zoom),
    opticalTraits: row.optical_traits ? (JSON.parse(row.optical_traits) as ManualLens["opticalTraits"]) : undefined,
    usage: row.usage ?? undefined,
    focusMotor: row.focus_motor ?? undefined,
    weightG: row.weight_g ?? undefined,
    notes: row.notes ?? undefined,
  });
}

function toGearItem(row: GearRow): GearItem {
  return definedOnly({
    id: row.id,
    kind: row.kind,
    catalogId: row.catalog_id ?? undefined,
    name: row.name,
    brand: row.brand,
    mount: row.mount,
    manual: row.catalog_id === null ? toManualLens(row) : undefined,
    createdAt: row.created_at,
  });
}

export async function listUserGear(db: D1Database, userId: string): Promise<GearItem[]> {
  const { results } = await db
    .prepare("SELECT * FROM user_gear WHERE user_id = ? ORDER BY created_at, id")
    .bind(userId)
    .all<GearRow>();
  return results.map(toGearItem);
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
    const existing = await db
      .prepare("SELECT * FROM user_gear WHERE user_id = ? AND kind = ? AND catalog_id = ?")
      .bind(userId, item.kind, item.catalogId)
      .first<GearRow>();
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
  const manual = item.manual;
  await db
    .prepare(
      `INSERT INTO user_gear (
        id, user_id, kind, catalog_id, name, brand, mount, model,
        focal_min_mm, focal_max_mm, max_aperture_wide, max_aperture_tele,
        autofocus, ois, adapted, original_mount, weather_resistant, aperture_ring,
        power_zoom, internal_zoom, optical_traits, usage, focus_motor, weight_g, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      manual?.model ?? null,
      manual?.focalMinMm ?? null,
      manual?.focalMaxMm ?? null,
      manual?.maxApertureWide ?? null,
      manual?.maxApertureTele ?? null,
      boolColumn(manual?.autofocus),
      boolColumn(manual?.ois),
      boolColumn(manual?.adapted),
      manual?.originalMount ?? null,
      boolColumn(manual?.weatherResistant),
      boolColumn(manual?.apertureRing),
      boolColumn(manual?.powerZoom),
      boolColumn(manual?.internalZoom),
      manual?.opticalTraits ? JSON.stringify(manual.opticalTraits) : null,
      manual?.usage ?? null,
      manual?.focusMotor ?? null,
      manual?.weightG ?? null,
      manual?.notes || null,
      input.now ?? Date.now(),
    )
    .run();

  const row = item.catalogId
    ? await db
        .prepare("SELECT * FROM user_gear WHERE user_id = ? AND kind = ? AND catalog_id = ?")
        .bind(userId, item.kind, item.catalogId)
        .first<GearRow>()
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
