import {
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { showTrpcErrorToast } from "@/lib/trpc-user-error";

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.meta?.skipTrpcErrorToast) return;
        showTrpcErrorToast(error);
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _variables, _onMutateResult, mutation) => {
        if (mutation.meta?.skipTrpcErrorToast) return;
        showTrpcErrorToast(error);
      },
    }),
  });
}
