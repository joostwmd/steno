import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema.js";

export * from "./schema.js";

/** Bundled `server.mjs` sets `STENO_DB_MIGRATIONS_DIR` to `dist/drizzle` next to the bundle. */
const migrationsFolder =
  process.env.STENO_DB_MIGRATIONS_DIR?.trim() ??
  join(dirname(fileURLToPath(import.meta.url)), "../drizzle");

const MIGRATIONS_TABLE = "__drizzle_migrations";

type RawSqlite = InstanceType<typeof Database>;

function tableExists(sqlite: RawSqlite, name: string): boolean {
  const row = sqlite
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(name);
  return row !== undefined;
}

function migrationRowCount(sqlite: RawSqlite): number {
  if (!tableExists(sqlite, MIGRATIONS_TABLE)) return 0;
  const row = sqlite
    .prepare(`SELECT count(*) AS c FROM "${MIGRATIONS_TABLE}"`)
    .get() as { c: number };
  return row.c;
}

/**
 * DBs created before Drizzle migrate() had app tables but no __drizzle_migrations
 * rows. Stamp the journal as applied without re-running CREATEs.
 */
function baselineLegacyDrizzleMigrations(
  sqlite: RawSqlite,
  folder: string,
): void {
  if (!tableExists(sqlite, "sync_state") || !tableExists(sqlite, "events")) {
    return;
  }
  if (migrationRowCount(sqlite) > 0) return;

  sqlite.exec(`CREATE TABLE IF NOT EXISTS "${MIGRATIONS_TABLE}" (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at numeric
			)`);

  const journalPath = join(folder, "meta/_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: { tag: string; when: number }[];
  };

  const insert = sqlite.prepare(
    `INSERT INTO "${MIGRATIONS_TABLE}" ("hash", "created_at") VALUES (?, ?)`,
  );

  for (const entry of journal.entries) {
    const query = readFileSync(join(folder, `${entry.tag}.sql`), "utf8");
    const hash = createHash("sha256").update(query).digest("hex");
    insert.run(hash, entry.when);
  }
}

export type StenoDb = BetterSQLite3Database<typeof schema>;

export type DbHandle = {
  db: StenoDb;
  close: () => void;
};

export function createDb(filePath: string): DbHandle {
  const sqlite = new Database(filePath);
  sqlite.pragma("journal_mode = DELETE");
  sqlite.pragma("synchronous = NORMAL");
  baselineLegacyDrizzleMigrations(sqlite, migrationsFolder);
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder });
  return {
    db,
    close: () => sqlite.close(),
  };
}
