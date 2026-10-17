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

  // kysely-d1 sends every query, writes included, through `all()` and reads `meta`.
  async all<T>(): Promise<{ results: T[]; meta: { changes: number } }> {
    const statement = this.db.prepare(this.sql);
    if (statement.columns().length > 0) {
      return { results: statement.all(...this.params) as T[], meta: { changes: 0 } };
    }
    const { changes } = statement.run(...this.params);
    return { results: [], meta: { changes: Number(changes) } };
  }

  async run() {
    return this.runSync();
  }

  runSync() {
    const { changes } = this.db.prepare(this.sql).run(...this.params);
    return { success: true, meta: { changes: Number(changes) } };
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
        const results = statements.map((statement) => statement.runSync());
        db.exec("COMMIT");
        return results;
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
  };

  return { d1: d1 as unknown as D1Database, sqlite: db };
}
