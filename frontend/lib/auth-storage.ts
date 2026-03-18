import { AuthUser } from "@/types/auth";

const STORAGE_KEY = "found-auth-session";
const KNOWN_ACCOUNT_KEY = "found-known-account";

export interface AuthSession {
  access: string;
  refresh: string;
  user: AuthUser;
}

export function readAuthSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function writeAuthSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}

export function readKnownAccount() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(KNOWN_ACCOUNT_KEY) === "true";
}

export function writeKnownAccount(value: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.localStorage.setItem(KNOWN_ACCOUNT_KEY, "true");
    return;
  }

  window.localStorage.removeItem(KNOWN_ACCOUNT_KEY);
}
