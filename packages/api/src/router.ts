import { initTRPC, TRPCError } from "@trpc/server";
import { desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { blockedSession, events, pinnedSession, sessions } from "@steno/db";
import type { ApiContext } from "./context.js";
import { syncNdjsonToSqlite } from "./syncNdjson.js";

const t = initTRPC.context<ApiContext>().create();

/** Lets the UI trigger a TRPCError for toast / error-handling tests. */
function isDevErrorHarnessEnabled(): boolean {
  if (process.env.STENO_DEV_THROW_ERROR === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export const appRouter = t.router({
  dev: t.router({
    throwSampleError: t.procedure.mutation(() => {
      if (!isDevErrorHarnessEnabled()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Dev error harness is off in production. Set STENO_DEV_THROW_ERROR=1 to enable.",
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Deliberate API error for testing client error handling.",
      });
    }),
  }),
  ingest: t.router({
    sync: t.procedure.mutation(({ ctx }) => {
      return syncNdjsonToSqlite(ctx);
    }),
  }),
  sessions: t.router({
    list: t.procedure.query(({ ctx }) => {
      const sessionCols = {
        conversationId: sessions.conversationId,
        label: sessions.label,
        lastEventAt: sessions.lastEventAt,
        eventCount: sessions.eventCount,
      };

      const pinned = ctx.db
        .select(sessionCols)
        .from(sessions)
        .innerJoin(
          pinnedSession,
          eq(sessions.conversationId, pinnedSession.conversationId),
        )
        .orderBy(desc(sessions.lastEventAt))
        .all();

      const unpinned = ctx.db
        .select(sessionCols)
        .from(sessions)
        .leftJoin(
          pinnedSession,
          eq(sessions.conversationId, pinnedSession.conversationId),
        )
        .where(isNull(pinnedSession.conversationId))
        .orderBy(desc(sessions.lastEventAt))
        .all();

      return { pinned, unpinned };
    }),
    pin: t.procedure
      .input(z.object({ conversationId: z.string() }))
      .mutation(({ ctx, input }) => {
        const row = ctx.db
          .select()
          .from(sessions)
          .where(eq(sessions.conversationId, input.conversationId))
          .get();
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        ctx.db
          .insert(pinnedSession)
          .values({ conversationId: input.conversationId })
          .onConflictDoNothing()
          .run();
        return { ok: true as const };
      }),
    unpin: t.procedure
      .input(z.object({ conversationId: z.string() }))
      .mutation(({ ctx, input }) => {
        ctx.db
          .delete(pinnedSession)
          .where(eq(pinnedSession.conversationId, input.conversationId))
          .run();
        return { ok: true as const };
      }),
    rename: t.procedure
      .input(
        z.object({
          conversationId: z.string(),
          label: z.string().max(500),
        }),
      )
      .mutation(({ ctx, input }) => {
        const row = ctx.db
          .select()
          .from(sessions)
          .where(eq(sessions.conversationId, input.conversationId))
          .get();
        if (!row) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Session not found",
          });
        }
        const trimmed = input.label.trim();
        const label = trimmed.length === 0 ? null : trimmed;
        ctx.db
          .update(sessions)
          .set({ label })
          .where(eq(sessions.conversationId, input.conversationId))
          .run();
        return { ok: true as const };
      }),
    block: t.procedure
      .input(z.object({ conversationId: z.string() }))
      .mutation(({ ctx, input }) => {
        const { conversationId } = input;
        ctx.db.delete(events).where(eq(events.conversationId, conversationId)).run();
        ctx.db
          .delete(sessions)
          .where(eq(sessions.conversationId, conversationId))
          .run();
        ctx.db
          .delete(pinnedSession)
          .where(eq(pinnedSession.conversationId, conversationId))
          .run();
        ctx.db
          .insert(blockedSession)
          .values({ conversationId })
          .onConflictDoNothing()
          .run();
        return { ok: true as const };
      }),
    tokenUsage: t.procedure
      .input(z.object({ conversationId: z.string() }))
      .query(({ ctx, input }) => {
        const evs = ctx.db
          .select()
          .from(events)
          .where(eq(events.conversationId, input.conversationId))
          .all();

        const byModel = new Map<string, { input: number; output: number }>();
        let totalsIncludeEstimated = false;

        for (const row of evs) {
          let detail: Record<string, unknown>;
          try {
            detail = JSON.parse(row.detail) as Record<string, unknown>;
          } catch {
            continue;
          }
          if (detail.token_usage_source === "estimated") {
            totalsIncludeEstimated = true;
          }

          const inRaw = detail.token_usage_input;
          const outRaw = detail.token_usage_output;
          const inN =
            typeof inRaw === "number" && Number.isFinite(inRaw)
              ? Math.max(0, Math.floor(inRaw))
              : 0;
          const outN =
            typeof outRaw === "number" && Number.isFinite(outRaw)
              ? Math.max(0, Math.floor(outRaw))
              : 0;
          if (inN === 0 && outN === 0) continue;

          const modelKey =
            row.model && row.model.trim().length > 0 ? row.model : "unknown";
          const cur = byModel.get(modelKey) ?? { input: 0, output: 0 };
          cur.input += inN;
          cur.output += outN;
          byModel.set(modelKey, cur);
        }

        const byModelList = [...byModel.entries()]
          .map(([model, v]) => ({
            model,
            input: v.input,
            output: v.output,
          }))
          .sort((a, b) => b.input + b.output - (a.input + a.output));

        const total = byModelList.reduce(
          (acc, r) => ({
            input: acc.input + r.input,
            output: acc.output + r.output,
          }),
          { input: 0, output: 0 },
        );

        return { total, byModel: byModelList, totalsIncludeEstimated };
      }),
  }),
  events: t.router({
    bySession: t.procedure
      .input(z.object({ conversationId: z.string() }))
      .query(({ ctx, input }) => {
        const evs = ctx.db
          .select()
          .from(events)
          .where(eq(events.conversationId, input.conversationId))
          .orderBy(desc(events.receivedAt))
          .all();
        return evs;
      }),
    recent: t.procedure
      .input(
        z.object({ limit: z.number().min(1).max(500).optional() }).optional(),
      )
      .query(({ ctx, input }) => {
        const limit = input?.limit ?? 100;
        return ctx.db
          .select()
          .from(events)
          .orderBy(desc(events.receivedAt))
          .limit(limit)
          .all();
      }),
  }),
});

export type AppRouter = typeof appRouter;
