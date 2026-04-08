import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import App from "./App.js";
import "./index.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { createQueryClient } from "@/lib/query-client.js";
import { createTrpcClient, trpc } from "./lib/trpc.js";

function Root() {
  const [queryClient] = useState(() => createQueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="steno-ui-theme">
          <TooltipProvider delayDuration={0}>
            <App />
          </TooltipProvider>
          <Toaster richColors theme="system" />
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
