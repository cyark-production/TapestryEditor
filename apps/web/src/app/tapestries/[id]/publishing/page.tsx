"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn } from "../../../../lib/api";
import { filenameFromUrl, useFileSize } from "../../../../lib/files";

type Tapestry = {
  id: number;
  headline?: string | null;
  snippet?: string | null;
  hoverVideo?: string | null;
  cardImage?: string | null;
  published?: number | null;
  mapZoom?: number | null;
  displayWeight?: number | null;
  communityMade?: number | null;
  theme?: number | null;
  passwordProtect?: number | null;
  password?: string | null;
  allowWhiteLabel?: number | null;
  donateButton?: number | null;
  callToActionId?: number | null;
  callToActionTitle?: string | null;
  callToActionButtonLabel?: string | null;
  callToActionMainText?: string | null;
  callToActionLink?: string | null;
};

function Size({ url }: { url?: string | null }) {
  const size = useFileSize(url);
  return <>{size ? ` ${size}` : ""}</>;
}

export default function PublishingPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [item, setItem] = useState<Tapestry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ field: keyof Tapestry | null; label: string; value: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [themes, setThemes] = useState<Array<{ id: number; name: string }>>([]);
  const [me, setMe] = useState<any | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, res, themesRes] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/publishing`),
        api.get(`/themes`)
      ]);
      setMe(meRes.data || null);
      setItem(res.data as Tapestry);
      setThemes(Array.isArray(themesRes.data) ? themesRes.data : []);
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to load (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    } finally {
      setLoading(false);
    }
  }
  const canEdit = (me?.roles || []).some((r: string) => r === 'Admin' || r === 'Editor');

  useEffect(() => { load(); }, [id]);

  function openEditor(field: keyof Tapestry, label: string, current?: string | number | null) {
    setModalError(null);
    setModal({ field, label, value: current != null ? String(current) : "" });
  }

  async function saveField() {
    if (!item || !modal?.field) return;
    const k = modal.field as keyof Tapestry;
    const value = modal.value?.trim();

    if (k === 'mapZoom' || k === 'displayWeight' || k === 'communityMade' || k === 'published' || k === 'passwordProtect' || k === 'allowWhiteLabel' || k === 'donateButton') {
      if (value !== '' && !/^[-+]?\d+$/.test(value)) { setModalError('Must be an integer'); return; }
    }
    const asNumber = (k === 'mapZoom' || k === 'displayWeight' || k === 'communityMade' || k === 'published' || k === 'passwordProtect' || k === 'allowWhiteLabel' || k === 'donateButton');
    const payload: any = { [k]: value === '' ? null : (asNumber ? Number(value) : value) };
    setError(null);
    try {
      await api.put(`/tapestries/${item.id}/publishing`, payload);
      setModal(null);
      load();
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || 'Unknown error';
      setModalError(`Failed to save (${status ?? ''}) ${typeof message === 'string' ? message : ''}`);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>Publishing</h2>
      {loading && <p className="loading">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {item && (
        <>
          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>HOMEPAGE CARD</div>
            <div className="detail-grid">
              <label>Headline</label>
              <div>{item.headline ? item.headline : <span className="legacy-badge legacy-badge-warn">Missing Info</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openEditor('headline','Headline', item.headline)} title="Edit">✎</button>)}
              </div>

              <label>Snippet</label>
              <div>{item.snippet ? item.snippet : <span className="legacy-badge legacy-badge-warn">Missing Info</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openEditor('snippet','Snippet', item.snippet)} title="Edit">✎</button>)}
              </div>

              <label>Hover Video</label>
              <div>{item.hoverVideo ? (<a className="legacy-link-like" href={item.hoverVideo} target="_blank" rel="noreferrer">{filenameFromUrl(item.hoverVideo)}<span className="legacy-muted"><Size url={item.hoverVideo} /></span></a>) : (<span className="legacy-badge legacy-badge-warn">Missing Info</span>)}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openEditor('hoverVideo','Hover Video URL', item.hoverVideo)} title="Edit">✎</button>)}
              </div>

              <label>Tapestry Card Image</label>
              <div>{item.cardImage ? (<a className="legacy-link-like" href={item.cardImage} target="_blank" rel="noreferrer">{filenameFromUrl(item.cardImage)}<span className="legacy-muted"><Size url={item.cardImage} /></span></a>) : (<span className="legacy-badge legacy-badge-warn">Missing Info</span>)}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openEditor('cardImage','Tapestry Card Image URL', item.cardImage)} title="Edit">✎</button>)}
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>SETTINGS</div>
            <div className="detail-grid">
              <label>Published</label>
              <div className="legacy-muted">[{item.published ?? 0}] - {item.published ? 'yes' : 'no'}</div>
              <div className="action-group">
                {canEdit && (<button className="btn" onClick={async () => {
                  if (!item) return;
                  try { await api.put(`/tapestries/${item.id}/publishing`, { published: item.published ? 0 : 1 }); load(); } catch (e: any) { const status = e?.response?.status; if (status === 403) setError('You do not have permission to update Publishing settings.'); } 
                }}>{item.published ? 'Turn Off' : 'Turn On'}</button>)}
              </div>

              <label>Display Weight</label>
              <div>{item.displayWeight ?? 0}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openEditor('displayWeight','Display Weight', item.displayWeight ?? 0)} title="Edit">✎</button>)}
              </div>

              <label>Community made</label>
              <div className="legacy-muted">[{item.communityMade ?? 0}] - {item.communityMade ? 'yes' : 'no'}</div>
              <div className="action-group">
                {canEdit && (<button className="btn" onClick={async () => {
                  if (!item) return;
                  try { await api.put(`/tapestries/${item.id}/publishing`, { communityMade: item.communityMade ? 0 : 1 }); load(); } catch (e: any) {}
                }}>{item.communityMade ? 'Turn Off' : 'Turn On'}</button>)}
              </div>

              <label>Theme</label>
              <div>
                {canEdit ? (
                  <select value={String(item.theme ?? '')} onChange={async (e) => {
                    try { await api.put(`/tapestries/${item.id}/publishing`, { theme: e.target.value ? Number(e.target.value) : null }); load(); } catch {}
                  }}>
                    <option value="">Select theme…</option>
                    {themes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name || `Theme ${t.id}`}</option>
                    ))}
                  </select>
                ) : (
                  <span>{themes.find(t => t.id === item.theme)?.name || item.theme || <span className="legacy-muted">—</span>}</span>
                )}
              </div>
              <span />

              <label>Call to Action</label>
              <div>
                {item.callToActionId ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontWeight: 600 }}>{item.callToActionTitle || `CTA #${item.callToActionId}`}</span>
                    {item.callToActionMainText && (
                      <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{item.callToActionMainText}</span>
                    )}
                    <span className="legacy-muted" style={{ fontSize: 12 }}>
                      Button: {item.callToActionButtonLabel || "—"}
                    </span>
                    {item.callToActionLink && (
                      <a className="legacy-link-like" href={item.callToActionLink} target="_blank" rel="noreferrer">
                        {item.callToActionLink}
                      </a>
                    )}
                  </div>
                ) : (
                  <span className="legacy-muted">No CTA assigned</span>
                )}
              </div>
              <div className="action-group">
                {canEdit && (
                  <Link className="legacy-link-like" href="/settings/call-to-action">Manage CTAs</Link>
                )}
              </div>

              <label>Disable Donate Button</label>
              <div className="legacy-muted">[{item.donateButton ?? 0}] - {item.donateButton ? 'yes' : 'no'}</div>
              <div className="action-group">
                {canEdit && (<button className="btn" onClick={async () => {
                  if (!item) return;
                  try { await api.put(`/tapestries/${item.id}/publishing`, { donateButton: item.donateButton ? 0 : 1 }); load(); } catch (e: any) {}
                }}>{item.donateButton ? 'Turn Off' : 'Turn On'}</button>)}
              </div>

              <label>Password Protect</label>
              <div className="legacy-muted">[{item.passwordProtect ?? 0}] - {item.passwordProtect ? 'yes' : 'no'}</div>
              <div className="action-group">
                {canEdit && (<button className="btn" onClick={async () => {
                  if (!item) return;
                  try { await api.put(`/tapestries/${item.id}/publishing`, { passwordProtect: item.passwordProtect ? 0 : 1 }); load(); } catch (e: any) {}
                }}>{item.passwordProtect ? 'Turn Off' : 'Turn On'}</button>)}
              </div>

              <label>Password</label>
              <div>{item.password ? '••••••••' : <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openEditor('password','Password', item.password || '')} title="Edit">✎</button>)}
              </div>

              <label>Allow White Label</label>
              <div className="legacy-muted">[{item.allowWhiteLabel ?? 0}] - {item.allowWhiteLabel ? 'yes' : 'no'}</div>
              <div className="action-group">
                {canEdit && (<button className="btn" onClick={async () => {
                  if (!item) return;
                  try { await api.put(`/tapestries/${item.id}/publishing`, { allowWhiteLabel: item.allowWhiteLabel ? 0 : 1 }); load(); } catch (e: any) {}
                }}>{item.allowWhiteLabel ? 'Turn Off' : 'Turn On'}</button>)}
              </div>
            </div>
          </div>
        </>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
            <input style={{ width: '100%' }} value={modal.value} onChange={(e) => { setModal({ ...modal, value: e.target.value }); setModalError(null); }} />
            {modalError && <div style={{ color: 'crimson', marginTop: 8 }}>{modalError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveField}>Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

