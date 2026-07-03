export const paths = {
  home: "/",
  login: "/login",
  register: "/register",
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}`,
} as const;
