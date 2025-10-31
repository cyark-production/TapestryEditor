"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageMeta } from "../../../../lib/api";

type Resources = {
  resources_id: number;
  about_description?: string | null;
  about_description_alt_lang?: string | null;
  credits?: string | null;
  credits_alt_lang?: string | null;
};

export default function ResourcesPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<Resources | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ field: keyof Resources; label: string; value: string; forceRtl?: boolean } | null>(null);
  const [lang2, setLang2] = useState<string | null>(null);
  const [lang2IsRtl, setLang2IsRtl] = useState<boolean>(false);
  const [me, setMe] = useState<any | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, res, tap] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/resources`),
        api.get(`/tapestries/${id}`)
      ]);
      setMe(meRes.data || null);
      setData(res.data);
      const a2 = (tap.data?.audioLanguage2 as string | undefined) || "";
      const meta = await resolveLanguageMeta(a2);
      const label = meta?.label?.trim() ? meta.label : null;
      setLang2(label);
      setLang2IsRtl(!!meta?.rtl);
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

  async function saveField() {
    if (!data || !modal) return;
    try {
      await ensureSignedIn();
      await api.put(`/tapestries/${id}/resources`, { [modal.field]: modal.value?.trim() === '' ? null : modal.value });
      setModal(null);
      load();
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to save (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>Resources</h2>
      {loading && <p className="loading">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {data ? (
        <>
          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>ABOUT</div>
            <div className="detail-grid">
              <label>About Description</label>
              <div>{data.about_description || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" title="Edit" onClick={() => setModal({ field: 'about_description', label: 'About Description', value: data.about_description || '' })}>✎</button>)}
              </div>
              {lang2 && (<>
                <label>{`About Description (${lang2})`}</label>
                <div>{data.about_description_alt_lang || <span className="legacy-muted">—</span>}</div>
                <div className="action-group">
                  {canEdit && (
                    <button
                      className="legacy-icon-btn"
                      title="Edit"
                      onClick={() => setModal({ field: 'about_description_alt_lang', label: `About Description (${lang2})`, value: data.about_description_alt_lang || '', forceRtl: lang2IsRtl })}
                    >
                      ✎
                    </button>
                  )}
                </div>
              </>)}
            </div>
          </div>

          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>CREDITS</div>
            <div className="detail-grid">
              <label>Credits</label>
              <div>{data.credits || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" title="Edit" onClick={() => setModal({ field: 'credits', label: 'Credits', value: data.credits || '' })}>✎</button>)}
              </div>
              {lang2 && (<>
                <label>{`Credits (${lang2})`}</label>
                <div>{data.credits_alt_lang || <span className="legacy-muted">—</span>}</div>
                <div className="action-group">
                  {canEdit && (
                    <button
                      className="legacy-icon-btn"
                      title="Edit"
                      onClick={() => setModal({ field: 'credits_alt_lang', label: `Credits (${lang2})`, value: data.credits_alt_lang || '', forceRtl: lang2IsRtl })}
                    >
                      ✎
                    </button>
                  )}
                </div>
              </>)}
            </div>
          </div>
        </>
      ) : (
        <p>No resources attached.</p>
      )}

      {modal && canEdit && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
            <textarea
              dir={modal.forceRtl ? 'rtl' : undefined}
              style={{ width: '100%', minHeight: 140, ...(modal.forceRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
              value={modal.value}
              onChange={(e) => setModal({ ...modal, value: e.target.value })}
            />
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

