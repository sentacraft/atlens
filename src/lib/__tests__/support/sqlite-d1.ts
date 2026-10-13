import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

type Param = string | number | null;

// The slice of D1's API the repositories use, backed by SQLite so tests exercise
// real constraints (UNIQUE, foreign keys, json_valid) instead of a mock.
class SqliteStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly params: Param[] = [],
  ) {}

  bind(...params: Param[]) {
    return new SqliteStatement(this.db, this.sql, params);
  }

  async first<T>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[] };
  }

  async run() {
    this.db.prepare(this.sql).run(...this.params);
    return { success: true };
  }

  runSync() {
    this.db.prepare(this.sql).run(...this.params);
  }
}

/** An in-memory D1 stand-in with the given migrations directory applied. */
export function createSqliteD1(migrationsDir: string) {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const dir = path.resolve(process.cwd(), migrationsDir);
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".sql")).sort()) {
    db.exec(readFileSync(path.join(dir, file), "utf8"));
  }

  const d1 = {
    prepare: (sql: string) => new SqliteStatement(db, sql),
    // D1 runs a batch as one transaction.
    batch: async (statements: SqliteStatement[]) => {
      db.exec("BEGIN");
      try {
        for (const statement of statements) {
          statement.runSync();
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return [];
    },
  };

  return { d1: d1 as unknown as D1Database, sqlite: db };
}
