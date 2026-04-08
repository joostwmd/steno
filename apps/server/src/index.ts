import { readFileSync, existsSync, mkdirSync, watch } from "node:fs";
import { dirname, join } from "node:path";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  appRouter,
  syncNdjsonToSqlite,
  type ApiContext,
} from "@steno/api";
import {
  loadStenoConfig,
  resolveLogPath,
  resolveSqlitePath,
} from "@steno/core";
import { createDb } from "@steno/db";
import { getRepoRoot } from "./repoRoot.js";

function getPort(repoRoot: string): number {
  const cfg = loadStenoConfig(repoRoot);
  const fromEnv =
    process.env.STENO_UI_PORT?.trim() ||
    process.env.STENOGRAPHER_UI_PORT?.trim();
  if (fromEnv) {
    const n = Number(fromEnv);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  if (typeof cfg.ui_port === "number" && cfg.ui_port > 0) return cfg.ui_port;
  return 8787;
}

const repoRoot = getRepoRoot();
const telemetryCfg = loadStenoConfig(repoRoot);
const ndjsonPath = resolveLogPath(repoRoot, telemetryCfg);
const sqlitePath = resolveSqlitePath(repoRoot, telemetryCfg);
const port = getPort(repoRoot);

const staticRoot = process.env.STENO_STATIC_ROOT?.trim();
const serveBundledUi = Boolean(
  staticRoot && existsSync(join(staticRoot, "index.html")),
);

mkdirSync(dirname(sqlitePath), { recursive: true });

const { db, close } = createDb(sqlitePath);

const ctx: ApiContext = {
  db,
  repoRoot,
  ndjsonPath,
};

void syncNdjsonToSqlite(ctx);

let debounce: ReturnType<typeof setTimeout> | undefined;
try {
  watch(ndjsonPath, { persistent: true }, () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      try {
        void syncNdjsonToSqlite(ctx);
      } catch (e) {
        console.error("[steno] watch sync failed:", e);
      }
    }, 300);
  });
} catch {
  // NDJSON may not exist yet; hooks will create file
}

const app = new Hono();

if (serveBundledUi && staticRoot) {
  // Same-origin UI + API; permissive CORS for local tooling
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS", "HEAD"],
      allowHeaders: ["Content-Type", "trpc-accept"],
    }),
  );
} else {
  app.use(
    "*",
    cors({
      origin: ["http://127.0.0.1:5173", "http://localhost:5173"],
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "trpc-accept"],
    }),
  );
}

app.use("/trpc/*", async (c) =>
  fetchRequestHandler({
    endpoint: "/trpc",
    router: appRouter,
    req: c.req.raw,
    createContext: () => ctx,
  }),
);

app.get("/health", (c) => c.json({ ok: true }));

if (serveBundledUi && staticRoot) {
  app.use(
    "/*",
    serveStatic({
      root: staticRoot,
      rewriteRequestPath: (p) => (p.startsWith("/") ? p.slice(1) : p),
    }),
  );

  app.notFound((c) => {
    if (c.req.path.startsWith("/trpc")) {
      return c.body(null, 404);
    }
    if (c.req.method !== "GET" && c.req.method !== "HEAD") {
      return c.body(null, 404);
    }
    const indexPath = join(staticRoot, "index.html");
    if (!existsSync(indexPath)) {
      return c.text("Not found", 404);
    }
    return c.html(readFileSync(indexPath, "utf8"));
  });
}

serve({
  fetch: app.fetch,
  port,
});

if (serveBundledUi && staticRoot) {
  console.log(
    `[steno] UI + API at http://127.0.0.1:${port}/ (static: ${staticRoot})`,
  );
} else {
  console.log(`[steno] API at http://127.0.0.1:${port}/ (use Vite on :5173 for UI)`);
}

const shutdown = () => {
  close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
