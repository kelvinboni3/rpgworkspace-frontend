export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}`,
  campaign: (campaignId: string) => `/campaigns/${campaignId}`,
  character: (characterId: string) => `/characters/${characterId}`,
} as const;
