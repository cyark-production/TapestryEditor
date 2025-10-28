"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn } from "../../../../lib/api";
import { EditIcon, TrashIcon, AddIcon } from "../../../../components/icons";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";

type Marker = {
  id: number;
  sceneId?: number | null;
  sceneSequence?: string | null;
  overviewId?: number | null;
  markerLabel?: string | null;
  lat?: number | null;
  lon?: number | null;
  markerColor?: string | null;
  fontColor?: string | null;
  fontSize?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  interactiveId?: number | null;
  interactiveHighlightId?: number | null;
};

export default function MarkersPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThreeJS, setIsThreeJS] = useState<boolean>(false);
  const [me, setMe] = useState<any | null>(null);
  const [modal, setModal] = useState<{ id?: number; field: keyof Marker; label: string; value: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<any>({ sceneId: "", overviewId: "", markerLabel: "", lat: "", lon: "", markerColor: "", fontColor: "", fontSize: "", startTime: "", endTime: "", interactiveId: "", interactiveHighlightId: "" });
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });

  async function load() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      await ensureSignedIn();
      const [meRes, t] = await Promise.all([api.get('/auth/me'), api.get(`/tapestries/${id}`)]);
      setMe(meRes.data || null);
      const three = !!t.data?.isThreeJS;
      setIsThreeJS(three);
      if (!three) {
        setItems([]);
      } else {
        const res = await api.get(`/tapestries/${id}/markers`);
        setItems(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e: any) {
      const status = e?.response?.status; const message = e?.response?.data || e?.message;
      setError(`Failed to load (${status ?? ""}) ${typeof message === 'string' ? message : ''}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);
  const canEdit = (me?.roles || []).some((r: string) => r === 'Admin' || r === 'Editor');

  const grouped = useMemo(() => {
    const byScene = new Map<string, Marker[]>();
    for (const m of items) {
      const key = m.sceneSequence ? `Scene ${m.sceneSequence}` : (m.overviewId ? `Overview ${m.overviewId}` : 'Unassigned');
      if (!byScene.has(key)) byScene.set(key, []);
      byScene.get(key)!.push(m);
    }
    return Array.from(byScene.entries());
  }, [items]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Markers</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!isThreeJS && !loading && (
        <div className="card" style={{ padding: 16 }}>
          <div className="legacy-badge legacy-badge-warn">This tapestry uses Sketchfab</div>
          <p style={{ marginTop: 8 }}>Markers are available only for ThreeJS tapestries.</p>
        </div>
      )}
      {isThreeJS && (
        <div style={{ marginTop: 16 }}>
          {canEdit && (
            <div style={{ marginBottom: 12 }}>
              <button className="legacy-icon-btn add-btn" onClick={() => { setForm({ sceneId: "", overviewId: "", markerLabel: "", lat: "", lon: "", markerColor: "", fontColor: "", fontSize: "", startTime: "", endTime: "", interactiveId: "", interactiveHighlightId: "" }); setAddOpen(true); }}><AddIcon /> Add Marker</button>
            </div>
          )}
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '160px' }}>Group</th>
                <th className="legacy-th" style={{ width: '70px' }}>ID</th>
                <th className="legacy-th" style={{ width: '20%' }}>Label</th>
                <th className="legacy-th" style={{ width: '15%' }}>Lat / Lon</th>
                <th className="legacy-th" style={{ width: '15%' }}>Colors</th>
                <th className="legacy-th" style={{ width: '12%' }}>Font Size</th>
                <th className="legacy-th" style={{ width: '12%' }}>Start / End</th>
                <th className="legacy-th" style={{ width: '12%' }}>Interactive</th>
                {canEdit && (<th className="legacy-th" style={{ width: '80px' }}>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([group, list]) => (
                <>
                  {list.map((m, idx) => (
                    <tr key={m.id}>
                      <td className="legacy-td">{idx === 0 ? group : ''}</td>
                      <td className="legacy-td">{m.id}</td>
                      <td className="legacy-td">
                        <span>{m.markerLabel || '—'}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit label" onClick={() => setModal({ id: m.id, field: 'markerLabel', label: 'Label', value: m.markerLabel || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{m.lat ?? '—'}, {m.lon ?? '—'}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit lat/lon" onClick={() => setModal({ id: m.id, field: 'lat', label: 'Latitude,Longitude', value: `${m.lat ?? ''},${m.lon ?? ''}` })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{m.markerColor || '—'} / {m.fontColor || '—'}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit colors" onClick={() => setModal({ id: m.id, field: 'markerColor', label: 'Marker Color / Font Color', value: `${m.markerColor || ''}/${m.fontColor || ''}` })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{m.fontSize || '—'}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit font size" onClick={() => setModal({ id: m.id, field: 'fontSize', label: 'Font Size', value: m.fontSize || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{m.startTime ?? '—'} / {m.endTime ?? '—'}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit times" onClick={() => setModal({ id: m.id, field: 'startTime', label: 'Start / End', value: `${m.startTime ?? ''}/${m.endTime ?? ''}` })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{m.interactiveId ?? '—'}{m.interactiveHighlightId ? ` / IH ${m.interactiveHighlightId}` : ''}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit interactive" onClick={() => setModal({ id: m.id, field: 'interactiveId', label: 'Interactive / Highlight', value: `${m.interactiveId ?? ''}/${m.interactiveHighlightId ?? ''}` })}><EditIcon /></button>)}
                      </td>
                      {canEdit && (
                        <td className="legacy-td col-actions legacy-row-actions">
                          <button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: m.id })}><TrashIcon /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isThreeJS && !loading && items.length === 0 && (
        <p>No markers found.</p>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Marker</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
              <label>Scene ID</label>
              <input value={form.sceneId} onChange={(e) => setForm({ ...form, sceneId: e.target.value })} />
              <label>Overview ID</label>
              <input value={form.overviewId} onChange={(e) => setForm({ ...form, overviewId: e.target.value })} />
              <label>Label</label>
              <input value={form.markerLabel} onChange={(e) => setForm({ ...form, markerLabel: e.target.value })} />
              <label>Lat</label>
              <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              <label>Lon</label>
              <input value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} />
              <label>Marker Color</label>
              <input value={form.markerColor} onChange={(e) => setForm({ ...form, markerColor: e.target.value })} />
              <label>Font Color</label>
              <input value={form.fontColor} onChange={(e) => setForm({ ...form, fontColor: e.target.value })} />
              <label>Font Size</label>
              <input value={form.fontSize} onChange={(e) => setForm({ ...form, fontSize: e.target.value })} />
              <label>Start Time</label>
              <input value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <label>End Time</label>
              <input value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              <label>Interactive ID</label>
              <input value={form.interactiveId} onChange={(e) => setForm({ ...form, interactiveId: e.target.value })} />
              <label>Interactive Highlight ID</label>
              <input value={form.interactiveHighlightId} onChange={(e) => setForm({ ...form, interactiveHighlightId: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/markers`, {
                    sceneId: form.sceneId ? Number(form.sceneId) : null,
                    overviewId: form.overviewId ? Number(form.overviewId) : null,
                    markerLabel: form.markerLabel || null,
                    lat: form.lat ? Number(form.lat) : null,
                    lon: form.lon ? Number(form.lon) : null,
                    markerColor: form.markerColor || null,
                    fontColor: form.fontColor || null,
                    fontSize: form.fontSize || null,
                    startTime: form.startTime ? Number(form.startTime) : null,
                    endTime: form.endTime ? Number(form.endTime) : null,
                    interactiveId: form.interactiveId ? Number(form.interactiveId) : null,
                    interactiveHighlightId: form.interactiveHighlightId ? Number(form.interactiveHighlightId) : null,
                  });
                  setAddOpen(false); load();
                } catch {}
              }}>Add</button>
            </div>
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
                if (!modal?.id) return;
                try {
                  await ensureSignedIn();
                  const label = modal.label;
                  const val = modal.value?.trim();
                  if (label === 'Latitude,Longitude') {
                    const [latStr, lonStr] = (val || '').split(',');
                    await api.put(`/markers/${modal.id}`, { lat: latStr ? Number(latStr) : null, lon: lonStr ? Number(lonStr) : null });
                  } else if (label === 'Marker Color / Font Color') {
                    const [m, f] = (val || '').split('/');
                    await api.put(`/markers/${modal.id}`, { markerColor: (m || '').trim() || null, fontColor: (f || '').trim() || null });
                  } else if (label === 'Start / End') {
                    const [s, e] = (val || '').split('/');
                    await api.put(`/markers/${modal.id}`, { startTime: s ? Number(s) : null, endTime: e ? Number(e) : null });
                  } else if (label === 'Interactive / Highlight') {
                    const [i, h] = (val || '').split('/');
                    await api.put(`/markers/${modal.id}`, { interactiveId: i ? Number(i) : null, interactiveHighlightId: h ? Number(h) : null });
                  } else {
                    await api.put(`/markers/${modal.id}`, { [modal.field]: val === '' ? null : val });
                  }
                  setModal(null); load();
                } catch {}
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Delete Marker"
        message="Are you sure you want to delete this marker? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => { const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return; try { await ensureSignedIn(); await api.delete(`/markers/${idToDelete}`); load(); } catch {} }}
      />
    </main>
  );
}




