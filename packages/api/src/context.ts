import type { StenoDb } from "@steno/db";

export type ApiContext = {
  db: StenoDb;
  repoRoot: string;
  ndjsonPath: string;
};
