import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { AppSidebar } from "@/components/app-sidebar";
import { SessionEventsToolbar } from "@/components/session-events-toolbar";
import { GlobalStatsSection } from "@/components/analytics/GlobalStatsSection";
import { SessionAnalyticsSection } from "@/components/analytics/SessionAnalyticsSection";
import { SiteHeader } from "@/components/site-header";
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
import { HOME_PATH, sessionPath } from "@/lib/routes";
import { trpc } from "@/lib/trpc";
import { Copy, Loader2 } from "lucide-react";

const SYNC_UI_MIN_MS = 1250;
const LIVE_POLL_MS = 5_000;

export default function App() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { sessionId: sessionIdParam } = useParams<{ sessionId?: string }>();
  const sessionId = sessionIdParam
    ? decodeURIComponent(sessionIdParam)
    : undefined;
  const isGlobalView = sessionId == null || sessionId === "";
  const routeSessionIdRef = useRef(sessionId);
  routeSessionIdRef.current = sessionId;
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
      if (routeSessionIdRef.current === conversationId) {
        void navigate(HOME_PATH);
      }
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

  const sessionQueriesEnabled = Boolean(sessionId);

  const eventsQuery = trpc.events.bySession.useQuery(
    { conversationId: sessionId! },
    {
      enabled: sessionQueriesEnabled,
      meta: { skipTrpcErrorToast: true },
    },
  );

  const analyticsQuery = trpc.analytics.session.useQuery(
    { conversationId: sessionId! },
    {
      enabled: sessionQueriesEnabled,
      meta: { skipTrpcErrorToast: true },
    },
  );

  const globalStatsQuery = trpc.analytics.global.useQuery(undefined, {
    enabled: isGlobalView,
    meta: { skipTrpcErrorToast: true },
  });

  const events = eventsQuery.data ?? [];

  useEffect(() => {
    setSelectedHooks(new Set());
    setSelectedTools(new Set());
  }, [sessionId]);

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
    if (!data || !sessionId) return null;
    return (
      data.pinned.find((s) => s.conversationId === sessionId) ??
      data.unpinned.find((s) => s.conversationId === sessionId) ??
      null
    );
  }, [sessionsQuery.data, sessionId]);

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
    if (!sessionId || !selectedSession || events.length === 0) return;
    const payload = buildSessionExportPayload(
      sessionId,
      {
        label: selectedSession.label,
        eventCount: selectedSession.eventCount,
        lastEventAt: selectedSession.lastEventAt,
      },
      events,
    );
    downloadSessionJson(sessionId, payload);
  }, [sessionId, selectedSession, events]);

  const showEventsToolbar = Boolean(
    sessionId &&
      !eventsQuery.isLoading &&
      !eventsQuery.error &&
      events.length > 0,
  );

  const showMainPaneSpinner = useMemo(() => {
    if (sessionsQuery.data === undefined && sessionsQuery.isFetching) {
      return true;
    }
    if (isGlobalView) {
      return (
        globalStatsQuery.data === undefined && globalStatsQuery.isFetching
      );
    }
    if (sessionQueriesEnabled) {
      return eventsQuery.isPending || analyticsQuery.isPending;
    }
    return false;
  }, [
    sessionsQuery.data,
    sessionsQuery.isFetching,
    isGlobalView,
    globalStatsQuery.data,
    globalStatsQuery.isFetching,
    sessionQueriesEnabled,
    eventsQuery.isPending,
    analyticsQuery.isPending,
  ]);

  const sessionEventsSummary = useMemo(() => {
    if (!sessionId) return "";
    if (showEventsToolbar) {
      if (events.length > 0 && visibleEvents.length !== events.length) {
        return `${visibleEvents.length} / ${events.length} events`;
      }
      return `${events.length} events`;
    }
    if (selectedSession) {
      return `${selectedSession.eventCount} events`;
    }
    return "—";
  }, [
    sessionId,
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
                Saved only on this computer. Imports won&apos;t overwrite it.
              </DialogDescription>
            </DialogHeader>
            <Input
              className="mt-2"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              maxLength={500}
              placeholder="e.g. Auth refactor — Apr 15"
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
        activeSessionId={sessionId}
        pinnedSessions={sessionsQuery.data?.pinned}
        unpinnedSessions={sessionsQuery.data?.unpinned}
        isLoading={sessionsQuery.isLoading}
        errorMessage={
          sessionsQuery.error ? sessionsQuery.error.message : null
        }
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
      <SidebarInset className="relative flex h-svh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <SiteHeader
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          syncPending={syncUiPending}
          onSync={() => syncMutation.mutate()}
        />
        {showMainPaneSpinner ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-14 z-20 flex items-center justify-center bg-background/75 backdrop-blur-[1px]"
            aria-busy="true"
            aria-label="Loading"
          >
            <Loader2
              className="size-9 animate-spin text-muted-foreground motion-reduce:animate-none"
              aria-hidden
            />
          </div>
        ) : null}
        <motion.div
          key={isGlobalView ? "pane-global" : `pane-${sessionId ?? ""}`}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 md:p-6"
          initial={reduceMotion ? false : { opacity: 0.88, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.22, ease: [0.25, 1, 0.5, 1] }
          }
        >
          <div className="min-h-0 flex-1">
            <div className="mb-6 border-b border-border pb-4">
              {isGlobalView ? (
                <div className="space-y-1.5">
                  <h2 className="text-lg font-medium tracking-tight">
                    Global stats
                  </h2>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Totals and charts across every session in your local
                    database.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="min-w-0 font-mono text-[11px] text-muted-foreground">
                        <span className="break-all align-middle">
                          {selectedSession?.conversationId ?? sessionId}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-1 inline-flex size-7 shrink-0 align-middle text-muted-foreground"
                          aria-label="Copy conversation ID"
                          onClick={() => {
                            void navigator.clipboard?.writeText(sessionId);
                            toast.success("Conversation ID copied");
                          }}
                        >
                          <Copy className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                      <h2 className="text-lg font-medium tracking-tight">
                        {selectedSession?.label || "Untitled session"}
                      </h2>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          Last event{" "}
                          {selectedSession
                            ? formatTimestampHuman(selectedSession.lastEventAt)
                            : "—"}
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
                </div>
              )}
            </div>

            {isGlobalView ? (
              <GlobalStatsSection
                data={globalStatsQuery.data}
                isLoading={globalStatsQuery.isLoading}
                errorMessage={
                  globalStatsQuery.error
                    ? globalStatsQuery.error.message
                    : null
                }
                onSelectSession={(conversationId) => {
                  void navigate(sessionPath(conversationId));
                }}
              />
            ) : eventsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">
                Loading stored events…
              </p>
            ) : eventsQuery.error ? (
              <p className="text-sm text-destructive">
                Events didn&apos;t load. {eventsQuery.error.message}
              </p>
            ) : !events.length ? (
              <p className="text-sm text-muted-foreground">
                This session has no stored events yet. Use{" "}
                <span className="font-medium text-foreground/90">
                  Import latest
                </span>{" "}
                if Cursor has already written hooks to disk.
              </p>
            ) : visibleEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing matches these filters. Open Filters and turn more hook
                or tool types back on.
              </p>
            ) : (
              <ul className="space-y-4 pb-8">
                {visibleEvents.map((e) => (
                  <li key={e.id}>
                    <EventCard
                      event={e}
                      selectedConversationId={sessionId!}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  );
}
