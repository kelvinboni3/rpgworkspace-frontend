import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/layouts/app-layout";
import { AppHomePage } from "@/pages/app-home-page";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";
import { WorkspaceDetailPage } from "@/pages/workspace-detail-page";
import { paths } from "@/routes/paths";
import { ProtectedRoute } from "@/routes/protected-route";

export const router = createBrowserRouter([
  {
    path: paths.login,
    element: <LoginPage />,
  },
  {
    path: paths.register,
    element: <RegisterPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <AppHomePage />,
          },
          {
            path: "workspaces/:workspaceId",
            element: <WorkspaceDetailPage />,
          },
        ],
      },
    ],
  },
]);
