"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { clearAuthSession, readAuthSession, writeAuthSession, type AuthSession } from "@/lib/auth-storage";
import { getCurrentUser, refreshAccessToken } from "@/lib/api";
import { AuthUser } from "@/types/auth";

interface AuthContextValue {
  accessToken: string | null;
  isReady: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  getValidAccessToken: () => Promise<string | null>;
  signIn: (session: AuthSession) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initializeSession() {
      const session = readAuthSession();

      if (!session) {
        if (!isCancelled) {
          setAccessToken(null);
          setUser(null);
          setIsReady(true);
        }
        return;
      }

      const nextSession = await hydrateSession(session);

      if (isCancelled) {
        return;
      }

      if (!nextSession) {
        clearAuthSession();
        setAccessToken(null);
        setUser(null);
        setIsReady(true);
        return;
      }

      writeAuthSession(nextSession);
      setAccessToken(nextSession.access);
      setUser(nextSession.user);
      setIsReady(true);
    }

    void initializeSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const hydrateSession = useCallback(async (session: AuthSession): Promise<AuthSession | null> => {
    try {
      const nextUser = await getCurrentUser(session.access);
      return { ...session, user: nextUser };
    } catch {
      try {
        const refreshed = await refreshAccessToken(session.refresh);
        const nextAccess = refreshed.access;
        const nextRefresh = refreshed.refresh ?? session.refresh;
        const nextUser = await getCurrentUser(nextAccess);

        return {
          ...session,
          access: nextAccess,
          refresh: nextRefresh,
          user: nextUser,
        };
      } catch {
        return null;
      }
    }
  }, []);

  const getValidAccessToken = useCallback(async () => {
    const session = readAuthSession();
    if (!session) {
      setUser(null);
      setAccessToken(null);
      return null;
    }

    const nextSession = await hydrateSession(session);

    if (!nextSession) {
      clearAuthSession();
      setUser(null);
      setAccessToken(null);
      return null;
    }

    writeAuthSession(nextSession);
    setUser(nextSession.user);
    setAccessToken(nextSession.access);
    return nextSession.access;
  }, [hydrateSession]);

  const refreshUser = useCallback(async () => {
    await getValidAccessToken();
  }, [getValidAccessToken]);

  const signIn = useCallback((session: AuthSession) => {
    writeAuthSession(session);
    setAccessToken(session.access);
    setUser(session.user);
  }, []);

  const signOut = useCallback(() => {
    clearAuthSession();
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      getValidAccessToken,
      isReady,
      isAuthenticated: Boolean(accessToken && user),
      user,
      signIn,
      signOut,
      refreshUser,
    }),
    [accessToken, getValidAccessToken, isReady, refreshUser, signIn, signOut, user]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
