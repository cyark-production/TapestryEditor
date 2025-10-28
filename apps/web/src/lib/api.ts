"use client";
import axios from "axios";
import { msalInstance, defaultScopes } from "../providers";

export const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000" });

export async function ensureSignedIn(scopesOverride?: string[]) {
  const scopes = scopesOverride && scopesOverride.length ? scopesOverride : defaultScopes;
  await msalInstance.initialize();
  let account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
  try {
    if (!account) {
      const resp = await msalInstance.loginPopup({ scopes });
      account = resp.account!;
      msalInstance.setActiveAccount(account);
    }
  } catch (e: any) {
    // If a popup interaction is already in progress, surface a clearer error
    const code = e?.errorCode || e?.code;
    if (code === "interaction_in_progress") {
      throw new Error("A sign-in window is already open. Please complete it or refresh the page.");
    }
    // Fall back to redirect for environments that block popups
    await msalInstance.loginRedirect({ scopes });
    return;
  }
  const token = await msalInstance.acquireTokenSilent({ account, scopes });
  api.defaults.headers.common["Authorization"] = `Bearer ${token.accessToken}`;
}

// Attach token silently if a user is already signed in. Never triggers interactive flows.
export async function attachTokenIfSignedIn(scopesOverride?: string[]): Promise<boolean> {
  const scopes = scopesOverride && scopesOverride.length ? scopesOverride : defaultScopes;
  try {
    await msalInstance.initialize();
    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) return false;
    const token = await msalInstance.acquireTokenSilent({ account, scopes });
    api.defaults.headers.common["Authorization"] = `Bearer ${token.accessToken}`;
    return true;
  } catch {
    return false;
  }
}

export const SELECTED_TAPESTRY_EVENT = "tapestry:selected";
const SELECTED_TAPESTRY_KEY = "selected_tapestry_id";
export function getSelectedTapestryId(): number | null {
  const s = typeof window !== "undefined" ? window.localStorage.getItem(SELECTED_TAPESTRY_KEY) : null;
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
export function setSelectedTapestryId(id: number | null) {
  if (typeof window === "undefined") return;
  if (id == null) {
    window.localStorage.removeItem(SELECTED_TAPESTRY_KEY);
  } else {
    window.localStorage.setItem(SELECTED_TAPESTRY_KEY, String(id));
  }
  try {
    window.dispatchEvent(new CustomEvent(SELECTED_TAPESTRY_EVENT, { detail: id ?? null }));
  } catch {}
}

// Language name resolver (code -> english name), cached client-side
let languageCache: Record<string, string> | null = null;
export async function getLanguageNames(): Promise<Record<string, string>> {
  if (languageCache) return languageCache;
  try {
    await ensureSignedIn();
    const res = await api.get('/languages');
    const map: Record<string, string> = {};
    for (const row of res.data || []) {
      if (row?.code) map[String(row.code).trim()] = (row?.name || String(row.code)).trim();
    }
    languageCache = map;
    return map;
  } catch {
    return {};
  }
}

export async function resolveLanguageName(code?: string | null): Promise<string | null> {
  if (!code) return null;
  const map = await getLanguageNames();
  return map[code.trim()] || code;
}


