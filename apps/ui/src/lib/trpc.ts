import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@steno/api";

const trpcUrl =
  import.meta.env.VITE_TRPC_URL?.trim() ||
  (import.meta.env.PROD ? "/trpc" : "http://127.0.0.1:8787/trpc");

export const trpc = createTRPCReact<AppRouter>();

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: trpcUrl,
      }),
    ],
  });
}
