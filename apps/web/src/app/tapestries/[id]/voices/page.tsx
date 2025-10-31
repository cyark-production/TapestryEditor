"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageName, resolveLanguageMeta } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon } from "../../../../components/icons";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";
import { FileLink } from "../../../../components/FileLink";
import { VideoPreview } from "../../../../components/VideoPreview";
import { CcEditor } from "../../../../components/CcEditor";

export default function VoicesPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    nameAltLang: "",
    title: "",
    titleAltLang: "",
    affiliation: "",
    affiliationAltLang: "",
    bio: "",
    bioAltLang: "",
    introVideo: "",
    introVideoCc1: "",
    introVideoCc2: "",
    headshot: "",
    headshotAltDesc: "",
    headshotLarge: "",
    headshotLargeAltDesc: "",
    order: ""
  });
  const [addOpen, setAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: number; field: string; label: string; value: string; multiline?: boolean; forceRtl?: boolean } | null>(null);
  const [lang1, setLang1] = useState<string | null>(null);
  const [lang2, setLang2] = useState<string | null>(null);
  const [lang2IsRtl, setLang2IsRtl] = useState<boolean>(false);
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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
      const a1 = (tapRes.data?.audioLanguage1 as string | undefined) || "";
      const a2 = (tapRes.data?.audioLanguage2 as string | undefined) || "";
      const [l1, meta2] = await Promise.all([resolveLanguageName(a1), resolveLanguageMeta(a2)]);
      setLang1(l1 && l1.trim() !== "" ? l1 : null);
      const label2 = meta2?.label?.trim() ? meta2.label : null;
      setLang2(label2);
      setLang2IsRtl(!!meta2?.rtl);
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

  const toggleExpand = (voiceId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(voiceId)) next.delete(voiceId); else next.add(voiceId);
      return next;
    });
  };
  const isExpanded = (voiceId: number) => expanded.has(voiceId);

  const lang1Label = lang1 || "Primary Language";

  return (
    <main style={{ padding: 24 }}>
      <h2>Voices</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button className="legacy-icon-btn add-btn" onClick={() => { setForm({ name: "", title: "", order: "" }); setAddOpen(true); }}>
            <AddIcon /> Add Voice
          </button>
        </div>
      )}
      {items.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '40px' }}></th>
                <th className="legacy-th" style={{ width: '80px' }}>ID</th>
                <th className="legacy-th" style={{ width: '100px' }}>Order</th>
                <th className="legacy-th" style={{ width: '100px' }}>Lang</th>
                <th className="legacy-th" style={{ width: '120px' }}>Thumbnail</th>
                <th className="legacy-th" style={{ width: '24%' }}>Voice Name</th>
                <th className="legacy-th" style={{ width: '24%' }}>Voice Title</th>
                <th className="legacy-th" style={{ width: '18%' }}>Affiliation</th>
                {canEdit && (<th className="legacy-th" style={{ width: '80px' }}>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <>
                  <tr key={v.id}>
                    <td className="legacy-td" style={{ textAlign: 'center' }}>
                      <button
                        className={`legacy-icon-btn legacy-expand-btn${isExpanded(v.id) ? ' expanded' : ''}`}
                        title={isExpanded(v.id) ? 'Collapse' : 'Expand'}
                        onClick={() => toggleExpand(v.id)}
                      >
                        {isExpanded(v.id) ? '▾' : '▸'}
                      </button>
                    </td>
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
                    <td className="legacy-td">{lang1Label}</td>
                    <td className="legacy-td" rowSpan={lang2 ? 2 : 1} style={{ verticalAlign: 'middle' }}>
                      {v.headshot ? (
                        <img
                          src={v.headshot}
                          alt={v.headshotAltDesc || v.name || 'Voice headshot'}
                          style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', background: '#f5f5f5' }}
                          loading="lazy"
                        />
                      ) : (
                        <span className="legacy-muted">—</span>
                      )}
                    </td>
                    <td className="legacy-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="legacy-clamp">{v.name || ''}</span>
                        {canEdit && (
                          <span className="legacy-icon-group">
                            <button className="legacy-icon-btn edit-btn" title="Edit name" onClick={() => setModal({ id: v.id, field: 'name', label: 'Voice Name', value: v.name || '' })}><EditIcon /></button>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="legacy-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="legacy-clamp">{v.title || ''}</span>
                        {canEdit && (
                          <span className="legacy-icon-group">
                            <button className="legacy-icon-btn edit-btn" title="Edit title" onClick={() => setModal({ id: v.id, field: 'title', label: 'Voice Title', value: v.title || '' })}><EditIcon /></button>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="legacy-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="legacy-clamp">{v.affiliation || <span className="legacy-muted">—</span>}</span>
                        {canEdit && (
                          <span className="legacy-icon-group">
                            <button className="legacy-icon-btn edit-btn" title="Edit affiliation" onClick={() => setModal({ id: v.id, field: 'affiliation', label: 'Affiliation', value: v.affiliation || '' })}><EditIcon /></button>
                          </span>
                        )}
                      </div>
                    </td>
                    {canEdit && (
                      <td className="legacy-td col-actions legacy-row-actions">
                        <button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: v.id })}><TrashIcon /></button>
                      </td>
                    )}
                  </tr>
                  {lang2 && (
                    <tr key={`alt-${v.id}`}>
                      <td className="legacy-td" style={{ textAlign: 'center' }}></td>
                      <td className="legacy-td col-id legacy-muted"></td>
                      <td className="legacy-td col-order legacy-muted"></td>
                      <td className="legacy-td legacy-muted">{lang2}</td>
                      <td className="legacy-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="legacy-clamp">{v.nameAltLang || <span className="legacy-muted">—</span>}</span>
                          {canEdit && (
                            <span className="legacy-icon-group">
                              <button
                                className="legacy-icon-btn edit-btn"
                                title={`Edit name (${lang2})`}
                                onClick={() => setModal({ id: v.id, field: 'nameAltLang', label: `Voice Name (${lang2})`, value: v.nameAltLang || '', forceRtl: lang2IsRtl })}
                              >
                                <EditIcon />
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="legacy-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="legacy-clamp">{v.titleAltLang || <span className="legacy-muted">—</span>}</span>
                          {canEdit && (
                            <span className="legacy-icon-group">
                              <button
                                className="legacy-icon-btn edit-btn"
                                title={`Edit title (${lang2})`}
                                onClick={() => setModal({ id: v.id, field: 'titleAltLang', label: `Voice Title (${lang2})`, value: v.titleAltLang || '', forceRtl: lang2IsRtl })}
                              >
                                <EditIcon />
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="legacy-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="legacy-clamp">{v.affiliationAltLang || <span className="legacy-muted">—</span>}</span>
                          {canEdit && (
                            <span className="legacy-icon-group">
                              <button
                                className="legacy-icon-btn edit-btn"
                                title={`Edit affiliation (${lang2})`}
                                onClick={() => setModal({ id: v.id, field: 'affiliationAltLang', label: `Affiliation (${lang2})`, value: v.affiliationAltLang || '', forceRtl: lang2IsRtl })}
                              >
                                <EditIcon />
                              </button>
                            </span>
                          )}
                        </div>
                      </td>
                      {canEdit && (<td className="legacy-td col-actions"></td>)}
                    </tr>
                  )}
                  {isExpanded(v.id) && (
                    <tr key={`details-${v.id}`}>
                      <td className="legacy-td" colSpan={canEdit ? 9 : 8}>
                        <div className="card" style={{ padding: 16, background: '#fafafa' }}>
                          <div className="legacy-section-header" style={{ marginTop: 0 }}>Details</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: '12px 16px', alignItems: 'start', marginBottom: 16 }}>
                            <label style={{ fontWeight: 500 }}>Bio</label>
                            <div className="legacy-clamp">{v.bio || <span className="legacy-muted">—</span>}</div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button className="legacy-icon-btn edit-btn" title="Edit bio" onClick={() => setModal({ id: v.id, field: 'bio', label: 'Bio', value: v.bio || '', multiline: true })}><EditIcon /></button>
                                </span>
                              )}
                            </div>

                            <label style={{ fontWeight: 500 }}>Intro Video</label>
                            <div>
                              {v.introVideo ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <FileLink url={v.introVideo} />
                                  <VideoPreview url={v.introVideo} width={360} />
                                </div>
                              ) : (
                                <span className="legacy-muted">—</span>
                              )}
                            </div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button className="legacy-icon-btn edit-btn" title="Edit intro video" onClick={() => setModal({ id: v.id, field: 'introVideo', label: 'Intro Video URL', value: v.introVideo || '' })}><EditIcon /></button>
                                </span>
                              )}
                            </div>

                            <label style={{ fontWeight: 500 }}>Intro Video CC 1</label>
                            <div>
                              {v.introVideoCc1 ? <FileLink url={v.introVideoCc1} /> : <span className="legacy-muted">—</span>}
                            </div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button className="legacy-icon-btn edit-btn" title="Edit intro video CC 1" onClick={() => setModal({ id: v.id, field: 'introVideoCc1', label: 'Intro Video CC 1 URL', value: v.introVideoCc1 || '' })}><EditIcon /></button>
                                  {v.introVideoCc1 && (
                                    <button
                                      className="legacy-icon-btn"
                                      title="Edit CC text"
                                      onClick={() => setModal({ id: v.id, field: 'introVideoCc1', label: 'Edit Intro Video CC 1', value: v.introVideoCc1 || '' })}
                                    >
                                      📝
                                    </button>
                                  )}
                                </span>
                              )}
                            </div>

                            <label style={{ fontWeight: 500 }}>Intro Video CC 2</label>
                            <div>
                              {v.introVideoCc2 ? <FileLink url={v.introVideoCc2} /> : <span className="legacy-muted">—</span>}
                            </div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button
                                    className="legacy-icon-btn edit-btn"
                                    title="Edit intro video CC 2"
                                    onClick={() => setModal({ id: v.id, field: 'introVideoCc2', label: 'Intro Video CC 2 URL', value: v.introVideoCc2 || '', forceRtl: lang2IsRtl })}
                                  >
                                    <EditIcon />
                                  </button>
                                  {v.introVideoCc2 && (
                                    <button
                                      className="legacy-icon-btn"
                                      title="Edit CC text"
                                      onClick={() => setModal({ id: v.id, field: 'introVideoCc2', label: 'Edit Intro Video CC 2', value: v.introVideoCc2 || '', forceRtl: lang2IsRtl })}
                                    >
                                      📝
                                    </button>
                                  )}
                                </span>
                              )}
                            </div>

                            <label style={{ fontWeight: 500 }}>Headshot</label>
                            <div>
                              {v.headshot ? <FileLink url={v.headshot} /> : <span className="legacy-muted">—</span>}
                            </div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button className="legacy-icon-btn edit-btn" title="Edit headshot" onClick={() => setModal({ id: v.id, field: 'headshot', label: 'Headshot URL', value: v.headshot || '' })}><EditIcon /></button>
                                </span>
                              )}
                            </div>

                            <label style={{ fontWeight: 500 }}>Headshot Alt Desc</label>
                            <div className="legacy-clamp">{v.headshotAltDesc || <span className="legacy-muted">—</span>}</div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button className="legacy-icon-btn edit-btn" title="Edit headshot alt description" onClick={() => setModal({ id: v.id, field: 'headshotAltDesc', label: 'Headshot Alt Description', value: v.headshotAltDesc || '', multiline: true })}><EditIcon /></button>
                                </span>
                              )}
                            </div>

                            <label style={{ fontWeight: 500 }}>Headshot (Large)</label>
                            <div>
                              {v.headshotLarge ? <FileLink url={v.headshotLarge} /> : <span className="legacy-muted">—</span>}
                            </div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button className="legacy-icon-btn edit-btn" title="Edit headshot (large)" onClick={() => setModal({ id: v.id, field: 'headshotLarge', label: 'Headshot Large URL', value: v.headshotLarge || '' })}><EditIcon /></button>
                                </span>
                              )}
                            </div>

                            <label style={{ fontWeight: 500 }}>Headshot Large Alt Desc</label>
                            <div className="legacy-clamp">{v.headshotLargeAltDesc || <span className="legacy-muted">—</span>}</div>
                            <div>
                              {canEdit && (
                                <span className="legacy-icon-group">
                                  <button className="legacy-icon-btn edit-btn" title="Edit headshot large alt description" onClick={() => setModal({ id: v.id, field: 'headshotLargeAltDesc', label: 'Headshot Large Alt Description', value: v.headshotLargeAltDesc || '', multiline: true })}><EditIcon /></button>
                                </span>
                              )}
                            </div>

                            {lang2 && (
                              <>
                                <label style={{ fontWeight: 500 }}>{`Bio (${lang2})`}</label>
                                <div className="legacy-clamp">{v.bioAltLang || <span className="legacy-muted">—</span>}</div>
                                <div>
                                  {canEdit && (
                                    <span className="legacy-icon-group">
                                      <button
                                        className="legacy-icon-btn edit-btn"
                                        title={`Edit bio (${lang2})`}
                                        onClick={() => setModal({ id: v.id, field: 'bioAltLang', label: `Bio (${lang2})`, value: v.bioAltLang || '', multiline: true, forceRtl: lang2IsRtl })}
                                      >
                                        <EditIcon />
                                      </button>
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
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
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
              <label>Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {lang2 && (<>
                <label>{`Name (${lang2})`}</label>
                <input
                  dir={lang2IsRtl ? 'rtl' : undefined}
                  style={{ ...(lang2IsRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={form.nameAltLang || ''}
                  onChange={(e) => setForm({ ...form, nameAltLang: e.target.value })}
                />
              </>)}
              <label>Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              {lang2 && (<>
                <label>{`Title (${lang2})`}</label>
                <input
                  dir={lang2IsRtl ? 'rtl' : undefined}
                  style={{ ...(lang2IsRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={form.titleAltLang || ''}
                  onChange={(e) => setForm({ ...form, titleAltLang: e.target.value })}
                />
              </>)}
              <label>Affiliation</label>
              <input value={form.affiliation} onChange={(e) => setForm({ ...form, affiliation: e.target.value })} />
              {lang2 && (<>
                <label>{`Affiliation (${lang2})`}</label>
                <input
                  dir={lang2IsRtl ? 'rtl' : undefined}
                  style={{ ...(lang2IsRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={form.affiliationAltLang || ''}
                  onChange={(e) => setForm({ ...form, affiliationAltLang: e.target.value })}
                />
              </>)}
              <label>Bio</label>
              <textarea rows={4} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              {lang2 && (<>
                <label>{`Bio (${lang2})`}</label>
                <textarea
                  rows={4}
                  dir={lang2IsRtl ? 'rtl' : undefined}
                  style={{ ...(lang2IsRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={form.bioAltLang || ''}
                  onChange={(e) => setForm({ ...form, bioAltLang: e.target.value })}
                />
              </>)}
              <label>Intro Video URL</label>
              <input value={form.introVideo} onChange={(e) => setForm({ ...form, introVideo: e.target.value })} />
              <label>Intro Video CC 1 URL</label>
              <input value={form.introVideoCc1} onChange={(e) => setForm({ ...form, introVideoCc1: e.target.value })} />
              <label>Intro Video CC 2 URL</label>
              <input value={form.introVideoCc2} onChange={(e) => setForm({ ...form, introVideoCc2: e.target.value })} />
              <label>Headshot URL</label>
              <input value={form.headshot} onChange={(e) => setForm({ ...form, headshot: e.target.value })} />
              <label>Headshot Alt Description</label>
              <textarea rows={2} value={form.headshotAltDesc} onChange={(e) => setForm({ ...form, headshotAltDesc: e.target.value })} />
              <label>Headshot Large URL</label>
              <input value={form.headshotLarge} onChange={(e) => setForm({ ...form, headshotLarge: e.target.value })} />
              <label>Headshot Large Alt Description</label>
              <textarea rows={2} value={form.headshotLargeAltDesc} onChange={(e) => setForm({ ...form, headshotLargeAltDesc: e.target.value })} />
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
                    nameAltLang: form.nameAltLang || null,
                    title: form.title || null,
                    titleAltLang: form.titleAltLang || null,
                    affiliation: form.affiliation || null,
                    affiliationAltLang: form.affiliationAltLang || null,
                    bio: form.bio || null,
                    bioAltLang: form.bioAltLang || null,
                    introVideo: form.introVideo || null,
                    introVideoCc1: form.introVideoCc1 || null,
                    introVideoCc2: form.introVideoCc2 || null,
                    headshot: form.headshot || null,
                    headshotAltDesc: form.headshotAltDesc || null,
                    headshotLarge: form.headshotLarge || null,
                    headshotLargeAltDesc: form.headshotLargeAltDesc || null,
                    order: form.order ? Number(form.order) : null,
                    tapestryId: Number(id)
                  });
                  setAddOpen(false);
                  setForm({
                    name: "",
                    nameAltLang: "",
                    title: "",
                    titleAltLang: "",
                    affiliation: "",
                    affiliationAltLang: "",
                    bio: "",
                    bioAltLang: "",
                    introVideo: "",
                    introVideoCc1: "",
                    introVideoCc2: "",
                    headshot: "",
                    headshotAltDesc: "",
                    headshotLarge: "",
                    headshotLargeAltDesc: "",
                    order: ""
                  });
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
        modal.label?.includes("Edit") && modal.label?.includes("CC") ? (
          <CcEditor
            open={true}
            url={modal.value}
            label={modal.label}
            direction={modal.forceRtl ? 'rtl' : undefined}
            onClose={() => setModal(null)}
            onSaved={load}
          />
        ) : (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
              {(modal.multiline || modal.field.toLowerCase().includes('bio') || modal.field.toLowerCase().includes('desc')) ? (
                <textarea
                  dir={modal.forceRtl ? 'rtl' : undefined}
                  style={{ width: '100%', minHeight: 140, ...(modal.forceRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={modal.value}
                  onChange={(e) => setModal({ ...modal, value: e.target.value })}
                />
              ) : (
                <input
                  dir={modal.forceRtl ? 'rtl' : undefined}
                  style={{ width: '100%', ...(modal.forceRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={modal.value}
                  onChange={(e) => setModal({ ...modal, value: e.target.value })}
                />
              )}
              <div className="modal-actions">
                <button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={async () => {
                  if (!modal) return;
                  try {
                    await ensureSignedIn();
                    const trimmed = modal.value?.trim() ?? '';
                    await api.put(`/voices/${modal.id}`, { [modal.field]: trimmed === '' ? null : trimmed });
                    setModal(null);
                    load();
                  } catch {}
                }}>Save</button>
              </div>
            </div>
          </div>
        )
      )}
    </main>
  );
}


