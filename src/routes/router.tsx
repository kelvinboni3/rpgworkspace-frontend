import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/layouts/app-layout";
import { AppHomePage } from "@/pages/app-home-page";
import { CampaignDetailPage } from "@/pages/campaign-detail-page";
import { CharacterDetailPage } from "@/pages/character-detail-page";
import { GmAreaComingSoonPage } from "@/pages/gm-area-coming-soon-page";
import { LoginPage } from "@/pages/login-page";
import { MyCharactersPage } from "@/pages/my-characters-page";
import { RegisterPage } from "@/pages/register-page";
import { SubscriptionPage } from "@/pages/subscription-page";
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
            element: <MyCharactersPage />,
          },
          {
            path: "characters",
            element: <MyCharactersPage />,
          },
          {
            path: "characters/:characterId",
            element: <CharacterDetailPage />,
          },
          {
            path: "gm",
            element: <GmAreaComingSoonPage />,
          },
          {
            path: "gm/workspaces",
            element: <AppHomePage />,
          },
          {
            path: "workspaces/:workspaceId",
            element: <WorkspaceDetailPage />,
          },
          {
            path: "campaigns/:campaignId",
            element: <CampaignDetailPage />,
          },
          {
            path: "subscription",
            element: <SubscriptionPage />,
          },
        ],
      },
    ],
  },
]);
