const ACCESS_TOKEN_KEY = "rpg-workspace-access-token";
const USER_KEY = "rpg-workspace-user";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  defaultCharacterId: string | null;
};

export const authStore = {
  getAccessToken() {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getUser() {
    const storedUser = localStorage.getItem(USER_KEY);

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as AuthUser;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  },
  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  setUser(user: AuthUser) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setSession(token: string, user: AuthUser) {
    this.setAccessToken(token);
    this.setUser(user);
  },
  clearAccessToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
  clearSession() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isAuthenticated() {
    return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  },
};
