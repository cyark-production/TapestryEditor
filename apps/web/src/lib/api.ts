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
type LanguageMeta = { label: string; rtl: boolean };

let languageCache: Record<string, string> | null = null;
let languageMetaCache: Record<string, LanguageMeta> | null = null;

async function ensureLanguageCaches(): Promise<void> {
  if (languageCache && languageMetaCache) return;
  try {
    await ensureSignedIn();
  } catch {
    // ignore sign-in errors here; request may still work for cached tokens
  }
  try {
    const res = await api.get('/languages');
    const map: Record<string, string> = {};
    const meta: Record<string, LanguageMeta> = {};
    for (const row of res.data || []) {
      if (!row?.code) continue;
      const code = String(row.code).trim();
      if (!code) continue;
      const englishName = (row?.englishName || row?.name || "").toString().trim();
      const label = englishName || code;
      const rtlSource = row?.right_to_left ?? row?.rightToLeft ?? row?.rtl ?? row?.isRTL ?? row?.is_rtl;
      const rtl = typeof rtlSource === "string"
        ? rtlSource === "1" || rtlSource.toLowerCase() === "true"
        : Boolean(rtlSource);
      map[code] = label;
      meta[code] = { label, rtl };
    }
    languageCache = map;
    languageMetaCache = meta;
  } catch {
    if (!languageCache) languageCache = {};
    if (!languageMetaCache) languageMetaCache = {};
  }
}

export async function getLanguageNames(): Promise<Record<string, string>> {
  await ensureLanguageCaches();
  return languageCache || {};
}

export async function resolveLanguageName(code?: string | null): Promise<string | null> {
  if (!code) return null;
  await ensureLanguageCaches();
  return languageCache?.[code.trim()] || code;
}

export async function resolveLanguageMeta(code?: string | null): Promise<LanguageMeta | null> {
  if (!code) return null;
  await ensureLanguageCaches();
  const trimmed = code.trim();
  if (!trimmed) return null;
  const meta = languageMetaCache?.[trimmed];
  if (meta) return meta;
  const label = languageCache?.[trimmed] || trimmed;
  return { label, rtl: false };
}


