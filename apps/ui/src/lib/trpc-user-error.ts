import { TRPCClientError } from "@trpc/client";
import type { AppRouter } from "@steno/api";
import { toast } from "sonner";

const NETWORK_USER_MESSAGE =
  "Cannot reach the Steno server. Is it running?";

function isLikelyNetworkFailureMessage(message: string): boolean {
  const m = message.trim();
  return (
    m === "Failed to fetch" ||
    m === "Load failed" ||
    m.includes("NetworkError") ||
    m.includes("network error")
  );
}

export function isTrpcClientError(
  error: unknown,
): error is TRPCClientError<AppRouter> {
  return error instanceof TRPCClientError;
}

export function getTrpcUserErrorMessage(error: unknown): string {
  if (isTrpcClientError(error)) {
    const raw = error.message?.trim() ?? "";
    if (raw && isLikelyNetworkFailureMessage(raw)) {
      return NETWORK_USER_MESSAGE;
    }
    if (raw) return raw;
    return "Request failed";
  }
  if (error instanceof Error) {
    const raw = error.message;
    if (raw && isLikelyNetworkFailureMessage(raw)) {
      return NETWORK_USER_MESSAGE;
    }
    if (raw.trim()) return raw;
  }
  return "Something went wrong";
}

function toastIdForMessage(message: string): string {
  if (message === NETWORK_USER_MESSAGE) {
    return "trpc-error:network";
  }
  const key = message.length > 120 ? message.slice(0, 120) : message;
  return `trpc-error:${key}`;
}

export function showTrpcErrorToast(error: unknown): void {
  const message = getTrpcUserErrorMessage(error);
  toast.error(message, { id: toastIdForMessage(message) });
}
