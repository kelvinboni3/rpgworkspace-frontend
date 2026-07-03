import axios from "axios";
import { authStore } from "@/store/auth-store";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = authStore.getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint =
      typeof error.config?.url === "string" && error.config.url.includes("/auth/");

    if (error.response?.status === 401 && !isAuthEndpoint && authStore.isAuthenticated()) {
      authStore.clearSession();
      window.location.assign("/login");
    }

    return Promise.reject(error);
  },
);
