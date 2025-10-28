"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageName } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon } from "../../../../components/icons";
import { FileLink } from "../../../../components/FileLink";
import { filenameFromUrl } from "../../../../lib/files";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";

export default function MediaItemsPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [modal, setModal] = useState<{ id: number; field: string; label: string; value: string } | null>(null);
  const [form, setForm] = useState<any>({ sceneId: "", title: "", caption: "", type: "image", assetLink: "", assetThumbLink: "", assetSecondaryLink: "", assetAltDesc: "", assetCc: "", order: "", credit: "" });
  const [scenes, setScenes] = useState<any[]>([]);
  const [lang2, setLang2] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>(() => ({ open: false }));

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, listRes, tapRes] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/media-items`),
        api.get(`/tapestries/${id}`),
      ]);
      setMe(meRes.data || null);
      setItems(Array.isArray(listRes.data) ? listRes.data : []);
      setScenes(Array.isArray(tapRes.data?.scenes) ? tapRes.data.scenes : []);
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
      <h2>Media Items</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button className="legacy-icon-btn" title="Add media item" onClick={() => { setForm({ sceneId: "", title: "", titleAltLang: "", caption: "", captionAltLang: "", type: "image", assetLink: "", assetThumbLink: "", assetSecondaryLink: "", assetAltDesc: "", assetCc: "", assetCcAlt: "", order: "", credit: "", creditAltLang: "" }); setAddOpen(true); }}><AddIcon /></button>
        </div>
      )}
      {items.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '60px' }}>Scene</th>
                <th className="legacy-th" style={{ width: '80px' }}>Thumb</th>
                <th className="legacy-th" style={{ width: '60px' }}>Order</th>
                <th className="legacy-th" style={{ width: '12%' }}>Title</th>
                <th className="legacy-th" style={{ width: '15%' }}>Caption</th>
                <th className="legacy-th" style={{ width: '70px' }}>Type</th>
                <th className="legacy-th" style={{ width: '18%' }}>Asset</th>
                <th className="legacy-th" style={{ width: '15%' }}>Thumb Link</th>
                <th className="legacy-th" style={{ width: '12%' }}>Credit</th>
                <th className="legacy-th" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let last: any = null; let shade = false;
                return items.map((m) => {
                  if (m.sceneId !== last) { shade = !shade; last = m.sceneId; }
                  const rowStyle = { background: shade ? '#f9fafb' : 'transparent' } as React.CSSProperties;
                  return (
                    <>
                      <tr key={m.id} style={rowStyle}>
                    <td className="legacy-td" title={`Scene ID ${m.scene?.id ?? m.sceneId ?? ''}`}>{m.scene?.sequence || ''}</td>
                    <td className="legacy-td" rowSpan={lang2 ? 2 : 1}>
                      {(() => {
                        const src = m.assetThumbLink || m.assetLink;
                        if (!src) return <span className="legacy-muted">—</span>;
                        return <img src={src} alt={m.assetAltDesc || filenameFromUrl(src)} style={{ maxWidth: 64, maxHeight: 64, borderRadius: 4, objectFit: 'cover' }} />;
                      })()}
                    </td>
                    <td className="legacy-td col-order">{m.order ?? ''}</td>
                    <td className="legacy-td col-expand">
                      <span>{m.title || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit title" onClick={() => setModal({ id: m.id, field: 'title', label: 'Title', value: m.title || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td col-expand">
                      <span>{m.caption || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit caption" onClick={() => setModal({ id: m.id, field: 'caption', label: 'Caption', value: m.caption || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td">{m.type || ''}</td>
                    <td className="legacy-td">
                      <FileLink url={m.assetLink} />
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit asset" onClick={() => setModal({ id: m.id, field: 'assetLink', label: 'Asset URL', value: m.assetLink || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td">
                      <FileLink url={m.assetThumbLink} showIcon={false} />
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit thumb" onClick={() => setModal({ id: m.id, field: 'assetThumbLink', label: 'Thumb URL', value: m.assetThumbLink || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td col-expand">
                      <span>{m.credit || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit credit" onClick={() => setModal({ id: m.id, field: 'credit', label: 'Credit', value: m.credit || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td col-actions legacy-row-actions">
                      {canEdit && (<button className="legacy-icon-btn delete-btn" title="Delete" onClick={async () => {
                        setConfirm({ open: true, id: m.id });
                      }}><TrashIcon /></button>)}
                    </td>
                  </tr>
                      {lang2 && (
                    <tr key={`alt-${m.id}`} style={rowStyle}>
                      <td className="legacy-td"></td>
                      <td className="legacy-td col-order"></td>
                      <td className="legacy-td col-expand">
                        <span>{m.titleAltLang || ''}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit Title (${lang2})`} onClick={() => setModal({ id: m.id, field: 'titleAltLang', label: `Title (${lang2})`, value: m.titleAltLang || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td col-expand">
                        <span>{m.captionAltLang || ''}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit Caption (${lang2})`} onClick={() => setModal({ id: m.id, field: 'captionAltLang', label: `Caption (${lang2})`, value: m.captionAltLang || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td"></td>
                      <td className="legacy-td">
                        <FileLink url={m.assetSecondaryLink} />
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit Alt Asset (${lang2})`} onClick={() => setModal({ id: m.id, field: 'assetSecondaryLink', label: `Asset URL (${lang2})`, value: m.assetSecondaryLink || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td"></td>
                      <td className="legacy-td col-expand">
                        <span>{m.creditAltLang || ''}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit Credit (${lang2})`} onClick={() => setModal({ id: m.id, field: 'creditAltLang', label: `Credit (${lang2})`, value: m.creditAltLang || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td col-actions"></td>
                    </tr>
                      )}
                    </>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      ) : (<p>No media items found.</p>)}

      <ConfirmDialog
        open={confirm.open}
        title="Delete Media Item"
        message="Are you sure you want to delete this media item? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => {
          const idToDelete = confirm.id;
          setConfirm({ open: false });
          if (!idToDelete) return;
          try { await ensureSignedIn(); await api.delete(`/media-items/${idToDelete}`); load(); } catch (e: any) {
                          const status = e?.response?.status;
                          if (status === 403) setError('You do not have permission to delete media items.');
                          else setError(e?.message || 'Failed to delete');
                        }
        }}
      />

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Media Item</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 8 }}>
              <label>Scene</label>
              <select value={form.sceneId} onChange={(e) => setForm({ ...form, sceneId: e.target.value })}>
                <option value="">Select a scene…</option>
                {scenes.map((s) => <option key={s.id} value={String(s.id)}>{s.sequence} {s.title ? `- ${s.title}` : ''}</option>)}
              </select>
              <label>Order</label>
              <input value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} />
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {lang2 && (<>
                <label>{`Title (${lang2})`}</label>
                <input value={form.titleAltLang || ''} onChange={(e) => setForm({ ...form, titleAltLang: e.target.value })} />
              </>)}
              <label>Caption</label>
              <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
              {lang2 && (<>
                <label>{`Caption (${lang2})`}</label>
                <input value={form.captionAltLang || ''} onChange={(e) => setForm({ ...form, captionAltLang: e.target.value })} />
              </>)}
              <label>Type</label>
              <input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <label>Asset URL</label>
              <input value={form.assetLink} onChange={(e) => setForm({ ...form, assetLink: e.target.value })} />
              <label>Thumb URL</label>
              <input value={form.assetThumbLink} onChange={(e) => setForm({ ...form, assetThumbLink: e.target.value })} />
              <label>{`Alt Asset URL${lang2 ? ` (${lang2})` : ''}`}</label>
              <input value={form.assetSecondaryLink} onChange={(e) => setForm({ ...form, assetSecondaryLink: e.target.value })} />
              <label>Alt Desc</label>
              <input value={form.assetAltDesc} onChange={(e) => setForm({ ...form, assetAltDesc: e.target.value })} />
              <label>Asset CC</label>
              <input value={form.assetCc} onChange={(e) => setForm({ ...form, assetCc: e.target.value })} />
              {lang2 && (<>
                <label>{`Asset CC (${lang2})`}</label>
                <input value={form.assetCcAlt || ''} onChange={(e) => setForm({ ...form, assetCcAlt: e.target.value })} />
              </>)}
              <label>Credit</label>
              <input value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} />
              {lang2 && (<>
                <label>{`Credit (${lang2})`}</label>
                <input value={form.creditAltLang || ''} onChange={(e) => setForm({ ...form, creditAltLang: e.target.value })} />
              </>)}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!id || !form.sceneId} onClick={async () => {
                if (!id) return;
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/media-items`, {
                    sceneId: Number(form.sceneId),
                    order: form.order ? Number(form.order) : null,
                    title: form.title || null,
                    titleAltLang: form.titleAltLang || null,
                    caption: form.caption || null,
                    captionAltLang: form.captionAltLang || null,
                    type: form.type || null,
                    assetLink: form.assetLink || null,
                    assetThumbLink: form.assetThumbLink || null,
                    assetSecondaryLink: form.assetSecondaryLink || null,
                    assetAltDesc: form.assetAltDesc || null,
                    assetCc: form.assetCc || null,
                    assetCcAlt: form.assetCcAlt || null,
                    credit: form.credit || null,
                    creditAltLang: form.creditAltLang || null,
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
                  await api.put(`/media-items/${modal.id}`, { [modal.field]: modal.value?.trim() === '' ? null : modal.value });
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


