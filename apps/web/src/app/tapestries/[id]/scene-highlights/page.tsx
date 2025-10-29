"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon, ToggleIcon } from "../../../../components/icons";
import { FileLink } from "../../../../components/FileLink";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";

type Row = {
  id: number;
  sceneId: number | null;
  sketchfabMaterialId?: string | null;
  sketchfabModelId?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  fade?: number | null;
  highlightPosition?: string | null;
  highlightRotation?: string | null;
  highlightScale?: string | null;
  highlightModelUrl?: string | null;
  shadowEnabled?: number | null;
  animationType?: string | null;
  entranceExitAnimation?: string | null;
};

export default function SceneHighlightsPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThreeJS, setIsThreeJS] = useState<boolean>(false);
  const [addOpen, setAddOpen] = useState(false);
  const [modal, setModal] = useState<{ id: number; field: keyof Row; label: string; value: string } | null>(null);
  const [form, setForm] = useState<any>({ sceneId: "", startTime: "", endTime: "", fade: "", sketchfabMaterialId: "", sketchfabModelId: "", highlightPosition: "", highlightRotation: "", highlightScale: "", highlightModelUrl: "", shadowEnabled: false, animationType: "", entranceExitAnimation: "" });
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });
  const [scenes, setScenes] = useState<any[]>([]);

  async function load() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      await ensureSignedIn();
      // fetch tapestry detail to know engine type
      try {
        const [meRes, tRes] = await Promise.all([
          api.get('/auth/me'),
          api.get(`/tapestries/${id}`)
        ]);
        setMe(meRes.data || null);
        setIsThreeJS(!!tRes.data?.isThreeJS);
        setScenes(Array.isArray(tRes.data?.scenes) ? tRes.data.scenes : []);
      } catch {}
      const res = await api.get(`/tapestries/${id}/scene-highlights`);
      setRows(res.data || []);
    } catch (e: any) {
      const status = e?.response?.status; const message = e?.response?.data || e?.message;
      setError(`Failed to load (${status ?? ""}) ${typeof message === 'string' ? message : ''}`);
    } finally { setLoading(false); }
  }
  const canEdit = (me?.roles || []).some((r: string) => r === 'Admin' || r === 'Editor');

  useEffect(() => { load(); }, [id]);

  const grouped = useMemo(() => {
    const map = new Map<number, Row[]>();
    rows.forEach((r) => {
      const k = r.sceneId ?? 0;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries()).sort((a,b) => a[0]-b[0]);
  }, [rows]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Scene Highlights</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button
            className="legacy-icon-btn add-btn"
            onClick={() => {
              setForm({ sceneId: "", startTime: "", endTime: "", fade: "", sketchfabMaterialId: "", sketchfabModelId: "", highlightPosition: "", highlightRotation: "", highlightScale: "", highlightModelUrl: "", shadowEnabled: false, animationType: "", entranceExitAnimation: "" });
              setAddOpen(true);
            }}
          >
            <AddIcon /> Add Highlight
          </button>
        </div>
      )}

      {rows.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '70px' }}>Scene</th>
                <th className="legacy-th" style={{ width: '60px' }}>ID</th>
                <th className="legacy-th" style={{ width: '10%' }}>Times</th>
                {!isThreeJS && (
                  <th className="legacy-th" style={{ width: '12%' }}>Sketchfab</th>
                )}
                <th className="legacy-th" style={{ width: '23%' }}>Position / Rotation / Scale</th>
                <th className="legacy-th" style={{ width: '20%' }}>Model URL</th>
                <th className="legacy-th" style={{ width: '15%' }}>Anim</th>
                <th className="legacy-th" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped.map(([sceneId, list]) => (
                <>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td className="legacy-td" title={`Scene ID ${sceneId || ''}`}>{(r as any).sceneSequence || ''}</td>
                      <td className="legacy-td col-id">{r.id}</td>
                      <td className="legacy-td">
                        <div>
                          <span>Start: {r.startTime ?? '—'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit start" onClick={() => setModal({ id: r.id, field: 'startTime', label: 'Start Time', value: String(r.startTime ?? '') })}><EditIcon /></button>)}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span>End: {r.endTime ?? '—'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit end" onClick={() => setModal({ id: r.id, field: 'endTime', label: 'End Time', value: String(r.endTime ?? '') })}><EditIcon /></button>)}
                        </div>
                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Fade: {r.fade ? 'On' : 'Off'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Toggle fade" onClick={async () => { try { await ensureSignedIn(); await api.put(`/scene-highlights/${r.id}`, { fade: r.fade ? 0 : 1 }); load(); } catch {} }}>
                            <ToggleIcon on={!!r.fade} />
                          </button>)}
                        </div>
                      </td>
                      {!isThreeJS && (
                        <td className="legacy-td">
                          <div>
                            <span>{r.sketchfabMaterialId || '—'}</span>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit material" onClick={() => setModal({ id: r.id, field: 'sketchfabMaterialId', label: 'Sketchfab Material ID', value: r.sketchfabMaterialId || '' })}><EditIcon /></button>)}
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <span>{r.sketchfabModelId || '—'}</span>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit model" onClick={() => setModal({ id: r.id, field: 'sketchfabModelId', label: 'Sketchfab Model ID', value: r.sketchfabModelId || '' })}><EditIcon /></button>)}
                          </div>
                        </td>
                      )}
                      <td className="legacy-td col-expand">
                        <div>
                          <span>Pos: {r.highlightPosition || '—'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit position" onClick={() => setModal({ id: r.id, field: 'highlightPosition', label: 'Highlight Position', value: r.highlightPosition || '' })}><EditIcon /></button>)}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span>Rot: {r.highlightRotation || '—'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit rotation" onClick={() => setModal({ id: r.id, field: 'highlightRotation', label: 'Highlight Rotation', value: r.highlightRotation || '' })}><EditIcon /></button>)}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span>Scale: {r.highlightScale || '—'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit scale" onClick={() => setModal({ id: r.id, field: 'highlightScale', label: 'Highlight Scale', value: r.highlightScale || '' })}><EditIcon /></button>)}
                        </div>
                      </td>
                      <td className="legacy-td col-expand">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileLink url={r.highlightModelUrl} />
                          {canEdit && (
                            <button
                              className="legacy-icon-btn edit-btn"
                              title="Edit model URL"
                              onClick={() => setModal({ id: r.id, field: 'highlightModelUrl', label: 'Highlight Model URL', value: r.highlightModelUrl || '' })}
                            >
                              <EditIcon />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="legacy-td">
                        <div>
                          <span>Shadow: {r.shadowEnabled ? 'On' : 'Off'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Toggle shadow" onClick={async () => { try { await ensureSignedIn(); await api.put(`/scene-highlights/${r.id}`, { shadowEnabled: !r.shadowEnabled }); load(); } catch {} }}>
                            <ToggleIcon on={!!r.shadowEnabled} />
                          </button>)}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span>Anim: {r.animationType || '—'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit animation type" onClick={() => setModal({ id: r.id, field: 'animationType', label: 'Animation Type', value: r.animationType || '' })}><EditIcon /></button>)}
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span>Enter/Exit: {r.entranceExitAnimation || '—'}</span>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit enter/exit" onClick={() => setModal({ id: r.id, field: 'entranceExitAnimation', label: 'Entrance/Exit Animation', value: r.entranceExitAnimation || '' })}><EditIcon /></button>)}
                        </div>
                      </td>
                      <td className="legacy-td col-actions legacy-row-actions">
                        {canEdit && (<button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: r.id })}><TrashIcon /></button>)}
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No scene highlights found.</p>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Scene Highlight</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
              <label>Scene</label>
              <select value={form.sceneId} onChange={(e) => setForm({ ...form, sceneId: e.target.value })}>
                <option value="">Select a scene…</option>
                {scenes.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.sequence || s.id}{s.title ? ` - ${s.title}` : ''}
                  </option>
                ))}
              </select>
              <label>Start Time</label>
              <input value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <label>End Time</label>
              <input value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              <label>Fade</label>
              <input value={form.fade} onChange={(e) => setForm({ ...form, fade: e.target.value })} />
              <label>Sketchfab Material ID</label>
              <input value={form.sketchfabMaterialId} onChange={(e) => setForm({ ...form, sketchfabMaterialId: e.target.value })} />
              <label>Sketchfab Model ID</label>
              <input value={form.sketchfabModelId} onChange={(e) => setForm({ ...form, sketchfabModelId: e.target.value })} />
              <label>Highlight Position</label>
              <input value={form.highlightPosition} onChange={(e) => setForm({ ...form, highlightPosition: e.target.value })} />
              <label>Highlight Rotation</label>
              <input value={form.highlightRotation} onChange={(e) => setForm({ ...form, highlightRotation: e.target.value })} />
              <label>Highlight Scale</label>
              <input value={form.highlightScale} onChange={(e) => setForm({ ...form, highlightScale: e.target.value })} />
              <label>Model URL</label>
              <input value={form.highlightModelUrl} onChange={(e) => setForm({ ...form, highlightModelUrl: e.target.value })} />
              <label>Shadow Enabled</label>
              <input type="checkbox" checked={!!form.shadowEnabled} onChange={(e) => setForm({ ...form, shadowEnabled: e.target.checked })} />
              <label>Animation Type</label>
              <input value={form.animationType} onChange={(e) => setForm({ ...form, animationType: e.target.value })} />
              <label>Entrance/Exit Animation</label>
              <input value={form.entranceExitAnimation} onChange={(e) => setForm({ ...form, entranceExitAnimation: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!id || !form.sceneId} onClick={async () => {
                if (!id) return;
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/scene-highlights`, {
                    sceneId: form.sceneId ? Number(form.sceneId) : null,
                    startTime: form.startTime ? Number(form.startTime) : null,
                    endTime: form.endTime ? Number(form.endTime) : null,
                    fade: form.fade ? Number(form.fade) : null,
                    sketchfabMaterialId: form.sketchfabMaterialId || null,
                    sketchfabModelId: form.sketchfabModelId || null,
                    highlightPosition: form.highlightPosition || null,
                    highlightRotation: form.highlightRotation || null,
                    highlightScale: form.highlightScale || null,
                    highlightModelUrl: form.highlightModelUrl || null,
                    shadowEnabled: !!form.shadowEnabled,
                    animationType: form.animationType || null,
                    entranceExitAnimation: form.entranceExitAnimation || null,
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
                if (!modal) return;
                try {
                  await ensureSignedIn();
                  const key = modal.field;
                  const value = modal.value?.trim() === '' ? null : modal.value;
                  await api.put(`/scene-highlights/${modal.id}`, { [key]: key.includes('Time') || key === 'fade' ? (value == null ? null : Number(value)) : value });
                  setModal(null); load();
                } catch {}
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirm.open}
        title="Delete Scene Highlight"
        message="Are you sure you want to delete this scene highlight? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => { const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return; try { await ensureSignedIn(); await api.delete(`/scene-highlights/${idToDelete}`); load(); } catch (e: any) {} }}
      />
    </main>
  );
}


