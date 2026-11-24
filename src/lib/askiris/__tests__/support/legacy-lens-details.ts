import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const MIGRATIONS = path.resolve(process.cwd(), "migrations/app");
export const LEGACY = readFileSync(path.join(MIGRATIONS, "0009_migrate_legacy_lens_details.sql"), "utf8");

export function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql") && name < "0009").sort()) {
    db.exec(readFileSync(path.join(MIGRATIONS, file), "utf8"));
  }
  db.exec("INSERT INTO user (id, name, email, createdAt, updatedAt) VALUES ('u', 'U', 'u@example.test', 0, 0)");
  db.exec("INSERT INTO askiris_conversations (id, user_id, title, created_at, updated_at) VALUES ('c', 'u', 't', 0, 0)");
  return db;
}

export const image = (id: string, role: string, extra: Record<string, unknown> = {}) => ({
  lensRef: "lensA", lensName: "Lens A", lensId: "lens-a", mount: "X", imageRef: `lensA:image-${id}`, src: `/a-${id}.webp`,
  image: { id, role, ...extra },
});

export const legacyAssistant = (overrides: { displayImages?: unknown[]; input?: unknown } = {}) => ({
  id: "assistant-1",
  role: "assistant",
  metadata: { traceId: "t", turnId: "n" },
  parts: [
    { type: "text", text: "Here you go" },
    {
      type: "tool-lensDetails", toolCallId: "call-1", state: "output-available",
      input: overrides.input ?? { lenses: [{ ref: "lensA", images: [{ role: "mtf", read: true }, { role: "optical-construction" }] }] },
      output: {
        lenses: [{
          ref: "lensA", name: "Lens A", maxAperture: 2.8, focalNativeMm: [16, 55], weightG: 655,
          images: [{ imageRef: "lensA:image-001", id: "001", role: "mtf" }],
          imageResults: [{ role: "mtf", status: "selected", selected: ["lensA:image-001"] }],
        }],
        displayImages: overrides.displayImages ?? [
          { ...image("001", "mtf", { focalLengthMm: 16 }), gallery: [image("001", "mtf", { focalLengthMm: 16 }), image("002", "mtf", { focalLengthMm: 55 })] },
          image("010", "optical-construction"),
        ],
        readRefs: ["lensA:image-001"],
        historical: false,
        notInData: "For field performance and opinions, use lensReviews.",
      },
    },
    { type: "text", text: "Done" },
  ],
});

export function insert(db: DatabaseSync, id: string, message: unknown, context?: unknown, sequence = 0) {
  db.prepare("INSERT INTO askiris_messages (id, conversation_id, role, sequence, message_json, context_json, created_at) VALUES (?, 'c', 'assistant', ?, ?, ?, 0)")
    .run(id, sequence, JSON.stringify(message), context ? JSON.stringify(context) : null);
}
export const read = (db: DatabaseSync, id: string) =>
  JSON.parse((db.prepare("SELECT message_json FROM askiris_messages WHERE id = ?").get(id) as { message_json: string }).message_json);


/** A message in the legacy shape, as the migration leaves it. */
export function migrated(message: object = legacyAssistant(), context: object = { mount: "X", locale: "en" }) {
  const db = database();
  insert(db, "m", message, context);
  db.exec(LEGACY);
  return read(db, "m");
}
