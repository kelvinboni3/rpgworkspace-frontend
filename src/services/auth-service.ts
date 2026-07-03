import { apiClient } from "@/services/api-client";

export type AuthResponse = {
  accessToken: string;
  userId: string;
  name: string;
  email: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = LoginRequest & {
  name: string;
};

export const AuthService = {
  async login(data: LoginRequest) {
    const response = await apiClient.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  async register(data: RegisterRequest) {
    const response = await apiClient.post<AuthResponse>("/auth/register", data);
    return response.data;
  },
};
