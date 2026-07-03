import { isAxiosError } from "axios";
import type { ApiErrorResponse } from "@/types/api";

export function extractErrorMessage(
  error: unknown,
  fallback = "Algo deu errado. Tente novamente.",
) {
  if (isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback;
  }

  return fallback;
}
