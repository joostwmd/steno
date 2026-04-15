import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionEventsToolbar } from "@/components/session-events-toolbar";
import { GlobalStatsSection } from "@/components/analytics/GlobalStatsSection";
import { SessionAnalyticsSection } from "@/components/analytics/SessionAnalyticsSection";
import { TokenInOutBadges } from "@/components/token-in-out-badges";
import { SiteHeader } from "@/components/site-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { EventCard } from "@/event-cards";
import {
  buildSessionExportPayload,
  downloadSessionJson,
} from "@/lib/exportSession";
import { formatTimestampHuman } from "@/lib/formatTimestamp";
import {
  eventPassesFilters,
  toolNamesForHooks,
} from "@/lib/sessionFilters";
import { GLOBAL_STATS_ID, isGlobalStatsView } from "@/lib/globalStatsView";
import { trpc } from "@/lib/trpc";
import { Copy } from "lucide-react";

const SYNC_UI_MIN_MS = 1250;
const LIVE_POLL_MS = 5_000;

const tokenUsageFmt = new Intl.NumberFormat();

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [syncUiPending, setSyncUiPending] = useState(false);
  const syncStartedAtRef = useRef<number | null>(null);
  const syncUiEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True from sync onMutate until min UI duration ends — skips overlapping live polls */
  const syncCycleActiveRef = useRef(false);
  /** Live interval polls: avoid overwriting status with “nothing new” every 5s */
  const quietLivePollRef = useRef(false);
  const mutateSyncRef = useRef<() => void>(() => {});

  const [selectedHooks, setSelectedHooks] = useState<Set<string>>(new Set());
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (syncUiEndTimerRef.current) {
        clearTimeout(syncUiEndTimerRef.current);
      }
    };
  }, []);

  const sessionsQuery = trpc.sessions.list.useQuery(undefined, {
    meta: { skipTrpcErrorToast: true },
  });

  const pinMutation = trpc.sessions.pin.useMutation({
    onSuccess: () => {
      void utils.sessions.list.invalidate();
    },
  });
  const unpinMutation = trpc.sessions.unpin.useMutation({
    onSuccess: () => {
      void utils.sessions.list.invalidate();
    },
  });
  const blockMutation = trpc.sessions.block.useMutation({
    onSuccess: (_data, { conversationId }) => {
      void utils.sessions.list.invalidate();
      void utils.events.bySession.invalidate();
      void utils.events.recent.invalidate();
      void utils.sessions.tokenUsage.invalidate();
      void utils.analytics.session.invalidate();
      void utils.analytics.global.invalidate();
      setSelectedId((id) => (id === conversationId ? null : id));
    },
  });

  const [renameTarget, setRenameTarget] = useState<{
    conversationId: string;
    initialLabel: string | null;
  } | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const renameMutation = trpc.sessions.rename.useMutation({
    onSuccess: () => {
      void utils.sessions.list.invalidate();
      setRenameTarget(null);
    },
  });

  useEffect(() => {
    if (renameTarget) {
      setRenameDraft(renameTarget.initialLabel ?? "");
    }
  }, [renameTarget]);

  const renameUnchanged = useMemo(() => {
    if (!renameTarget) return true;
    const initialTrimmed = (renameTarget.initialLabel ?? "").trim();
    return renameDraft.trim() === initialTrimmed;
  }, [renameTarget, renameDraft]);

  const sessionActionsPending =
    pinMutation.isPending ||
    unpinMutation.isPending ||
    blockMutation.isPending ||
    renameMutation.isPending;

  const syncMutation = trpc.ingest.sync.useMutation({
    onMutate: () => {
      if (syncUiEndTimerRef.current) {
        clearTimeout(syncUiEndTimerRef.current);
        syncUiEndTimerRef.current = null;
      }
      syncStartedAtRef.current = Date.now();
      syncCycleActiveRef.current = true;
      setSyncUiPending(true);
    },
    onSuccess: () => {
      void utils.sessions.list.invalidate();
      void utils.events.bySession.invalidate();
      void utils.events.recent.invalidate();
      void utils.sessions.tokenUsage.invalidate();
      void utils.analytics.session.invalidate();
      void utils.analytics.global.invalidate();
      quietLivePollRef.current = false;
    },
    onError: () => {
      quietLivePollRef.current = false;
    },
    onSettled: () => {
      const started = syncStartedAtRef.current;
      if (started === null) {
        setSyncUiPending(false);
        syncCycleActiveRef.current = false;
        return;
      }
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, SYNC_UI_MIN_MS - elapsed);
      syncUiEndTimerRef.current = setTimeout(() => {
        setSyncUiPending(false);
        syncStartedAtRef.current = null;
        syncUiEndTimerRef.current = null;
        syncCycleActiveRef.current = false;
      }, remaining);
    },
  });

  mutateSyncRef.current = () => {
    syncMutation.mutate();
  };

  const sessionQueriesEnabled =
    Boolean(selectedId) && !isGlobalStatsView(selectedId);

  const eventsQuery = trpc.events.bySession.useQuery(
    { conversationId: selectedId! },
    {
      enabled: sessionQueriesEnabled,
      meta: { skipTrpcErrorToast: true },
    },
  );

  const tokenUsageQuery = trpc.sessions.tokenUsage.useQuery(
    { conversationId: selectedId! },
    {
      enabled: sessionQueriesEnabled,
      meta: { skipTrpcErrorToast: true },
    },
  );

  const analyticsQuery = trpc.analytics.session.useQuery(
    { conversationId: selectedId! },
    {
      enabled: sessionQueriesEnabled,
      meta: { skipTrpcErrorToast: true },
    },
  );

  const globalStatsQuery = trpc.analytics.global.useQuery(undefined, {
    enabled: isGlobalStatsView(selectedId),
    meta: { skipTrpcErrorToast: true },
  });

  const events = eventsQuery.data ?? [];

  useEffect(() => {
    setSelectedHooks(new Set());
    setSelectedTools(new Set());
  }, [selectedId]);

  useEffect(() => {
    if (events.length === 0) return;
    setSelectedHooks((prev) => {
      const allInData = new Set(events.map((e) => e.hookEventName));
      if (prev.size === 0) return allInData;
      const next = new Set<string>();
      for (const h of prev) {
        if (allInData.has(h)) next.add(h);
      }
      for (const h of allInData) {
        if (!prev.has(h)) next.add(h);
      }
      return next;
    });
  }, [events]);

  const toolOptions = useMemo(
    () => toolNamesForHooks(events, selectedHooks),
    [events, selectedHooks],
  );

  useEffect(() => {
    const allowed = new Set(toolOptions);
    setSelectedTools((prev) => {
      const next = new Set([...prev].filter((t) => allowed.has(t)));
      return next.size === prev.size ? prev : next;
    });
  }, [toolOptions]);

  const visibleEvents = useMemo(
    () =>
      events.filter((e) =>
        eventPassesFilters(e, selectedHooks, selectedTools),
      ),
    [events, selectedHooks, selectedTools],
  );

  useEffect(() => {
    if (!autoRefresh) return;

    const runLiveSync = () => {
      if (syncCycleActiveRef.current) return;
      quietLivePollRef.current = true;
      mutateSyncRef.current();
    };

    runLiveSync();
    const intervalId = window.setInterval(runLiveSync, LIVE_POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [autoRefresh]);

  const selectedSession = useMemo(() => {
    const data = sessionsQuery.data;
    if (!data || !selectedId || isGlobalStatsView(selectedId)) return null;
    return (
      data.pinned.find((s) => s.conversationId === selectedId) ??
      data.unpinned.find((s) => s.conversationId === selectedId) ??
      null
    );
  }, [sessionsQuery.data, selectedId]);

  const toggleHook = useCallback((hook: string, checked: boolean) => {
    setSelectedHooks((prev) => {
      const next = new Set(prev);
      if (checked) next.add(hook);
      else next.delete(hook);
      return next;
    });
  }, []);

  const toggleTool = useCallback((tool: string, checked: boolean) => {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (checked) next.add(tool);
      else next.delete(tool);
      return next;
    });
  }, []);

  const handleRenameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!renameTarget || renameMutation.isPending || renameUnchanged) return;
      renameMutation.mutate({
        conversationId: renameTarget.conversationId,
        label: renameDraft,
      });
    },
    [
      renameTarget,
      renameMutation,
      renameUnchanged,
      renameDraft,
    ],
  );

  const handleExport = useCallback(() => {
    if (!selectedId || !selectedSession || events.length === 0) return;
    const payload = buildSessionExportPayload(
      selectedId,
      {
        label: selectedSession.label,
        eventCount: selectedSession.eventCount,
        lastEventAt: selectedSession.lastEventAt,
      },
      events,
    );
    downloadSessionJson(selectedId, payload);
  }, [selectedId, selectedSession, events]);

  const showEventsToolbar = Boolean(
    selectedSession &&
      !eventsQuery.isLoading &&
      !eventsQuery.error &&
      events.length > 0,
  );

  const sessionEventsSummary = useMemo(() => {
    if (!selectedSession) return "";
    if (showEventsToolbar) {
      if (events.length > 0 && visibleEvents.length !== events.length) {
        return `${visibleEvents.length} / ${events.length} events`;
      }
      return `${events.length} events`;
    }
    return `${selectedSession.eventCount} events`;
  }, [
    selectedSession,
    showEventsToolbar,
    events.length,
    visibleEvents.length,
  ]);

  return (
    <SidebarProvider className="flex h-svh max-h-svh flex-row overflow-hidden">
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Rename session</DialogTitle>
              <DialogDescription>
                This name is stored locally and kept when you import new events.
              </DialogDescription>
            </DialogHeader>
            <Input
              className="mt-2"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              maxLength={500}
              placeholder="Session name"
              autoFocus
              aria-label="Session name"
            />
            {renameMutation.isError ? (
              <p className="mt-2 text-xs text-destructive">
                {renameMutation.error.message}
              </p>
            ) : null}
            <DialogFooter className="mt-4 sm:mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  renameMutation.isPending ||
                  renameUnchanged ||
                  renameTarget === null
                }
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AppSidebar
        globalStatsId={GLOBAL_STATS_ID}
        onSelectGlobalStats={() => setSelectedId(GLOBAL_STATS_ID)}
        pinnedSessions={sessionsQuery.data?.pinned}
        unpinnedSessions={sessionsQuery.data?.unpinned}
        isLoading={sessionsQuery.isLoading}
        errorMessage={
          sessionsQuery.error ? sessionsQuery.error.message : null
        }
        selectedId={selectedId}
        onSelectSession={setSelectedId}
        onPin={(conversationId) => pinMutation.mutate({ conversationId })}
        onUnpin={(conversationId) =>
          unpinMutation.mutate({ conversationId })
        }
        onBlock={(conversationId) =>
          blockMutation.mutate({ conversationId })
        }
        onRequestRename={(conversationId, currentLabel) =>
          setRenameTarget({ conversationId, initialLabel: currentLabel })
        }
        actionsPending={sessionActionsPending}
      />
      <SidebarInset className="flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SiteHeader
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          syncPending={syncUiPending}
          onSync={() => syncMutation.mutate()}
        />
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 md:p-6">
          <div className="min-h-0 flex-1">
            <div className="mb-4 border-b border-border pb-3">
              {isGlobalStatsView(selectedId) ? (
                <div className="space-y-1">
                  <h2 className="text-lg font-medium tracking-tight">
                    Global stats
                  </h2>
                  <p className="max-w-2xl text-sm text-muted-foreground">
                    Cross-session totals, records, leaderboards, and composition
                    charts for everything stored locally.
                  </p>
                </div>
              ) : selectedSession ? (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="min-w-0 font-mono text-[11px] text-muted-foreground">
                        <span className="break-all align-middle">
                          {selectedSession.conversationId}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-1 inline-flex size-7 shrink-0 align-middle text-muted-foreground"
                          aria-label="Copy conversation ID"
                          onClick={() =>
                            void navigator.clipboard?.writeText(
                              selectedSession.conversationId,
                            )
                          }
                        >
                          <Copy className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                      <h2 className="text-lg font-medium tracking-tight">
                        {selectedSession.label || "Untitled session"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          Last activity{" "}
                          {formatTimestampHuman(selectedSession.lastEventAt)}
                        </span>
                        <span
                          className="select-none text-muted-foreground/50"
                          aria-hidden
                        >
                          ·
                        </span>
                        <span className="tabular-nums">
                          {sessionEventsSummary}
                        </span>
                      </div>
                    </div>
                    {showEventsToolbar ? (
                      <SessionEventsToolbar
                        events={events}
                        selectedHooks={selectedHooks}
                        onToggleHook={toggleHook}
                        selectedTools={selectedTools}
                        onToggleTool={toggleTool}
                        onExport={handleExport}
                      />
                    ) : null}
                  </div>

                  <SessionAnalyticsSection
                    data={analyticsQuery.data}
                    isLoading={analyticsQuery.isLoading}
                    errorMessage={
                      analyticsQuery.error
                        ? analyticsQuery.error.message
                        : null
                    }
                  />

                  {tokenUsageQuery.isLoading ? (
                    <section
                      aria-label="Token usage"
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <h3 className="text-xs font-semibold text-foreground">
                        Token usage
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Loading token usage…
                      </p>
                    </section>
                  ) : tokenUsageQuery.error ? (
                    <section
                      aria-label="Token usage"
                      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"
                    >
                      <h3 className="text-xs font-semibold text-foreground">
                        Token usage
                      </h3>
                      <p className="mt-2 text-xs text-destructive">
                        Couldn&apos;t load token usage.{" "}
                        {tokenUsageQuery.error.message}
                      </p>
                    </section>
                  ) : tokenUsageQuery.data ? (
                    tokenUsageQuery.data.total.input === 0 &&
                    tokenUsageQuery.data.total.output === 0 ? (
                      <section
                        aria-label="Token usage"
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <h3 className="text-xs font-semibold text-foreground">
                          Token usage
                        </h3>
                        <p className="mt-2 text-xs text-muted-foreground">
                          No token usage recorded for stored events yet.
                        </p>
                      </section>
                    ) : (
                      <section
                        aria-label="Token usage"
                        className="rounded-lg border border-border bg-card p-4"
                      >
                        <h3 className="text-xs font-semibold text-foreground">
                          Token usage
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Total
                            </span>
                            <TokenInOutBadges
                              input={tokenUsageQuery.data.total.input}
                              output={tokenUsageQuery.data.total.output}
                              format={tokenUsageFmt}
                            />
                          </div>
                          {tokenUsageQuery.data.totalsIncludeEstimated ? (
                            <Badge
                              variant="outline"
                              className="h-5 text-[0.65rem] font-medium uppercase tracking-wide"
                            >
                              Includes est.
                            </Badge>
                          ) : null}
                        </div>
                        {tokenUsageQuery.data.byModel.length > 0 ? (
                          <Accordion
                            type="single"
                            collapsible
                            className="mt-3 w-full rounded-md border border-border"
                          >
                            <AccordionItem value="by-model">
                              <AccordionTrigger className="px-3 py-2 text-xs hover:no-underline">
                                By model
                              </AccordionTrigger>
                              <AccordionContent className="px-3">
                                <ul className="list-none space-y-2 pb-1">
                                  {tokenUsageQuery.data.byModel.map((m) => (
                                    <li
                                      key={m.model}
                                      className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3"
                                    >
                                      <span className="min-w-0 shrink font-mono text-[11px] text-foreground">
                                        {m.model}
                                      </span>
                                      <TokenInOutBadges
                                        input={m.input}
                                        output={m.output}
                                        format={tokenUsageFmt}
                                        size="sm"
                                        variant="outline"
                                      />
                                    </li>
                                  ))}
                                </ul>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        ) : null}
                      </section>
                    )
                  ) : null}
                </div>
              ) : (
                <h2 className="text-lg font-medium text-muted-foreground">
                  Select a session or Global stats
                </h2>
              )}
            </div>

            {isGlobalStatsView(selectedId) ? (
              <GlobalStatsSection
                data={globalStatsQuery.data}
                isLoading={globalStatsQuery.isLoading}
                errorMessage={
                  globalStatsQuery.error
                    ? globalStatsQuery.error.message
                    : null
                }
                onSelectSession={(conversationId) =>
                  setSelectedId(conversationId)
                }
              />
            ) : !selectedId ? (
              <p className="text-sm text-muted-foreground">
                Choose a session from the sidebar to view its events, or open
                Global stats.
              </p>
            ) : eventsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading events…</p>
            ) : eventsQuery.error ? (
              <p className="text-sm text-destructive">
                Couldn&apos;t load events. {eventsQuery.error.message}
              </p>
            ) : !events.length ? (
              <p className="text-sm text-muted-foreground">
                No events stored for this session yet. Try Import latest if you
                expect new data.
              </p>
            ) : visibleEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No events match the current filters. Adjust filters to see
                events.
              </p>
            ) : (
              <ul className="space-y-4 pb-8">
                {visibleEvents.map((e) => (
                  <li key={e.id}>
                    <EventCard
                      event={e}
                      selectedConversationId={selectedId}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
