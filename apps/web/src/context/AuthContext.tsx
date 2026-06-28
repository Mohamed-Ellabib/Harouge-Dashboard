import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren
} from "react";

import { ApiError, api, type Session } from "../api/client";

type AuthContextValue = {
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  hasPermission: (...permissionCodes: string[]) => boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  session: Session | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshSession() {
    try {
      const currentSession = await api.getSession();
      setSession(currentSession);
    } catch (error) {
      setSession(null);

      if (!(error instanceof ApiError && error.status === 401)) {
        console.warn("Session refresh failed.", error);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  useEffect(() => {
    if (!session) {
      api.stopBackgroundSync();
      return;
    }

    api.startBackgroundSync(session);

    return () => {
      api.stopBackgroundSync();
    };
  }, [session?.mustChangePassword, session?.roleCode, session?.userId]);

  async function login(email: string, password: string) {
    const currentSession = await api.login(email, password);
    setSession(currentSession);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const currentSession = await api.changePassword({
      currentPassword,
      newPassword
    });
    setSession(currentSession);
  }

  async function logout() {
    await api.logout();
    setSession(null);
  }

  function hasPermission(...permissionCodes: string[]) {
    if (!session) {
      return false;
    }

    return permissionCodes.some((permissionCode) =>
      session.permissionCodes.includes(permissionCode)
    );
  }

  return (
    <AuthContext.Provider
      value={{
        changePassword,
        hasPermission,
        isLoading,
        login,
        logout,
        refreshSession,
        session
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
