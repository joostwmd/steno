import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      skipTrpcErrorToast?: boolean;
    };
    mutationMeta: {
      skipTrpcErrorToast?: boolean;
    };
  }
}
