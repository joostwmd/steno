import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HOME_PATH, sessionPath } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { BarChart3, MoreVerticalIcon } from "lucide-react";
import { Link } from "react-router-dom";

const ACTIVE_SESSION_MS = 60_000;

export type SessionRow = {
  conversationId: string;
  label: string | null;
  lastEventAt: string;
  eventCount: number;
};

function isSessionActiveRecently(lastEventAt: string): boolean {
  const t = new Date(lastEventAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= ACTIVE_SESSION_MS;
}

function SessionMenuRow({
  session: s,
  activeSessionId,
  isPinned,
  onPin,
  onUnpin,
  onRequestRename,
  onBlock,
  actionsPending,
}: {
  session: SessionRow;
  activeSessionId: string | undefined;
  isPinned: boolean;
  onPin: (conversationId: string) => void;
  onUnpin: (conversationId: string) => void;
  onRequestRename: (
    conversationId: string,
    currentLabel: string | null,
  ) => void;
  onBlock: (conversationId: string) => void;
  actionsPending: boolean;
}) {
  const recentlyActive = isSessionActiveRecently(s.lastEventAt);
  const isSelected = activeSessionId === s.conversationId;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isSelected}
        className={cn(
          "relative h-auto min-h-0 overflow-hidden py-2 pr-11",
          isSelected ? "pl-3" : "pl-2",
          "items-center text-left",
          isSelected &&
          "!bg-[var(--sidebar-selection)] !text-[var(--sidebar-selection-foreground)] hover:!bg-[var(--sidebar-selection)] hover:!text-[var(--sidebar-selection-foreground)]",
        )}
      >
        <Link to={sessionPath(s.conversationId)} className="flex w-full min-w-0 items-center gap-0">
          {recentlyActive ? (
            <span
              aria-hidden
              title="Events in the last minute"
              className="animate-session-active-dot size-2 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400"
            />
          ) : null}
          <div
            className={cn(
              "min-w-0 flex-1 shrink truncate text-left text-[13px] font-normal leading-tight",
              isSelected
                ? "text-[var(--sidebar-selection-foreground)]"
                : "text-sidebar-foreground",
            )}
            title={s.label || "Untitled session"}
          >
            {s.label || "Untitled session"}
          </div>
        </Link>
      </SidebarMenuButton>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            showOnHover
            disabled={actionsPending}
            aria-label="Session actions"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <MoreVerticalIcon />
          </SidebarMenuAction>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {isPinned ? (
            <DropdownMenuItem
              disabled={actionsPending}
              onSelect={() => onUnpin(s.conversationId)}
            >
              Unpin
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={actionsPending}
              onSelect={() => onPin(s.conversationId)}
            >
              Pin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            disabled={actionsPending}
            onSelect={() =>
              onRequestRename(s.conversationId, s.label)
            }
          >
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={actionsPending}
            onSelect={() => onBlock(s.conversationId)}
          >
            Ignore on import
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}

type AppSidebarProps = {
  /** Current session from the URL, or `undefined` on home (global stats). */
  activeSessionId: string | undefined;
  pinnedSessions: SessionRow[] | undefined;
  unpinnedSessions: SessionRow[] | undefined;
  isLoading: boolean;
  errorMessage: string | null;
  onPin: (conversationId: string) => void;
  onUnpin: (conversationId: string) => void;
  onRequestRename: (
    conversationId: string,
    currentLabel: string | null,
  ) => void;
  onBlock: (conversationId: string) => void;
  actionsPending: boolean;
};

export function AppSidebar({
  activeSessionId,
  pinnedSessions,
  unpinnedSessions,
  isLoading,
  errorMessage,
  onPin,
  onUnpin,
  onRequestRename,
  onBlock,
  actionsPending,
}: AppSidebarProps) {
  const rowProps = {
    activeSessionId,
    onPin,
    onUnpin,
    onRequestRename,
    onBlock,
    actionsPending,
  };

  return (
    <Sidebar>
      <SidebarHeader className="min-h-14 shrink-0 flex-col items-stretch justify-center gap-0.5  px-3 py-2.5">
        <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
          Steno
        </span>
        <span className="text-[11px] leading-snug text-muted-foreground">
          Local Cursor telemetry
        </span>
      </SidebarHeader>
      <SidebarContent className="min-h-0 flex-1 gap-0 overflow-y-auto">
        <SidebarGroup className="border-b border-sidebar-border pb-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={activeSessionId === undefined}
                  className={cn(
                    "h-auto min-h-0 py-2 pl-2 pr-2",
                    activeSessionId === undefined &&
                    "!bg-[var(--sidebar-selection)] !text-[var(--sidebar-selection-foreground)] hover:!bg-[var(--sidebar-selection)] hover:!text-[var(--sidebar-selection-foreground)]",
                  )}
                >
                  <Link
                    to={HOME_PATH}
                    className="flex w-full min-w-0 items-center gap-2"
                  >
                    <BarChart3
                      className="size-4 shrink-0 text-sidebar-foreground/80"
                      aria-hidden
                    />
                    <span className="truncate text-left text-[13px] font-medium">
                      Global stats
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isLoading ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Loading sessions…
          </p>
        ) : errorMessage ? (
          <p className="px-4 py-3 text-xs text-destructive">
            Sessions didn&apos;t load. {errorMessage}
          </p>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Pinned</SidebarGroupLabel>
              <SidebarGroupContent>
                {!pinnedSessions?.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    Pin a session from its ··· menu to keep it here.
                  </p>
                ) : (
                  <SidebarMenu>
                    {pinnedSessions.map((s) => (
                      <SessionMenuRow
                        key={s.conversationId}
                        session={s}
                        isPinned
                        {...rowProps}
                      />
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Sessions</SidebarGroupLabel>
              <SidebarGroupContent>
                {!unpinnedSessions?.length ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    {(pinnedSessions?.length ?? 0) > 0
                      ? "Nothing else imported yet."
                      : "Nothing imported yet. Use hooks in Cursor, then Import latest (top right)."}
                  </p>
                ) : (
                  <SidebarMenu>
                    {unpinnedSessions.map((s) => (
                      <SessionMenuRow
                        key={s.conversationId}
                        session={s}
                        isPinned={false}
                        {...rowProps}
                      />
                    ))}
                  </SidebarMenu>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
