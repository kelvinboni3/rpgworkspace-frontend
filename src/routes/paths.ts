export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}`,
  campaign: (campaignId: string) => `/campaigns/${campaignId}`,
} as const;
