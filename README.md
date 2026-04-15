# Steno

**Steno** records [Cursor](https://cursor.com) hook telemetry: each hook sends JSON on stdin to the `steno` CLI, which appends **NDJSON** and keeps a **SQLite** database in sync for the web UI.

This repository is a **pnpm monorepo**. The installable surface is the **`steno`** package (`packages/steno`): a bundled CLI plus embedded API server and static UI.

## Requirements

- **Node.js** 20+ (22 LTS recommended)
- **pnpm** 9 (`packageManager` is pinned in root `package.json`)
- For `npm install steno` from a tarball: a working toolchain for **`better-sqlite3`** (native compile)

## Monorepo layout

| Path | Role |
|------|------|
| `packages/core` | Hook ingest, `steno.config.ts` loading |
| `packages/api` | tRPC router shared by server and UI |
| `packages/db` | Drizzle + SQLite (`better-sqlite3`), migrations in `packages/db/drizzle` |
| `packages/steno` | **`steno` CLI** — esbuild bundle (`cli.mjs`, `server.mjs`), copied migrations + **built UI** under `dist/` |
| `apps/server` | Hono + tRPC server (used from source during monorepo dev; also bundled into `steno`) |
| `apps/ui` | Vite + React viewer (production build is copied into the `steno` package) |

## Contributing: clone and run

```bash
pnpm install
pnpm build
```

- **Monorepo dev (hot reload):** `pnpm dev` — runs `@steno/server` with `tsx` and `@steno/ui` with Vite (UI at [http://127.0.0.1:5173](http://127.0.0.1:5173), API at [http://127.0.0.1:8787](http://127.0.0.1:8787)).
- **Same as consumers (bundled CLI):** `pnpm exec steno dev` — one port serves API + static UI from the `steno` package build (after `pnpm build` or `pnpm --filter steno build`).

### Useful scripts

| Script | Purpose |
|--------|---------|
| `pnpm build` | Build all workspace packages (including `steno` with embedded UI) |
| `pnpm dev` | Server + Vite UI in parallel |
| `pnpm test` | Vitest in `@steno/core` and `@steno/api` |
| `pnpm steno:ingest` | Run `steno ingest` (expects stdin JSON from a hook) |
| `pnpm steno:dev` | Run `steno dev` (bundled API + UI) |
| `pnpm db:generate` / `pnpm db:push` | Drizzle (see `@steno/db`) |

## Configuration

Add **`steno.config.ts`** at the **project root** (the repo Cursor opens). Example:

```ts
/** Paths relative to repo root */
export default {
  logPath: "steno/events.ndjson",
  sqlitePath: "steno/steno.db",
  uiPort: 8787,
};
```

The CLI loads this config with **jiti** (TypeScript without a separate compile step).

## Cursor hooks

Point hooks at your package manager so `steno ingest` runs with the repo root as cwd, for example in `.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "afterAgentResponse": [{ "command": "npm run steno:ingest --silent" }]
  }
}
```

Scaffold config, `package.json` scripts, and hooks interactively:

```bash
npx steno init
# or non-interactive:
npx steno init --yes
```

Run `npx steno help` for all `init` flags.

## CLI commands (`steno`)

| Command | Description |
|---------|-------------|
| `steno ingest` | Read one hook JSON line from **stdin**, append NDJSON, update SQLite (default if no subcommand). |
| `steno init` | Create `steno.config.ts`, wire `package.json` scripts, write `.cursor/hooks.json`. |
| `steno dev` | Start bundled server: **API + UI** on `uiPort` (default **8787**). Uses **`apps/ui/dist`** if present, otherwise the **UI shipped inside the package** (`dist/ui`). |
| `steno dev --build` | In a monorepo that contains `apps/ui`, run `pnpm --filter @steno/ui build` first; otherwise uses bundled UI. |
| `steno help` | Usage. |

From a project that depends on `steno`, use **`npx steno …`** or npm scripts so `node_modules/.bin` is used.

## Building the installable tarball

From the monorepo:

```bash
cd packages/steno
pnpm pack --pack-destination /tmp
```

`prepack` runs a full `steno` build (workspace libs + esbuild + Vite UI + `dist/ui`). Install elsewhere:

```bash
cd /path/to/other-project
npm install /tmp/steno-0.1.0.tgz
npx steno help
npx steno dev
```

## Environment variables (reference)

| Variable | Purpose |
|----------|---------|
| `STENO_PROJECT` | Absolute path to project root (server resolves config and paths). |
| `STENO_UI_PORT` | Overrides `uiPort` from config. |
| `STENO_STATIC_ROOT` | Directory with `index.html` for static + SPA fallback (set automatically by `steno dev`). |
| `STENO_DB_MIGRATIONS_DIR` | Drizzle migrations folder (set automatically for the bundled server). |

Legacy aliases `STENOGRAPHER_*` may still be read where noted in code.

## License

See `package.json` / repository policy when you add one.
