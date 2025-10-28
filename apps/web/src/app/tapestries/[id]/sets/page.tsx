"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn } from "../../../../lib/api";
import { EditIcon, TrashIcon, AddIcon } from "../../../../components/icons";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";

export default function SetsPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThreeJS, setIsThreeJS] = useState<boolean>(false);
  const [me, setMe] = useState<any | null>(null);
  const [modal, setModal] = useState<{ id?: number; field: string; label: string; value: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: "", asset: "", hdrLink: "", hdrRotation: "", fogColor: "", fogDensity: "", thoughtInterval: "" });
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
        const res = await api.get(`/tapestries/${id}/sets`);
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

  return (
    <main style={{ padding: 24 }}>
      <h2>Sets</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!isThreeJS && !loading && (
        <div className="card" style={{ padding: 16 }}>
          <div className="legacy-badge legacy-badge-warn">This tapestry uses Sketchfab</div>
          <p style={{ marginTop: 8 }}>Sets are available only for ThreeJS tapestries.</p>
        </div>
      )}
      {isThreeJS && (
        <div style={{ marginTop: 16 }}>
          {canEdit && (
            <div style={{ marginBottom: 12 }}>
              <button className="legacy-icon-btn add-btn" onClick={() => { setForm({ type: "", asset: "", hdrLink: "", hdrRotation: "", fogColor: "", fogDensity: "", thoughtInterval: "" }); setAddOpen(true); }}><AddIcon /> Add Set</button>
            </div>
          )}
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '80px' }}>Set ID</th>
                <th className="legacy-th" style={{ width: '120px' }}>Type</th>
                <th className="legacy-th">Asset</th>
                <th className="legacy-th">HDR Link</th>
                <th className="legacy-th" style={{ width: '110px' }}>HDR Rotation</th>
                <th className="legacy-th" style={{ width: '110px' }}>Fog Color</th>
                <th className="legacy-th" style={{ width: '110px' }}>Fog Density</th>
                <th className="legacy-th" style={{ width: '120px' }}>Thought Interval</th>
                {canEdit && (<th className="legacy-th" style={{ width: '80px' }}>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td className="legacy-td">{s.id}</td>
                  <td className="legacy-td">
                    <span>{s.type || '—'}</span>
                    {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit type" onClick={() => setModal({ id: s.id, field: 'type', label: 'Type', value: s.type || '' })}><EditIcon /></button>)}
                  </td>
                  <td className="legacy-td" title={s.asset || ''}>
                    <span>{s.asset || '—'}</span>
                    {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit asset" onClick={() => setModal({ id: s.id, field: 'asset', label: 'Asset', value: s.asset || '' })}><EditIcon /></button>)}
                  </td>
                  <td className="legacy-td" title={s.hdrLink || ''}>
                    <span>{s.hdrLink || '—'}</span>
                    {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit HDR link" onClick={() => setModal({ id: s.id, field: 'hdrLink', label: 'HDR Link', value: s.hdrLink || '' })}><EditIcon /></button>)}
                  </td>
                  <td className="legacy-td">
                    <span>{s.hdrRotation ?? '—'}</span>
                    {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit HDR rotation" onClick={() => setModal({ id: s.id, field: 'hdrRotation', label: 'HDR Rotation', value: String(s.hdrRotation ?? '') })}><EditIcon /></button>)}
                  </td>
                  <td className="legacy-td">
                    <span>{s.fogColor || '—'}</span>
                    {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit fog color" onClick={() => setModal({ id: s.id, field: 'fogColor', label: 'Fog Color', value: s.fogColor || '' })}><EditIcon /></button>)}
                  </td>
                  <td className="legacy-td">
                    <span>{s.fogDensity ?? '—'}</span>
                    {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit fog density" onClick={() => setModal({ id: s.id, field: 'fogDensity', label: 'Fog Density', value: String(s.fogDensity ?? '') })}><EditIcon /></button>)}
                  </td>
                  <td className="legacy-td">
                    <span>{s.thoughtInterval ?? '—'}</span>
                    {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit thought interval" onClick={() => setModal({ id: s.id, field: 'thoughtInterval', label: 'Thought Interval', value: String(s.thoughtInterval ?? '') })}><EditIcon /></button>)}
                  </td>
                  {canEdit && (
                    <td className="legacy-td col-actions legacy-row-actions">
                      <button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: s.id })}><TrashIcon /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isThreeJS && !loading && items.length === 0 && (
        <p>No sets found.</p>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Set</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8 }}>
              <label>Type</label>
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <label>Asset</label>
              <input value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} />
              <label>HDR Link</label>
              <input value={form.hdrLink} onChange={(e) => setForm({ ...form, hdrLink: e.target.value })} />
              <label>HDR Rotation</label>
              <input value={form.hdrRotation} onChange={(e) => setForm({ ...form, hdrRotation: e.target.value })} />
              <label>Fog Color</label>
              <input value={form.fogColor} onChange={(e) => setForm({ ...form, fogColor: e.target.value })} />
              <label>Fog Density</label>
              <input value={form.fogDensity} onChange={(e) => setForm({ ...form, fogDensity: e.target.value })} />
              <label>Thought Interval</label>
              <input value={form.thoughtInterval} onChange={(e) => setForm({ ...form, thoughtInterval: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/sets`, {
                    type: form.type || null,
                    asset: form.asset || null,
                    hdrLink: form.hdrLink || null,
                    hdrRotation: form.hdrRotation ? Number(form.hdrRotation) : null,
                    fogColor: form.fogColor || null,
                    fogDensity: form.fogDensity ? Number(form.fogDensity) : null,
                    thoughtInterval: form.thoughtInterval ? Number(form.thoughtInterval) : null,
                  });
                  setAddOpen(false); load();
                } catch (e) {}
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
                  const key = modal.field as any;
                  const val = modal.value?.trim();
                  await api.put(`/sets/${modal.id}`, { [key]: (key === 'hdrRotation' || key === 'fogDensity' || key === 'thoughtInterval') ? (val === '' ? null : Number(val)) : (val === '' ? null : val) });
                  setModal(null); load();
                } catch {}
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Delete Set"
        message="Are you sure you want to delete this set? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => { const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return; try { await ensureSignedIn(); await api.delete(`/sets/${idToDelete}`); load(); } catch {} }}
      />
    </main>
  );
}




