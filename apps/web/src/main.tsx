import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";

import { router } from "./app/routes";
import { AuthProvider } from "./context/AuthContext";
import { I18nProvider } from "./i18n";
import "./styles.css";

const container = document.getElementById("root");
const dashboardThemeStorageKey = "itdcc.dashboardTheme";

try {
  document.documentElement.dataset.theme = "light";
  window.localStorage.setItem(dashboardThemeStorageKey, "light");
} catch {
  document.documentElement.dataset.theme = "light";
}

if (!container) {
  throw new Error("Root container '#root' was not found.");
}

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </I18nProvider>
  </StrictMode>
);
