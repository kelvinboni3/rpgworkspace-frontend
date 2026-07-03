import { isAxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api";

export function extractErrorMessage(
  error: unknown,
  fallback = "Algo deu errado. Tente novamente.",
  translations: Record<string, string> = {},
) {
  if (isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data?.message;
    if (!message) return fallback;
    return translations[message] ?? message;
  }

  return fallback;
}
