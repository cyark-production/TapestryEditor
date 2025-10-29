"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageName } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon } from "../../../../components/icons";
import { FileLink } from "../../../../components/FileLink";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";
import { CcEditor } from "../../../../components/CcEditor";

export default function VoiceClipsPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: number; field: 'voiceBubbleText' | 'voiceVideo' | 'voiceVideoCc1' | 'voiceVideoCc2'; label: string; value: string } | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<{ sceneId: string; voiceId: string; voiceBubbleText: string; voiceVideo: string; voiceVideoCc1: string; voiceVideoCc2: string }>({ sceneId: "", voiceId: "", voiceBubbleText: "", voiceVideo: "", voiceVideoCc1: "", voiceVideoCc2: "" });
  const [scenes, setScenes] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [lang1, setLang1] = useState<string>('English');
  const [lang2, setLang2] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, clipsRes, tapRes, voicesRes] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/voice-clips`),
        api.get(`/tapestries/${id}`),
        api.get(`/tapestries/${id}/voices`),
      ]);
      setMe(meRes.data || null);
      setItems(Array.isArray(clipsRes.data) ? clipsRes.data : []);
      setScenes(Array.isArray(tapRes.data?.scenes) ? tapRes.data.scenes : []);
      setVoices(Array.isArray(voicesRes.data) ? voicesRes.data : []);
      const a1 = (tapRes.data?.audioLanguage1 as string | undefined) || '';
      const a2 = (tapRes.data?.audioLanguage2 as string | undefined) || "";
      const [l1, l2] = await Promise.all([resolveLanguageName(a1), resolveLanguageName(a2)]);
      setLang1((l1 && l1.trim()) || 'English');
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

  const clipRows = useMemo(() => {
    let last: any = null; let shade = false;
    return items.map((c) => {
      if (c.sceneId !== last) { shade = !shade; last = c.sceneId; }
      const rowStyle = { background: shade ? '#f9fafb' : 'transparent' } as React.CSSProperties;
      return (
        <>
          <tr key={c.id} style={rowStyle}>
            <td className="legacy-td" title={`Scene ID ${c.scene?.id ?? c.sceneId ?? ''}`}>{c.scene?.sequence || ''}</td>
            <td className="legacy-td col-id">{c.id}</td>
            <td className="legacy-td col-order">{c.voice?.order ?? ''}</td>
            <td className="legacy-td">{(lang1 || 'English')}</td>
            <td className="legacy-td">{c.voice?.name || ''}</td>
            <td className="legacy-td">{c.voice?.title || ''}</td>
            <td className="legacy-td col-expand">
              <span>{c.voiceBubbleText || ''}</span>
              {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit bubble" onClick={() => setModal({ id: c.id, field: 'voiceBubbleText', label: 'Voice Bubble Text', value: c.voiceBubbleText || '' })}><EditIcon /></button>)}
            </td>
            <td className="legacy-td">
              <FileLink url={c.voiceVideo} />
              {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit video" onClick={() => setModal({ id: c.id, field: 'voiceVideo', label: 'Voice Video URL', value: c.voiceVideo || '' })}><EditIcon /></button>)}
            </td>
            <td className="legacy-td">
              <FileLink url={c.voiceVideoCc1} />
              <div style={{ display: 'flex', gap: 6 }}>
                {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit CC URL (${lang1 || 'English'})`} onClick={() => setModal({ id: c.id, field: 'voiceVideoCc1', label: `Voice Video CC ${lang1 || 'English'}`, value: c.voiceVideoCc1 || '' })}><EditIcon /></button>)}
                {canEdit && c.voiceVideoCc1 && (<button className="legacy-icon-btn" title={`Edit CC Text (${lang1 || 'English'})`} onClick={() => setModal({ id: c.id, field: 'voiceVideoCc1', label: `Edit Voice CC (${lang1 || 'English'})`, value: c.voiceVideoCc1 || '' })}>📝</button>)}
              </div>
            </td>
            <td className="legacy-td col-actions legacy-row-actions">
              {canEdit && (<button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: c.id })}><TrashIcon /></button>)}
            </td>
          </tr>
          {lang2 && (
            <tr key={`alt-${c.id}`} style={rowStyle}>
              <td className="legacy-td legacy-muted"></td>
              <td className="legacy-td col-id legacy-muted"></td>
              <td className="legacy-td col-order legacy-muted"></td>
              <td className="legacy-td">{lang2}</td>
              <td className="legacy-td legacy-muted"></td>
              <td className="legacy-td legacy-muted"></td>
              <td className="legacy-td col-expand">
                <span>{c.voiceBubbleTextAlt || ''}</span>
                {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit bubble (${lang2})`} onClick={() => setModal({ id: c.id, field: 'voiceBubbleText', label: `Voice Bubble Text (${lang2})`, value: c.voiceBubbleTextAlt || '' })}><EditIcon /></button>)}
              </td>
              <td className="legacy-td"></td>
              <td className="legacy-td">
                <FileLink url={c.voiceVideoCc2} />
                <div style={{ display: 'flex', gap: 6 }}>
                  {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit CC URL (${lang2})`} onClick={() => setModal({ id: c.id, field: 'voiceVideoCc2', label: `Voice Video CC ${lang2}`, value: c.voiceVideoCc2 || '' })}><EditIcon /></button>)}
                  {canEdit && c.voiceVideoCc2 && (<button className="legacy-icon-btn" title={`Edit CC Text (${lang2})`} onClick={() => setModal({ id: c.id, field: 'voiceVideoCc2', label: `Edit Voice CC (${lang2})`, value: c.voiceVideoCc2 || '' })}>📝</button>)}
                </div>
              </td>
              <td className="legacy-td col-actions"></td>
            </tr>
          )}
        </>
      );
    });
  }, [items, lang1, lang2]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Voice Clips</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button className="legacy-icon-btn add-btn" onClick={() => { setAddForm({ sceneId: "", voiceId: "", voiceBubbleText: "", voiceVideo: "", voiceVideoCc1: "", voiceVideoCc2: "" }); setAddOpen(true); }}>
            <AddIcon /> Add Voice Clip
          </button>
        </div>
      )}
      {items.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '70px' }}>Scene</th>
                <th className="legacy-th" style={{ width: '60px' }}>ID</th>
                <th className="legacy-th" style={{ width: '70px' }}>Order</th>
                <th className="legacy-th" style={{ width: '100px' }}>Lang</th>
                <th className="legacy-th" style={{ width: '15%' }}>Voice Name</th>
                <th className="legacy-th" style={{ width: '15%' }}>Voice Title</th>
                <th className="legacy-th" style={{ width: '20%' }}>Voice Bubble Text</th>
                <th className="legacy-th" style={{ width: '15%' }}>Video Link</th>
                <th className="legacy-th" style={{ width: '15%' }}>Video CC</th>
                <th className="legacy-th" style={{ width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clipRows}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No voice clips found.</p>
      )}
      <ConfirmDialog
        open={confirm.open}
        title="Delete Voice Clip"
        message="Are you sure you want to delete this voice clip? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => { const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return; try { await ensureSignedIn(); await api.delete(`/voice-clips/${idToDelete}`); load(); } catch (e: any) { const status = e?.response?.status; if (status === 403) setError('You do not have permission to delete voice clips.'); } }}
      />
      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Voice Clip</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
              <label>Scene</label>
              <select value={addForm.sceneId} onChange={(e) => setAddForm({ ...addForm, sceneId: e.target.value })}>
                <option value="">Select a scene…</option>
                {scenes.map((s) => <option key={s.id} value={String(s.id)}>{s.sequence} {s.title ? `- ${s.title}` : ''}</option>)}
              </select>
              <label>Voice</label>
              <select value={addForm.voiceId} onChange={(e) => setAddForm({ ...addForm, voiceId: e.target.value })}>
                <option value="">Select a voice…</option>
                {voices.map((v) => <option key={v.id} value={String(v.id)}>{v.order ?? ''} {v.name || ''}</option>)}
              </select>
              <label>Bubble Text</label>
              <input value={addForm.voiceBubbleText} onChange={(e) => setAddForm({ ...addForm, voiceBubbleText: e.target.value })} />
              {lang2 && (<>
                <label>{`Bubble Text (${lang2})`}</label>
                <input value={(addForm as any).voiceBubbleTextAlt || ''} onChange={(e) => setAddForm({ ...(addForm as any), voiceBubbleTextAlt: e.target.value } as any)} />
              </>)}
              <label>Video URL</label>
              <input value={addForm.voiceVideo} onChange={(e) => setAddForm({ ...addForm, voiceVideo: e.target.value })} />
              <label>Video CC 1</label>
              <input value={addForm.voiceVideoCc1} onChange={(e) => setAddForm({ ...addForm, voiceVideoCc1: e.target.value })} />
              <label>Video CC 2</label>
              <input value={addForm.voiceVideoCc2} onChange={(e) => setAddForm({ ...addForm, voiceVideoCc2: e.target.value })} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!id || !addForm.sceneId} onClick={async () => {
                if (!id) return;
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/voice-clips`, {
                    sceneId: Number(addForm.sceneId),
                    voiceId: addForm.voiceId ? Number(addForm.voiceId) : null,
                    voiceBubbleText: addForm.voiceBubbleText || null,
                    voiceBubbleTextAlt: (addForm as any).voiceBubbleTextAlt || null,
                    voiceVideo: addForm.voiceVideo || null,
                    voiceVideoCc1: addForm.voiceVideoCc1 || null,
                    voiceVideoCc2: addForm.voiceVideoCc2 || null,
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
        modal.label?.startsWith('Edit Voice CC') ? (
          <CcEditor open={true} url={modal.value} label={modal.label} onClose={() => setModal(null)} />
        ) : (
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
                    const isAlt = modal.label.startsWith('Voice Bubble Text (');
                    const key = modal.field === 'voiceBubbleText' && isAlt ? 'voiceBubbleTextAlt' : modal.field;
                    await api.put(`/voice-clips/${modal.id}`, { [key]: modal.value?.trim() === '' ? null : modal.value });
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
