import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/layouts/app-layout";
import { AppHomePage } from "@/pages/app-home-page";
import { LoginPage } from "@/pages/login-page";
import { paths } from "@/routes/paths";
import { ProtectedRoute } from "@/routes/protected-route";

export const router = createBrowserRouter([
  {
    path: paths.login,
    element: <LoginPage />,
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
        ],
      },
    ],
  },
]);
