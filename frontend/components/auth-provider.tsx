"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  clearAuthSession,
  readAuthSession,
  readKnownAccount,
  writeAuthSession,
  writeKnownAccount,
  type AuthSession,
} from "@/lib/auth-storage";
import { getCurrentUser, refreshAccessToken } from "@/lib/api";
import { AuthUser } from "@/types/auth";

interface AuthContextValue {
  accessToken: string | null;
  hasKnownAccount: boolean;
  isReady: boolean;
  isAuthenticated: boolean;
  isRedirecting: boolean;
  user: AuthUser | null;
  getValidAccessToken: () => Promise<string | null>;
  setRedirecting: (value: boolean) => void;
  signIn: (session: AuthSession) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isRedirecting, setRedirecting] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [hasKnownAccount, setHasKnownAccount] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function initializeSession() {
      const session = readAuthSession();
      const knownAccount = readKnownAccount();

      if (!session) {
        if (!isCancelled) {
          setAccessToken(null);
          setHasKnownAccount(knownAccount);
          setUser(null);
          setIsReady(true);
        }
        return;
      }

      if (!isCancelled) {
        setHasKnownAccount(true);
      }

      const nextSession = await hydrateSession(session);

      if (isCancelled) {
        return;
      }

      if (!nextSession) {
        clearAuthSession();
        setAccessToken(null);
        setHasKnownAccount(true);
        setUser(null);
        setIsReady(true);
        return;
      }

      writeAuthSession(nextSession);
      writeKnownAccount(true);
      setAccessToken(nextSession.access);
      setHasKnownAccount(true);
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
      setHasKnownAccount(readKnownAccount());
      setUser(null);
      setAccessToken(null);
      return null;
    }

    const nextSession = await hydrateSession(session);

    if (!nextSession) {
      clearAuthSession();
      setHasKnownAccount(true);
      setUser(null);
      setAccessToken(null);
      return null;
    }

    writeAuthSession(nextSession);
    writeKnownAccount(true);
    setHasKnownAccount(true);
    setUser(nextSession.user);
    setAccessToken(nextSession.access);
    return nextSession.access;
  }, [hydrateSession]);

  const refreshUser = useCallback(async () => {
    await getValidAccessToken();
  }, [getValidAccessToken]);

  const signIn = useCallback((session: AuthSession) => {
    writeAuthSession(session);
    writeKnownAccount(true);
    setAccessToken(session.access);
    setHasKnownAccount(true);
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
      hasKnownAccount,
      getValidAccessToken,
      isReady,
      isAuthenticated: Boolean(accessToken && user),
      isRedirecting,
      user,
      setRedirecting,
      signIn,
      signOut,
      refreshUser,
    }),
    [accessToken, getValidAccessToken, hasKnownAccount, isReady, isRedirecting, refreshUser, signIn, signOut, user]
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
