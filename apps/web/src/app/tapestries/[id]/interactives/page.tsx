"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon } from "../../../../components/icons";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";

export default function InteractivesPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<any>({ sceneId: "", intensity: "", depthOfField: "", desaturate: false, instantMove: false });
  const [modal, setModal] = useState<{ id: number; field: 'intensity' | 'depthOfField' | 'desaturate' | 'instantMove'; label: string; value: string } | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });
  const [scenes, setScenes] = useState<any[]>([]);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, res, tapRes] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/interactives`, { timeout: 15000 } as any),
        api.get(`/tapestries/${id}`)
      ]);
      setMe(meRes.data || null);
      setItems(Array.isArray(res.data) ? res.data : []);
      setScenes(Array.isArray(tapRes.data?.scenes) ? tapRes.data.scenes : []);
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unknown error";
      try { console.error('Interactives load failed', e); } catch {}
      setError(`Failed to load (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const canEdit = (me?.roles || []).some((r: string) => r === 'Admin' || r === 'Editor');

  const rows = useMemo(() => items.map((i) => (
    <tr key={i.id} id={`interactive-${i.id}`}>
      <td className="legacy-td" title={`Scene ID ${i.sceneId ?? ''}`}>{(i as any).sceneSequence || ''}</td>
      <td className="legacy-td col-id">{i.id}</td>
      <td className="legacy-td">
        <span>{i.intensity ?? ''}</span>
        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit intensity" onClick={() => setModal({ id: i.id, field: 'intensity', label: 'Intensity', value: String(i.intensity ?? '') })}><EditIcon /></button>)}
      </td>
      <td className="legacy-td">
        <span>{i.depthOfField ?? ''}</span>
        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit depth of field" onClick={() => setModal({ id: i.id, field: 'depthOfField', label: 'Depth of Field', value: String(i.depthOfField ?? '') })}><EditIcon /></button>)}
      </td>
      <td className="legacy-td">
        <span>{i.desaturate ? 'Yes' : 'No'}</span>
        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Toggle desaturate" onClick={async () => { try { await ensureSignedIn(); await api.put(`/interactives/${i.id}`, { desaturate: !i.desaturate }); load(); } catch {} }}><EditIcon /></button>)}
      </td>
      <td className="legacy-td">
        <span>{i.instantMove ? 'Yes' : 'No'}</span>
        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Toggle instant move" onClick={async () => { try { await ensureSignedIn(); await api.put(`/interactives/${i.id}`, { instantMove: !i.instantMove }); load(); } catch {} }}><EditIcon /></button>)}
      </td>
      <td className="legacy-td">{i.cameraPosition ? 'Populated' : 'Null'}</td>
      <td className="legacy-td">{i.cameraTarget ? 'Populated' : 'Null'}</td>
      <td className="legacy-td col-actions legacy-row-actions">
        {canEdit && (<button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: i.id })}><TrashIcon /></button>)}
      </td>
    </tr>
  )), [items]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Interactives</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button className="legacy-icon-btn add-btn" onClick={() => { setForm({ sceneId: "", intensity: "", depthOfField: "", desaturate: false, instantMove: false }); setAddOpen(true); }}>
            <AddIcon /> Add Interactive
          </button>
        </div>
      )}
      {items.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '70px' }}>Scene</th>
                <th className="legacy-th" style={{ width: '70px' }}>ID</th>
                <th className="legacy-th" style={{ width: '15%' }}>Intensity</th>
                <th className="legacy-th" style={{ width: '15%' }}>Depth of Field</th>
                <th className="legacy-th" style={{ width: '12%' }}>Desaturate</th>
                <th className="legacy-th" style={{ width: '12%' }}>Instant Move</th>
                <th className="legacy-th" style={{ width: '15%' }}>Cam Pos</th>
                <th className="legacy-th" style={{ width: '15%' }}>Cam Target</th>
                <th className="legacy-th" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      ) : (
        <p>No interactives found.</p>
      )}
      <ConfirmDialog
        open={confirm.open}
        title="Delete Interactive"
        message="Are you sure you want to delete this interactive? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => { const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return; try { await ensureSignedIn(); await api.delete(`/interactives/${idToDelete}`); load(); } catch (e: any) {} }}
      />

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Interactive</h3>
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
              <label>Intensity</label>
              <input value={form.intensity} onChange={(e) => setForm({ ...form, intensity: e.target.value })} />
              <label>Depth of Field</label>
              <input value={form.depthOfField} onChange={(e) => setForm({ ...form, depthOfField: e.target.value })} />
              <label>Desaturate</label>
              <input type="checkbox" checked={!!form.desaturate} onChange={(e) => setForm({ ...form, desaturate: e.target.checked })} />
              <label>Instant Move</label>
              <input type="checkbox" checked={!!form.instantMove} onChange={(e) => setForm({ ...form, instantMove: e.target.checked })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!id || !form.sceneId} onClick={async () => {
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/interactives`, {
                    sceneId: form.sceneId ? Number(form.sceneId) : null,
                    intensity: form.intensity ? Number(form.intensity) : null,
                    depthOfField: form.depthOfField ? Number(form.depthOfField) : null,
                    desaturate: !!form.desaturate,
                    instantMove: !!form.instantMove,
                  });
                  setAddOpen(false);
                  load();
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
                  const payload: any = {};
                  if (modal.field === 'intensity' || modal.field === 'depthOfField') payload[modal.field] = modal.value.trim() === '' ? null : Number(modal.value);
                  else payload[modal.field] = modal.value === 'true';
                  await api.put(`/interactives/${modal.id}`, payload);
                  setModal(null);
                  load();
                } catch {}
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}


