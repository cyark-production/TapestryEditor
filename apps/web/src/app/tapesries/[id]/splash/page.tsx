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

  async function load() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      await ensureSignedIn();
      const res = await api.get(`/tapestries/${id}/splash`);
      setData(res.data || null);
    } catch (e: any) {
      const status = e?.response?.status; const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to load (${status ?? ""}) ${typeof message === 'string' ? message : ''}`);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [id]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Splash Page</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {data && (
        <div style={{ marginTop: 16, maxWidth: 900 }}>
          <div className="legacy-section-header">MAP</div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', rowGap: 10, columnGap: 12 }}>
            <label>Explore Map Zoom</label>
            <div>{data.mapZoom ?? ''}</div>
            <button className="legacy-icon-btn" onClick={() => setModal({ field: 'mapZoom', label: 'Explore Map Zoom', value: String(data.mapZoom ?? '') })}><EditIcon /></button>

            <label>Latitude</label>
            <div>{data.latitude ?? ''}</div>
            <button className="legacy-icon-btn" onClick={() => setModal({ field: 'latitude', label: 'Latitude', value: String(data.latitude ?? '') })}><EditIcon /></button>

            <label>Longitude</label>
            <div>{data.longitude ?? ''}</div>
            <button className="legacy-icon-btn" onClick={() => setModal({ field: 'longitude', label: 'Longitude', value: String(data.longitude ?? '') })}><EditIcon /></button>

            <label>Display Map</label>
            <div className="legacy-muted">[{data.displayMap ?? 0}] - {data.displayMap ? 'yes' : 'no'}</div>
            <button className="btn" onClick={async () => { try { await api.put(`/tapestries/${id}/splash`, { displayMap: data.displayMap ? 0 : 1 }); load(); } catch {} }}>{data.displayMap ? 'Turn Off' : 'Turn On'}</button>
          </div>

          <div className="legacy-section-header" style={{ marginTop: 18 }}>IMAGES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', rowGap: 10, columnGap: 12 }}>
            <label>Splash Image</label>
            <div><FileLink url={data.splashImage} /></div>
            <button className="legacy-icon-btn" onClick={() => setModal({ field: 'splashImage', label: 'Splash Image URL', value: data.splashImage || '' })}><EditIcon /></button>

            <label>Splash Image Alt Desc</label>
            <div>{data.splashImageAltDesc || <span className="legacy-muted">—</span>}</div>
            <button className="legacy-icon-btn" onClick={() => setModal({ field: 'splashImageAltDesc', label: 'Splash Image Alt Desc', value: data.splashImageAltDesc || '' })}><EditIcon /></button>

            <label>Presented By Logo</label>
            <div><FileLink url={data.presentedByLogo} /></div>
            <button className="legacy-icon-btn" onClick={() => setModal({ field: 'presentedByLogo', label: 'Presented By Logo URL', value: data.presentedByLogo || '' })}><EditIcon /></button>
          </div>
        </div>
      )}

      {modal && (
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






