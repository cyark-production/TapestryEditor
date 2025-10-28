"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Providers } from "../providers";
import { getSelectedTapestryId, SELECTED_TAPESTRY_EVENT, api, attachTokenIfSignedIn } from "../lib/api";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import "../styles/legacy.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const pathname = usePathname();
  const [selectedMeta, setSelectedMeta] = useState<{ id: number; title?: string | null; prettyId?: string | null } | null>(null);

  useEffect(() => {
    // Initialize from storage after mount to avoid hydration mismatch
    setSelectedId(getSelectedTapestryId());
    function onSelected(e: Event) {
      const ce = e as CustomEvent<number | null>;
      if (typeof ce.detail === 'number' || ce.detail === null) {
        setSelectedId(ce.detail);
      } else {
        setSelectedId(getSelectedTapestryId());
      }
    }
    window.addEventListener(SELECTED_TAPESTRY_EVENT, onSelected as EventListener);
    return () => window.removeEventListener(SELECTED_TAPESTRY_EVENT, onSelected as EventListener);
  }, []);

  useEffect(() => {
    // Load identity if already signed in (no interactive prompt from layout)
    (async () => {
      const hasToken = await attachTokenIfSignedIn();
      if (!hasToken) return;
      try {
        const res = await api.get('/auth/me');
        setMe(res.data);
      } catch {
        // ignore
      }
    })();
  }, []);
  useEffect(() => {
    (async () => {
      const id = getSelectedTapestryId();
      if (!id) { setSelectedMeta(null); return; }
      try {
        await ensureSignedIn();
        const res = await api.get(`/tapestries/${id}`);
        setSelectedMeta({ id, title: res.data?.title, prettyId: res.data?.prettyId });
      } catch { setSelectedMeta(null); }
    })();
  }, [selectedId, pathname]);
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          {pathname !== '/' && (
            <nav style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '16px 32px', 
              background: 'white',
              borderBottom: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginRight: 16
                }}>
                  <Image 
                    src="/tapestry_logo_black.png" 
                    alt="Tapestry" 
                    width={120}
                    height={24}
                    style={{ 
                      height: 24,
                      width: 'auto'
                    }}
                  />
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: 600, 
                    color: 'var(--text-secondary)',
                    borderLeft: '2px solid var(--border)',
                    paddingLeft: 12
                  }}>
                    Editor
                  </span>
                </div>
                {/* Home removed per request */}
                <Link href="/tapestries" style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: pathname === '/tapestries' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}>Tapestry List</Link>
                <Link href="/analytics" style={{ 
                  padding: '8px 16px', 
                  borderRadius: '8px',
                  textDecoration: 'none',
                  color: pathname === '/analytics' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}>Analytics</Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: me ? 1 : 0.6 }}>
                {selectedMeta && (
                  <div style={{ 
                    background: 'var(--bg-tertiary)', 
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}>
                    📍 {selectedMeta.title || selectedMeta.prettyId || `#${selectedMeta.id}`}
                  </div>
                )}
                {me ? (
                  <>
                  <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {me.name || me.sub} • <span style={{ color: 'var(--primary)', fontWeight: 500 }}>{(me.roles || []).join(', ') || 'No Role'}</span>
                    </span>
                    <button className="btn" onClick={() => {
                      // best-effort logout: clear token cache and reload to sign-in page
                      try { localStorage.removeItem('msal.token.cache'); } catch {}
                      try { sessionStorage.clear(); localStorage.removeItem('selectedTapestryId'); } catch {}
                      window.location.href = '/';
                    }}>Logout</button>
                  </>
                ) : (
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Not signed in</span>
                )}
              </div>
            </nav>
          )}
          {children}
        </Providers>
      </body>
    </html>
  );
}

