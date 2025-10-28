"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, ensureSignedIn, setSelectedTapestryId } from "../../lib/api";

export default function TapestriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>([]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const meRes = await api.get("/auth/me");
      setMe(meRes.data);
      const res = await api.get("/tapestries");
      setItems(res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to load (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // load favorites from local storage
    try {
      const raw = localStorage.getItem("favoriteTapestryIds");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFavorites(parsed.filter((x) => Number.isFinite(x)));
      }
    } catch {}
  }, []);

  // Clear any previously selected tapestry when viewing the list
  useEffect(() => {
    setSelectedTapestryId(null);
  }, []);

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try { localStorage.setItem("favoriteTapestryIds", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  const displayed = useMemo(() => {
    const favoriteSet = new Set(favorites);
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((t) => {
          const title = (t.title || "").toLowerCase();
          const pretty = (t.prettyId || "").toLowerCase();
          const location = (t.location || "").toLowerCase();
          const idStr = String(t.id || "");
          return (
            title.includes(q) ||
            pretty.includes(q) ||
            location.includes(q) ||
            idStr.includes(q)
          );
        })
      : items.slice();
    filtered.sort((a: any, b: any) => {
      const af = favoriteSet.has(a.id) ? 1 : 0;
      const bf = favoriteSet.has(b.id) ? 1 : 0;
      if (af !== bf) return bf - af; // favorites first
      const at = (a.title || a.prettyId || "").toLowerCase();
      const bt = (b.title || b.prettyId || "").toLowerCase();
      if (at && bt) return at.localeCompare(bt);
      return (a.id || 0) - (b.id || 0);
    });
    return filtered;
  }, [items, query, favorites]);

  return (
    <main style={{ padding: 48, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>All Tapestries</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0' }}>
            Browse and manage your immersive story experiences
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            placeholder="Search by title, pretty id, id, or location"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ minWidth: 320 }}
          />
        </div>
      </div>

      {loading && <p className="loading">Loading tapestries…</p>}
      {error && <div className="error">{error}</div>}

      {displayed.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 24
        }}>
          {displayed.map((t) => (
            <Link 
              key={t.id} 
              href={`/tapestries/${t.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: 12
                }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: 0, 
                      fontSize: 18,
                      color: 'var(--text-primary)'
                    }}>
                      {t.title || <span style={{ color: 'var(--text-muted)' }}>Untitled</span>}
                    </h3>
                    <div style={{ 
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginTop: 4
                    }}>
                      ID: {t.prettyId || t.id}
                    </div>
                  </div>
                  {t.isThreeJS && (
                    <span className="legacy-badge" style={{ background: '#111827', color: '#fff' }} title="ThreeJS engine">
                      ThreeJS
                    </span>
                  )}
                  <button
                    aria-label={favorites.includes(t.id) ? 'Unfavorite' : 'Favorite'}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(t.id); }}
                    className="legacy-icon-btn"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      color: favorites.includes(t.id) ? 'var(--primary)' : 'var(--text-muted)',
                      borderColor: favorites.includes(t.id) ? 'var(--primary)' : undefined,
                      background: '#fff',
                      padding: 0
                    }}
                  >
                    {favorites.includes(t.id) ? '★' : '☆'}
                  </button>
                </div>
                
                <div style={{ 
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  marginBottom: 16,
                  flex: 1
                }}>
                  📍 {t.location || <span style={{ fontStyle: 'italic' }}>No location</span>}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  paddingTop: 12,
                  borderTop: '1px solid var(--border-light)'
                }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {t.publicationYear || '—'}
                    </div>
                    {t.duration && (
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        • {t.duration} min
                      </div>
                    )}
                  </div>
                  {t.published ? (
                    <span className="legacy-badge" style={{ background: 'var(--primary)' }}>
                      Published
                    </span>
                  ) : (
                    <span className="legacy-badge" style={{ background: 'var(--text-muted)' }}>
                      Draft
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <h3 style={{ color: 'var(--text-secondary)' }}>No tapestries found</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Create your first tapestry to get started.
          </p>
        </div>
      )}
    </main>
  );
}



