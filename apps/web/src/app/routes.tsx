import { Navigate, createBrowserRouter, useLocation } from "react-router-dom";

import { LoginPage } from "../features/auth/LoginPage";
import { PasswordChangeRequired } from "../features/auth/PasswordChangeRequired";
import { DashboardShell } from "../features/dashboard/DashboardShell";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n";

function ProtectedHomePage() {
  const { isLoading, logout, session } = useAuth();
  const { t } = useI18n();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="dashboard-loading">
        <section>
          <p>{t("dashboard.loading.checkingSession")}</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <Navigate replace to="/login" />;
  }

  if (session.mustChangePassword) {
    return <PasswordChangeRequired />;
  }

  if (session.roleCode === "employee" && location.pathname === "/dashboard") {
    return <Navigate replace to="/my-tasks" />;
  }

  return <DashboardShell onSignOut={logout} session={session} />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />
  },
  {
    path: "/",
    element: <Navigate replace to="/dashboard" />
  },
  {
    path: "/dashboard",
    element: <ProtectedHomePage />
  },
  {
    path: "/project-progress",
    element: <ProtectedHomePage />
  },
  {
    path: "/sprints",
    element: <ProtectedHomePage />
  },
  {
    path: "/sprints/:areaKey",
    element: <ProtectedHomePage />
  },
  {
    path: "/sprint-items",
    element: <ProtectedHomePage />
  },
  {
    path: "/my-tasks",
    element: <ProtectedHomePage />
  },
  {
    path: "/users",
    element: <ProtectedHomePage />
  },
  {
    path: "/audit-logs",
    element: <ProtectedHomePage />
  },
  {
    path: "/reports",
    element: <ProtectedHomePage />
  },
  {
    path: "/settings",
    element: <ProtectedHomePage />
  },
  {
    path: "*",
    element: <Navigate replace to="/dashboard" />
  }
]);
