import { authStore } from "@/store/auth-store";

export function useAuth() {
  return authStore;
}
