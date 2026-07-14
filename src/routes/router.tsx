import { createBrowserRouter } from "react-router";
import { AppLayout } from "@/layouts/app-layout";
import { AppHomePage } from "@/pages/app-home-page";
import { CampaignDetailPage } from "@/pages/campaign-detail-page";
import { CharacterDetailPage } from "@/pages/character-detail-page";
import { ForgotPasswordPage } from "@/pages/forgot-password-page";
import { GmAreaComingSoonPage } from "@/pages/gm-area-coming-soon-page";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage } from "@/pages/login-page";
import { MyCharactersPage } from "@/pages/my-characters-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { PublicCharacterPage } from "@/pages/public-character-page";
import { RegisterPage } from "@/pages/register-page";
import { ResetPasswordPage } from "@/pages/reset-password-page";
import { TermsPage } from "@/pages/terms-page";
import { SubscriptionPage } from "@/pages/subscription-page";
import { WorkspaceDetailPage } from "@/pages/workspace-detail-page";
import { paths } from "@/routes/paths";
import { ProtectedRoute } from "@/routes/protected-route";

export const router = createBrowserRouter([
  {
    path: paths.landing,
    element: <LandingPage />,
  },
  {
    path: "c/:token",
    element: <PublicCharacterPage />,
  },
  {
    path: paths.terms,
    element: <TermsPage />,
  },
  {
    path: paths.privacy,
    element: <PrivacyPage />,
  },
  {
    path: paths.login,
    element: <LoginPage />,
  },
  {
    path: paths.register,
    element: <RegisterPage />,
  },
  {
    path: paths.forgotPassword,
    element: <ForgotPasswordPage />,
  },
  {
    path: paths.resetPassword,
    element: <ResetPasswordPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
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
