import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type { EventRow, ParsedDetail } from "./types";

function rowToDebugObject(event: EventRow, detail: ParsedDetail): object {
  return {
    id: event.id,
    receivedAt: event.receivedAt,
    schemaVersion: event.schemaVersion,
    hookEventName: event.hookEventName,
    kind: event.kind,
    conversationId: event.conversationId,
    generationId: event.generationId,
    model: event.model,
    cursorVersion: event.cursorVersion,
    workspaceRoots: event.workspaceRoots,
    userEmail: event.userEmail,
    transcriptPath: event.transcriptPath,
    detail,
  };
}

export function RawEventJson({
  event,
  detail,
  className,
}: {
  event: EventRow;
  detail: ParsedDetail;
  className?: string;
}) {
  const code = JSON.stringify(rowToDebugObject(event, detail), null, 2);
  return (
    <Collapsible className={cn("group mt-3", className)} defaultOpen={false}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-full border border-border/70 bg-muted/40 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60">
        <ChevronDownIcon className="size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180" />
        Debug · full JSON
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 overflow-hidden rounded-xl border border-border/60">
        <CodeBlock code={code} language="json" />
      </CollapsibleContent>
    </Collapsible>
  );
}
