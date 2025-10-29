"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageName } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon, ToggleIcon } from "../../../../components/icons";
import { FileLink } from "../../../../components/FileLink";
import { CcEditor } from "../../../../components/CcEditor";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";
import Link from "next/link";

export default function TapestryScenesTab() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ sequence: "", title: "" });
  const [addOpen, setAddOpen] = useState(false);
  const [modal, setModal] = useState<{ id: number; field: 'sequence' | 'title' | 'description' | 'titleAltLang' | 'descriptionAltLang'; label: string; value: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const formErrors = useMemo(() => ({ sequence: validateSeq(form.sequence) }), [form.sequence]);
  const [lang2, setLang2] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const isExpanded = (id: number) => !!expanded[id];
  const toggleExpand = (id: number) => setExpanded((p) => ({ ...p, [id]: !p[id] }));
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });

  function validateSeq(s: string) {
    if (!s) return "Sequence is required";
    if (s.length > 255) return "Max 255 chars";
    return null;
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, res] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}`)
      ]);
      setMe(meRes.data || null);
      setItems(Array.isArray(res.data?.scenes) ? res.data.scenes : []);
      const a2 = (res.data?.audioLanguage2 as string | undefined) || "";
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

  useEffect(() => {
    load();
  }, [id]);

  const canEdit = (me?.roles || []).some((r: string) => r === 'Admin' || r === 'Editor');

  return (
    <main style={{ padding: 24 }}>
      <h2>Scenes</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {canEdit && (
        <div style={{ marginTop: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
          <button className="legacy-icon-btn add-btn" onClick={() => { setForm({ sequence: "", title: "" }); setAddOpen(true); }}><AddIcon /> Add Scene</button>
        </div>
      )}
      {items.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '40px' }}></th>
                <th className="legacy-th" style={{ width: '60px' }}>ID</th>
                <th className="legacy-th" style={{ width: '100px' }}>Sequence</th>
                <th className="legacy-th" style={{ width: '25%' }}>Title</th>
                <th className="legacy-th" style={{ width: 'auto' }}>Description</th>
                <th className="legacy-th" style={{ width: '200px' }}>Narration</th>
                <th className="legacy-th" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <>
                  <tr key={s.id}>
                    <td className="legacy-td" style={{ textAlign: 'center' }}>
                      <button className="legacy-icon-btn" title={isExpanded(s.id) ? 'Collapse' : 'Expand'} onClick={() => toggleExpand(s.id)}>
                        {isExpanded(s.id) ? '▾' : '▸'}
                      </button>
                    </td>
                    <td className="legacy-td col-id">{s.id}</td>
                    <td className="legacy-td">
                      <span>{s.sequence || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit sequence" onClick={() => setModal({ id: s.id, field: 'sequence', label: 'Sequence', value: s.sequence || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td">
                      <span>{s.title || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit title" onClick={() => setModal({ id: s.id, field: 'title', label: 'Title', value: s.title || '' })}><EditIcon /></button>)}
                    </td>
                    <td className="legacy-td col-expand">
                      <span>{s.description || ''}</span>
                      {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit description" onClick={() => setModal({ id: s.id, field: 'description', label: 'Description', value: s.description || '' })}><EditIcon /></button>)}
                    </td>
                  <td className="legacy-td">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Audio 1:</span> <FileLink url={(s as any).audioNarration1} />
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit audio narration 1" onClick={() => setModal({ id: s.id, field: 'audioNarration1' as any, label: 'Audio Narration 1', value: (s as any).audioNarration1 || '' })}><EditIcon /></button>)}
                      </div>
                      {lang2 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>Audio 2:</span> <FileLink url={(s as any).audioNarration2} />
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit audio narration 2" onClick={() => setModal({ id: s.id, field: 'audioNarration2' as any, label: 'Audio Narration 2', value: (s as any).audioNarration2 || '' })}><EditIcon /></button>)}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>CC 1:</span> <FileLink url={(s as any).narrationCc1} />
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit CC 1 URL" onClick={() => setModal({ id: s.id, field: 'narrationCc1' as any, label: 'Narration CC 1', value: (s as any).narrationCc1 || '' })}><EditIcon /></button>)}
                        {canEdit && (s as any).narrationCc1 && (<button className="legacy-icon-btn" title="Edit CC 1 Text" onClick={() => setModal({ id: s.id, field: 'narrationCc1' as any, label: 'Edit Scene CC 1', value: (s as any).narrationCc1 || '' })}>📝</button>)}
                      </div>
                      {lang2 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span>CC 2:</span> <FileLink url={(s as any).narrationCc2} />
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit CC 2 URL" onClick={() => setModal({ id: s.id, field: 'narrationCc2' as any, label: 'Narration CC 2', value: (s as any).narrationCc2 || '' })}><EditIcon /></button>)}
                          {canEdit && (s as any).narrationCc2 && (<button className="legacy-icon-btn" title="Edit CC 2 Text" onClick={() => setModal({ id: s.id, field: 'narrationCc2' as any, label: 'Edit Scene CC 2', value: (s as any).narrationCc2 || '' })}>📝</button>)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="legacy-td col-actions legacy-row-actions" style={{ display: 'flex', gap: 6 }}>
                    {canEdit && (<button className="legacy-icon-btn delete-btn" title="Delete scene" onClick={() => setConfirm({ open: true, id: s.id })}><TrashIcon /></button>)}
                  </td>
                  </tr>
                {isExpanded(s.id) && (
                  <tr key={`details-${s.id}`}>
                    <td className="legacy-td" colSpan={7}>
                      <div className="card" style={{ padding: 12, background: '#fafafa' }}>
                        <div className="legacy-section-header" style={{ marginTop: 0 }}>Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr auto', rowGap: 8, columnGap: 12 }}>
                          <label>Start Camera Position</label>
                          <div>{(s as any).startCameraPosition || <span className="legacy-muted">—</span>}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit start camera position" onClick={() => setModal({ id: s.id, field: 'startCameraPosition' as any, label: 'Start Camera Position', value: (s as any).startCameraPosition || '' })}><EditIcon /></button>)}

                          <label>Start Camera Target</label>
                          <div>{(s as any).startCameraTarget || <span className="legacy-muted">—</span>}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit start camera target" onClick={() => setModal({ id: s.id, field: 'startCameraTarget' as any, label: 'Start Camera Target', value: (s as any).startCameraTarget || '' })}><EditIcon /></button>)}

                          <label>Zoom Camera Position</label>
                          <div>{(s as any).zoomCameraPosition || <span className="legacy-muted">—</span>}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit zoom camera position" onClick={() => setModal({ id: s.id, field: 'zoomCameraPosition' as any, label: 'Zoom Camera Position', value: (s as any).zoomCameraPosition || '' })}><EditIcon /></button>)}

                          <label>Zoom Camera Target</label>
                          <div>{(s as any).zoomCameraTarget || <span className="legacy-muted">—</span>}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit zoom camera target" onClick={() => setModal({ id: s.id, field: 'zoomCameraTarget' as any, label: 'Zoom Camera Target', value: (s as any).zoomCameraTarget || '' })}><EditIcon /></button>)}

                          <label>Camera FOV</label>
                          <div>{(s as any).cameraFov ?? <span className="legacy-muted">—</span>}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit camera FOV" onClick={() => setModal({ id: s.id, field: 'cameraFov' as any, label: 'Camera FOV', value: (s as any).cameraFov != null ? String((s as any).cameraFov) : '' })}><EditIcon /></button>)}

                          <label>Pan Enable</label>
                          <div>{(s as any).panEnable || <span className="legacy-muted">—</span>}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit pan enable" onClick={() => setModal({ id: s.id, field: 'panEnable' as any, label: 'Pan Enable', value: (s as any).panEnable || '' })}><EditIcon /></button>)}

                          <label>Use Ambient Audio Alt</label>
                          <div>{(s as any).useAmbientAudioAlt ? 'On' : 'Off'}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Toggle ambient audio alt" onClick={async () => { try { await ensureSignedIn(); await api.put(`/scenes/${s.id}`, { useAmbientAudioAlt: !(s as any).useAmbientAudioAlt }); load(); } catch {} }}><ToggleIcon on={(s as any).useAmbientAudioAlt} /></button>)}

                          <label>Desaturate</label>
                          <div>{(s as any).desaturate ? 'On' : 'Off'}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Toggle desaturate" onClick={async () => { try { await ensureSignedIn(); await api.put(`/scenes/${s.id}`, { desaturate: !(s as any).desaturate }); load(); } catch {} }}><ToggleIcon on={(s as any).desaturate} /></button>)}

                          <label>Instant Move</label>
                          <div>{(s as any).instantMove ? 'On' : 'Off'}</div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Toggle instant move" onClick={async () => { try { await ensureSignedIn(); await api.put(`/scenes/${s.id}`, { instantMove: !(s as any).instantMove }); load(); } catch {} }}><ToggleIcon on={(s as any).instantMove} /></button>)}

                          <label>Interactive ID</label>
                          <div>
                            {(s as any).interactiveId != null ? (
                              <Link
                                href={`/tapestries/${id}/interactives#interactive-${(s as any).interactiveId}`}
                                style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 500 }}
                              >
                                {(s as any).interactiveId}
                              </Link>
                            ) : (
                              <span className="legacy-muted">—</span>
                            )}
                          </div>
                          {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit interactive ID" onClick={() => setModal({ id: s.id, field: 'interactiveId' as any, label: 'Interactive ID', value: (s as any).interactiveId != null ? String((s as any).interactiveId) : '' })}><EditIcon /></button>)}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {lang2 && (
                  <tr key={`alt-${s.id}`} className="secondary-lang-row">
                    <td className="legacy-td" style={{ width: '40px' }} />
                    <td className="legacy-td col-id legacy-muted" title={lang2}>{lang2?.slice(0, 3) || ''}</td>
                    <td className="legacy-td legacy-muted" style={{ fontStyle: 'italic' }}>—</td>
                    <td className="legacy-td">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="legacy-muted" style={{ fontSize: 12 }}>{`Title (${lang2})`}</span>
                        <span>{s.titleAltLang || <span className="legacy-muted">—</span>}</span>
                      </div>
                      {canEdit && (
                        <button
                          className="legacy-icon-btn edit-btn"
                          title={`Edit Title (${lang2})`}
                          onClick={() => setModal({ id: s.id, field: 'titleAltLang', label: `Title (${lang2})`, value: s.titleAltLang || '' })}
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                    <td className="legacy-td col-expand">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span className="legacy-muted" style={{ fontSize: 12 }}>{`Description (${lang2})`}</span>
                        <span>{s.descriptionAltLang || <span className="legacy-muted">—</span>}</span>
                      </div>
                      {canEdit && (
                        <button
                          className="legacy-icon-btn edit-btn"
                          title={`Edit Description (${lang2})`}
                          onClick={() => setModal({ id: s.id, field: 'descriptionAltLang', label: `Description (${lang2})`, value: s.descriptionAltLang || '' })}
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                    <td className="legacy-td" colSpan={2} />
                  </tr>
                )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Scene</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <label>Sequence</label>
              <input value={form.sequence} onChange={(e) => setForm({ ...form, sequence: e.target.value })} />
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {lang2 && (
                <>
                  <label>{`Title (${lang2})`}</label>
                  <input value={form.titleAltLang || ''} onChange={(e) => setForm({ ...form, titleAltLang: e.target.value })} />
                  <label>Description</label>
                  <input value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  <label>{`Description (${lang2})`}</label>
                  <input value={form.descriptionAltLang || ''} onChange={(e) => setForm({ ...form, descriptionAltLang: e.target.value })} />
                </>
              )}
            </div>
            {formErrors.sequence && <div style={{ color: 'crimson', marginTop: 8 }}>{formErrors.sequence}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!id || !!formErrors.sequence} onClick={async () => {
                if (!id) return;
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/scenes`, {
                    sequence: form.sequence,
                    title: form.title || null,
                    titleAltLang: form.titleAltLang || null,
                    description: form.description || null,
                    descriptionAltLang: form.descriptionAltLang || null,
                  });
                  setAddOpen(false);
                  setForm({ sequence: "", title: "" });
                  load();
                } catch (e: any) {
                  const status = e?.response?.status;
                  const message = e?.response?.data || e?.message || 'Unknown error';
                  setError(`Failed to add scene (${status ?? ''}) ${typeof message === 'string' ? message : ''}`);
                }
              }}>Add</button>
            </div>
          </div>
        </div>
      )}
      {modal && (
        modal.label?.startsWith('Edit Scene CC') ? (
          <CcEditor open={true} url={modal.value} label={modal.label} onClose={() => setModal(null)} />
        ) : (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
            <input style={{ width: '100%' }} value={modal.value} onChange={(e) => { setModal({ ...modal, value: e.target.value }); setModalError(null); }} />
            {modalError && <div style={{ color: 'crimson', marginTop: 8 }}>{modalError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                if (!modal) return;
                try {
                  await ensureSignedIn();
                  const numericKeys = new Set(['cameraFov']);
                  const boolKeys = new Set(['desaturate','instantMove','useAmbientAudioAlt']);
                  const payload: any = {};
                  if (numericKeys.has(modal.field as any)) payload[modal.field] = modal.value.trim() === '' ? null : Number(modal.value);
                  else if (boolKeys.has(modal.field as any)) payload[modal.field] = modal.value.trim() === '' ? null : (modal.value === '1' || modal.value.toLowerCase() === 'true');
                  else payload[modal.field] = modal.value?.trim() === '' ? null : modal.value;
                  await api.put(`/scenes/${modal.id}`, payload);
                  setModal(null);
                  load();
                } catch (e: any) {
                  const status = e?.response?.status;
                  const message = e?.response?.data || e?.message || 'Unknown error';
                  setModalError(`Failed to save (${status ?? ''}) ${typeof message === 'string' ? message : ''}`);
                }
              }}>Save</button>
            </div>
          </div>
        </div>
        )
      )}
      <ConfirmDialog
        open={confirm.open}
        title="Delete Scene"
        message="Are you sure you want to delete this scene? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => {
          const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return;
          try { await ensureSignedIn(); await api.delete(`/scenes/${idToDelete}`); load(); } catch (e: any) {
            const status = e?.response?.status; if (status === 403) setError('You do not have permission to delete scenes.');
            else { const message = e?.response?.data || e?.message || 'Unknown error'; setError(`Failed to delete scene (${status ?? ''}) ${typeof message === 'string' ? message : ''}`); }
          }
        }}
      />
    </main>
  );
}


