import { apiClient } from "@/services/api-client";

export type AuthResponse = {
  accessToken: string;
  userId: string;
  name: string;
  email: string;
  defaultCharacterId: string | null;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = LoginRequest & {
  name: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
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

  async forgotPassword(data: ForgotPasswordRequest) {
    const response = await apiClient.post<{ message: string }>("/auth/forgot-password", data);
    return response.data;
  },

  async resetPassword(data: ResetPasswordRequest) {
    const response = await apiClient.post<{ message: string }>("/auth/reset-password", data);
    return response.data;
  },
};
