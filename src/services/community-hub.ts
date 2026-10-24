import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { authStore } from "@/store/auth-store";

// O hub mora ao lado da API: ".../api" → ".../hubs/community" (em produção "/api" vira "/hubs/community",
// mesma origem via Caddy).
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? "/api";
const HUB_URL = `${API_BASE_URL.replace(/\/api\/?$/, "")}/hubs/community`;

export function createCommunityHub() {
  return new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      // WebSocket não carrega header Authorization: o token vai em ?access_token= (aceito só em /hubs).
      accessTokenFactory: () => authStore.getAccessToken() ?? "",
      // Sem cookies — a auth é só o JWT, e assim o CORS de dev não precisa de AllowCredentials.
      withCredentials: false,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 20000, 30000])
    .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
    .build();
}
