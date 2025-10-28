"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageName } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon } from "../../../../components/icons";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";

export default function VoicesPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [form, setForm] = useState({ name: "", title: "", order: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: number; field: 'name' | 'title'; label: string; value: string } | null>(null);
  const [lang2, setLang2] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, voicesRes, tapRes] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/voices`),
        api.get(`/tapestries/${id}`),
      ]);
      setMe(meRes.data || null);
      setItems(Array.isArray(voicesRes.data) ? voicesRes.data : []);
      const a2 = (tapRes.data?.audioLanguage2 as string | undefined) || "";
      const l2 = await resolveLanguageName(a2);
      setLang2(l2 && l2.trim() !== "" ? l2 : null);
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

  return (
    <main style={{ padding: 24 }}>
      <h2>Voices</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button className="legacy-icon-btn" title="Add voice" onClick={() => { setForm({ name: "", title: "", order: "" }); setAddOpen(true); }}><AddIcon /></button>
        </div>
      )}
      {items.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '80px' }}>ID</th>
                <th className="legacy-th" style={{ width: '100px' }}>Order</th>
                <th className="legacy-th" style={{ width: '120px' }}>Lang</th>
                <th className="legacy-th" style={{ width: '30%' }}>Voice Name</th>
                <th className="legacy-th" style={{ width: 'auto' }}>Voice Title</th>
                <th className="legacy-th" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <>
                  <tr key={v.id}>
                    <td className="legacy-td col-id">{v.id}</td>
                    <td className="legacy-td col-order">
                      <span>{v.order ?? ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit order" onClick={async () => {
                        try {
                          await ensureSignedIn();
                          const orderStr = prompt('Edit voice order', String(v.order ?? '')) ?? String(v.order ?? '');
                          const order = orderStr.trim() === '' ? null : Number(orderStr);
                          await api.put(`/voices/${v.id}`, { order });
                          load();
                        } catch {}
                      }}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td">English</td>
                    <td className="legacy-td">
                      <span>{v.name || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit name" onClick={() => setModal({ id: v.id, field: 'name', label: 'Voice Name', value: v.name || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td">
                      <span>{v.title || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit title" onClick={() => setModal({ id: v.id, field: 'title', label: 'Voice Title', value: v.title || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td col-actions legacy-row-actions">
                      {canEdit && (<button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: v.id })}><TrashIcon /></button>)}
                    </td>
                  </tr>
                  {lang2 && (
                    <tr key={`alt-${v.id}`}>
                      <td className="legacy-td col-id legacy-muted"></td>
                      <td className="legacy-td col-order legacy-muted"></td>
                      <td className="legacy-td legacy-muted">{lang2}</td>
                      <td className="legacy-td">
                        <span>{v.nameAltLang || ''}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit name (${lang2})`} onClick={() => setModal({ id: v.id, field: 'name', label: `Voice Name (${lang2})`, value: v.nameAltLang || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{v.titleAltLang || ''}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit title (${lang2})`} onClick={() => setModal({ id: v.id, field: 'title', label: `Voice Title (${lang2})`, value: v.titleAltLang || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td col-actions"></td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No voices found.</p>
      )}
      <ConfirmDialog
        open={confirm.open}
        title="Delete Voice"
        message="Are you sure you want to delete this voice? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => { const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return; try { await ensureSignedIn(); await api.delete(`/voices/${idToDelete}`); load(); } catch (e: any) { const status = e?.response?.status; if (status === 403) setError('You do not have permission to delete voices.'); } }}
      />
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Voice</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {lang2 && (<>
                <label>{`Name (${lang2})`}</label>
                <input value={(form as any).nameAltLang || ''} onChange={(e) => setForm({ ...(form as any), nameAltLang: e.target.value } as any)} />
              </>)}
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {lang2 && (<>
                <label>{`Title (${lang2})`}</label>
                <input value={(form as any).titleAltLang || ''} onChange={(e) => setForm({ ...(form as any), titleAltLang: e.target.value } as any)} />
              </>)}
              <label>Order</label>
              <input value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!id || !form.name} onClick={async () => {
                if (!id) return;
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/voices`, {
                    name: form.name,
                    nameAltLang: (form as any).nameAltLang || null,
                    title: form.title || null,
                    titleAltLang: (form as any).titleAltLang || null,
                    order: form.order ? Number(form.order) : null,
                    tapestryId: Number(id)
                  });
                  setAddOpen(false);
                  setForm({ name: "", title: "", order: "" });
                  load();
                } catch (e: any) {
                  const status = e?.response?.status;
                  const message = e?.response?.data || e?.message || 'Unknown error';
                  setError(`Failed to add voice (${status ?? ''}) ${typeof message === 'string' ? message : ''}`);
                }
              }}>Add</button>
            </div>
          </div>
        </div>
      )}
      {/* save handler respects alt fields */}
      {modal && modal.field === 'name' && modal.label.startsWith('Voice Name (') && (
        <></>
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
                  const isAlt = modal.label.includes('(') && modal.label.includes(')');
                  const key = modal.field === 'name' && isAlt ? 'nameAltLang' : (modal.field === 'title' && isAlt ? 'titleAltLang' : modal.field);
                  await api.put(`/voices/${modal.id}`, { [key]: modal.value?.trim() === '' ? null : modal.value });
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


