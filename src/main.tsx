import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { AppProviders } from "@/app/providers";
import { registerServiceWorker } from "@/app/register-sw";
import { router } from "@/routes/router";
import { initAnalytics } from "@/services/analytics";
import "@/app/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);

registerServiceWorker();
initAnalytics();
