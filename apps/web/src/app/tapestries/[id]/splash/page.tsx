"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn } from "../../../../lib/api";
import { FileLink } from "../../../../components/FileLink";
import { EditIcon } from "../../../../components/icons";

type Splash = {
  id: number;
  mapZoom?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  splashImage?: string | null;
  splashImageAltDesc?: string | null;
  presentedByLogo?: string | null;
  displayMap?: number | null;
};

export default function SplashPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<Splash | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ field: keyof Splash; label: string; value: string } | null>(null);
  const [me, setMe] = useState<any | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      await ensureSignedIn();
      const [meRes, res] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/splash`)
      ]);
      setMe(meRes.data || null);
      setData(res.data || null);
    } catch (e: any) {
      const status = e?.response?.status; const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to load (${status ?? ""}) ${typeof message === 'string' ? message : ''}`);
    } finally { setLoading(false); }
  }
  const canEdit = (me?.roles || []).some((r: string) => r === 'Admin' || r === 'Editor');

  useEffect(() => { load(); }, [id]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Splash Page</h2>
      {loading && <p className="loading">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {data && (
        <>
          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>MAP</div>
            <div className="detail-grid">
              <label>Explore Map Zoom</label>
              <div>{data.mapZoom ?? ''}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'mapZoom', label: 'Explore Map Zoom', value: String(data.mapZoom ?? '') })}><EditIcon /></button>)}
              </div>

              <label>Latitude</label>
              <div>{data.latitude ?? ''}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'latitude', label: 'Latitude', value: String(data.latitude ?? '') })}><EditIcon /></button>)}
              </div>

              <label>Longitude</label>
              <div>{data.longitude ?? ''}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'longitude', label: 'Longitude', value: String(data.longitude ?? '') })}><EditIcon /></button>)}
              </div>

              <label>Display Map</label>
              <div className="legacy-muted">[{data.displayMap ?? 0}] - {data.displayMap ? 'yes' : 'no'}</div>
              <div className="action-group">
                {canEdit && (<button className="btn" onClick={async () => { try { await api.put(`/tapestries/${id}/splash`, { displayMap: data.displayMap ? 0 : 1 }); load(); } catch (e: any) { const status = e?.response?.status; if (status === 403) setError('You do not have permission to update Splash settings.'); } }}>{data.displayMap ? 'Turn Off' : 'Turn On'}</button>)}
              </div>

              <label>Preview</label>
              <div>
                <button className="btn" disabled={!data.latitude || !data.longitude} onClick={() => {
                  const lat = Number(data.latitude);
                  const lon = Number(data.longitude);
                  const zoom = Number(data.mapZoom ?? 10);
                  const url = `https://www.google.com/maps/@${lat},${lon},${zoom}z`;
                  window.open(url, '_blank', 'noreferrer');
                }}>View on Map</button>
              </div>
              <span />
            </div>
          </div>

          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>IMAGES</div>
            <div className="detail-grid">
              <label>Splash Image</label>
              <div><FileLink url={data.splashImage} /></div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'splashImage', label: 'Splash Image URL', value: data.splashImage || '' })}><EditIcon /></button>)}
              </div>

              <label>Splash Image Alt Desc</label>
              <div>{data.splashImageAltDesc || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'splashImageAltDesc', label: 'Splash Image Alt Desc', value: data.splashImageAltDesc || '' })}><EditIcon /></button>)}
              </div>

              <label>Presented By Logo</label>
              <div><FileLink url={data.presentedByLogo} /></div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'presentedByLogo', label: 'Presented By Logo URL', value: data.presentedByLogo || '' })}><EditIcon /></button>)}
              </div>
            </div>
          </div>
        </>
      )}

      {modal && canEdit && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
            <input style={{ width: '100%' }} value={modal.value} onChange={(e) => setModal({ ...modal, value: e.target.value })} />
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                if (!modal) return;
                try {
                  const key = modal.field;
                  const raw = modal.value?.trim();
                  const numeric = (key === 'mapZoom' || key === 'displayMap') ? (raw === '' ? null : Number(raw)) : raw || null;
                  await api.put(`/tapestries/${id}/splash`, { [key]: numeric });
                  setModal(null); load();
                } catch {}
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

