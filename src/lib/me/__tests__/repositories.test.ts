import { beforeEach, describe, expect, it } from "vitest";
import type { DatabaseSync } from "node:sqlite";
import { createSqliteD1 } from "../../__tests__/support/sqlite-d1";
import {
  addUserFavorite,
  FavoritesLimitError,
  listUserFavorites,
  MAX_FAVORITES,
  removeUserFavorite,
} from "../favorites-repository";
import {
  addUserGear,
  deleteUserGear,
  GearLimitError,
  listUserGear,
  MAX_GEAR_ITEMS,
  type NewGearItem,
} from "../gear-repository";
import { getUserSettings, updateUserSettings } from "../settings-repository";

let db: D1Database;
let sqlite: DatabaseSync;

beforeEach(() => {
  ({ d1: db, sqlite } = createSqliteD1("migrations/app"));
  for (const id of ["owner", "stranger"]) {
    sqlite
      .prepare("INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES (?, ?, ?, 0, 0)")
      .run(id, id, `${id}@example.test`);
  }
});

const body: NewGearItem = { kind: "body", catalogId: "fujifilm-x-t5", name: "X-T5", brand: "fujifilm", mount: "X" };
const manualLens: NewGearItem = {
  kind: "lens",
  name: "Super Takumar 50mm F1.4",
  brand: "Pentax",
  mount: "X",
  manual: {
    brand: "Pentax",
    model: "Super Takumar 50mm F1.4",
    mount: "X",
    focalMinMm: 50,
    focalMaxMm: 50,
    maxApertureWide: 1.4,
    autofocus: false,
    adapted: true,
    originalMount: "M42",
    opticalTraits: [],
    weightG: 230,
    notes: "Yellowed glass",
  },
};

describe("user gear", () => {
  it("stores a manual lens and reads every field back", async () => {
    const added = await addUserGear(db, { userId: "owner", item: manualLens, id: "g1", now: 5 });

    expect(added).toEqual({
      id: "g1",
      kind: "lens",
      name: "Super Takumar 50mm F1.4",
      brand: "Pentax",
      mount: "X",
      manual: manualLens.manual,
      createdAt: 5,
    });
    await expect(listUserGear(db, "owner")).resolves.toEqual([added]);
  });

  it("returns the existing row when a catalog item is added twice", async () => {
    const first = await addUserGear(db, { userId: "owner", item: body, id: "g1", now: 1 });
    const second = await addUserGear(db, { userId: "owner", item: body, id: "g2", now: 2 });

    expect(second).toEqual(first);
    expect(second).not.toHaveProperty("manual");
    await expect(listUserGear(db, "owner")).resolves.toHaveLength(1);
  });

  it("keeps each user's gear separate", async () => {
    await addUserGear(db, { userId: "owner", item: body });

    await expect(listUserGear(db, "stranger")).resolves.toEqual([]);
  });

  it("deletes only the owner's item", async () => {
    await addUserGear(db, { userId: "owner", item: body, id: "g1" });

    await expect(deleteUserGear(db, { userId: "stranger", gearId: "g1" })).resolves.toBe(false);
    await expect(deleteUserGear(db, { userId: "owner", gearId: "g1" })).resolves.toBe(true);
    await expect(listUserGear(db, "owner")).resolves.toEqual([]);
  });

  it("rejects new items past the per-user limit", async () => {
    for (let i = 0; i < MAX_GEAR_ITEMS; i++) {
      await addUserGear(db, { userId: "owner", item: manualLens, id: `g${i}` });
    }

    await expect(addUserGear(db, { userId: "owner", item: manualLens })).rejects.toBeInstanceOf(GearLimitError);
  });

  it("refuses a body without a catalog id at the database level", () => {
    expect(() =>
      sqlite
        .prepare(
          "INSERT INTO user_gear (id, user_id, kind, name, brand, mount, model, focal_min_mm, focal_max_mm, created_at) VALUES ('x', 'owner', 'body', 'X', 'fujifilm', 'X', 'X', 1, 1, 0)",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it("is deleted with the account", async () => {
    await addUserGear(db, { userId: "owner", item: body });
    await addUserFavorite(db, { userId: "owner", lensId: "fujifilm-xf-56mmf12-r-wr-x" });
    await updateUserSettings(db, { userId: "owner", patch: { defaultMount: "G" } });

    sqlite.prepare("DELETE FROM user WHERE id = 'owner'").run();

    for (const table of ["user_gear", "user_favorites", "user_settings"]) {
      expect(sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
    }
  });
});

describe("user favorites", () => {
  it("lists newest first and ignores duplicates", async () => {
    await addUserFavorite(db, { userId: "owner", lensId: "a", now: 1 });
    await addUserFavorite(db, { userId: "owner", lensId: "b", now: 2 });
    await addUserFavorite(db, { userId: "owner", lensId: "a", now: 3 });

    await expect(listUserFavorites(db, "owner")).resolves.toEqual([
      { lensId: "b", createdAt: 2 },
      { lensId: "a", createdAt: 1 },
    ]);
  });

  it("removes a favorite, and removing a missing one is a no-op", async () => {
    await addUserFavorite(db, { userId: "owner", lensId: "a" });

    await removeUserFavorite(db, { userId: "owner", lensId: "a" });
    await removeUserFavorite(db, { userId: "owner", lensId: "a" });

    await expect(listUserFavorites(db, "owner")).resolves.toEqual([]);
  });

  it("rejects new favorites past the per-user limit but still accepts a duplicate", async () => {
    for (let i = 0; i < MAX_FAVORITES; i++) {
      await addUserFavorite(db, { userId: "owner", lensId: `lens-${i}` });
    }

    await expect(addUserFavorite(db, { userId: "owner", lensId: "lens-0" })).resolves.toBeUndefined();
    await expect(addUserFavorite(db, { userId: "owner", lensId: "new" })).rejects.toBeInstanceOf(
      FavoritesLimitError,
    );
  });
});

describe("user settings", () => {
  it("returns the defaults before anything is saved", async () => {
    await expect(getUserSettings(db, "owner")).resolves.toEqual({ defaultMount: "X", locale: null });
  });

  it("merges each patch into the saved settings", async () => {
    await updateUserSettings(db, { userId: "owner", patch: { locale: "zh" } });
    const settings = await updateUserSettings(db, { userId: "owner", patch: { defaultMount: "G" } });

    expect(settings).toEqual({ defaultMount: "G", locale: "zh" });
    await expect(getUserSettings(db, "owner")).resolves.toEqual(settings);
  });

  it("can clear the language back to unset", async () => {
    await updateUserSettings(db, { userId: "owner", patch: { locale: "en" } });
    await updateUserSettings(db, { userId: "owner", patch: { locale: null } });

    await expect(getUserSettings(db, "owner")).resolves.toEqual({ defaultMount: "X", locale: null });
  });

  it("rejects an unknown mount at the database level", () => {
    expect(() =>
      sqlite.prepare("INSERT INTO user_settings (user_id, default_mount, updated_at) VALUES ('owner', 'Z', 0)").run(),
    ).toThrow(/CHECK/);
  });
});
