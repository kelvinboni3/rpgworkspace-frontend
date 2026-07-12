export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  characters: "/characters",
  gmArea: "/gm",
  gmWorkspaces: "/gm/workspaces",
  subscription: "/subscription",
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}`,
  campaign: (campaignId: string) => `/campaigns/${campaignId}`,
  character: (characterId: string) => `/characters/${characterId}`,
} as const;
