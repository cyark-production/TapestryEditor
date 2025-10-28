"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageName } from "../../../../lib/api";
import { FileLink } from "../../../../components/FileLink";
import { CcEditor } from "../../../../components/CcEditor";

type Overview = {
  overview_id: number;
  title?: string | null;
  title_alt_lang?: string | null;
  description?: string | null;
  description_alt_lang?: string | null;
  audio_narration_1?: string | null;
  audio_narration_2?: string | null;
  narration_cc_1?: string | null;
  narration_cc_2?: string | null;
  show_map?: number | null;
  camera_position?: string | null;
  camera_target?: string | null;
  zoom_camera_position?: string | null;
  zoom_camera_target?: string | null;
  camera_fov?: number | null;
  voice_pulse_wait_1?: number | null;
  voice_pulse_wait_2?: number | null;
  voice_pulse_wait_3?: number | null;
};


export default function OverviewPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ field: keyof Overview; label: string; value: string } | null>(null);
  const [lang2, setLang2] = useState<string | null>(null);
  const [me, setMe] = useState<any | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, o, t] = await Promise.all([
        api.get('/auth/me'),
        api.get(`/tapestries/${id}/overview`),
        api.get(`/tapestries/${id}`)
      ]);
      setMe(meRes.data || null);
      setData(o.data as Overview);
      const a2 = (t.data?.audioLanguage2 as string | undefined) || "";
      const l2 = await resolveLanguageName(a2);
      setLang2(l2 && l2.trim() !== '' ? l2 : null);
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

  async function saveField() {
    if (!data || !modal) return;
    try {
      await ensureSignedIn();
      await api.put(`/tapestries/${id}/overview`, { [modal.field]: modal.value?.trim() === '' ? null : modal.value });
      setModal(null);
      load();
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to save (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h2>Overview</h2>
      {loading && <p className="loading">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {data && (
        <>
          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>TEXT</div>
            <div className="detail-grid">
              <label>Title</label>
              <div>{data.title || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'title', label: 'Title', value: data.title || '' })}>✎</button>)}
              </div>
              {lang2 && (<>
                <label>{`Title (${lang2})`}</label>
                <div>{data.title_alt_lang || <span className="legacy-muted">—</span>}</div>
                <div className="action-group">
                  {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'title_alt_lang', label: `Title (${lang2})`, value: data.title_alt_lang || '' })}>✎</button>)}
                </div>
              </>)}

              <label>Description</label>
              <div>{data.description || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'description', label: 'Description', value: data.description || '' })}>✎</button>)}
              </div>
              {lang2 && (<>
                <label>{`Description (${lang2})`}</label>
                <div>{data.description_alt_lang || <span className="legacy-muted">—</span>}</div>
                <div className="action-group">
                  {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'description_alt_lang', label: `Description (${lang2})`, value: data.description_alt_lang || '' })}>✎</button>)}
                </div>
              </>)}
            </div>
          </div>

          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>NARRATION</div>
            <div className="detail-grid">
              <label>Audio Narration 1</label>
              <div><FileLink url={data.audio_narration_1} /></div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'audio_narration_1', label: 'Audio Narration 1 URL', value: data.audio_narration_1 || '' })}>✎</button>)}
              </div>
              {lang2 && (<>
                <label>{`Audio Narration 2 (${lang2})`}</label>
                <div><FileLink url={data.audio_narration_2} /></div>
                <div className="action-group">
                  {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'audio_narration_2', label: `Audio Narration 2 (${lang2}) URL`, value: data.audio_narration_2 || '' })}>✎</button>)}
                </div>
              </>)}

              <label>Narration CC 1</label>
              <div><FileLink url={data.narration_cc_1} /></div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'narration_cc_1', label: 'Narration CC 1 URL', value: data.narration_cc_1 || '' })}>✎</button>)}
                {canEdit && data.narration_cc_1 && (<button className="legacy-icon-btn" title="Edit CC text" onClick={() => setModal({ field: 'narration_cc_1', label: 'Edit Narration CC 1', value: data.narration_cc_1 || '' })}>📝</button>)}
              </div>
              {lang2 && (<>
                <label>{`Narration CC 2 (${lang2})`}</label>
                <div><FileLink url={data.narration_cc_2} /></div>
                <div className="action-group">
                  {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'narration_cc_2', label: `Narration CC 2 (${lang2}) URL`, value: data.narration_cc_2 || '' })}>✎</button>)}
                  {canEdit && data.narration_cc_2 && (<button className="legacy-icon-btn" title="Edit CC text" onClick={() => setModal({ field: 'narration_cc_2', label: `Edit Narration CC 2 (${lang2})`, value: data.narration_cc_2 || '' })}>📝</button>)}
                </div>
              </>)}
            </div>
          </div>

          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>MAP & CAMERA</div>
            <div className="detail-grid">
              <label>Show Map</label>
              <div className="legacy-muted">[{data.show_map ?? 0}] - {data.show_map ? 'yes' : 'no'}</div>
              <div className="action-group">
                {canEdit && (<button className="btn" onClick={async () => { try { await api.put(`/tapestries/${id}/overview`, { show_map: data.show_map ? 0 : 1 }); load(); } catch (e: any) {} }}>{data.show_map ? 'Turn Off' : 'Turn On'}</button>)}
              </div>

              <label>Camera Position</label>
              <div>{data.camera_position ? 'Populated' : 'Null'}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'camera_position', label: 'Camera Position', value: data.camera_position || '' })}>✎</button>)}
              </div>

              <label>Camera Target</label>
              <div>{data.camera_target ? 'Populated' : 'Null'}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'camera_target', label: 'Camera Target', value: data.camera_target || '' })}>✎</button>)}
              </div>

              <label>Zoom Camera Position</label>
              <div>{data.zoom_camera_position ? 'Populated' : 'Null'}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'zoom_camera_position', label: 'Zoom Camera Position', value: data.zoom_camera_position || '' })}>✎</button>)}
              </div>

              <label>Zoom Camera Target</label>
              <div>{data.zoom_camera_target ? 'Populated' : 'Null'}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'zoom_camera_target', label: 'Zoom Camera Target', value: data.zoom_camera_target || '' })}>✎</button>)}
              </div>

              <label>Camera FOV</label>
              <div>{data.camera_fov ?? ''}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'camera_fov', label: 'Camera FOV', value: data.camera_fov != null ? String(data.camera_fov) : '' })}>✎</button>)}
              </div>
            </div>
          </div>

          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>PULSE TIMING</div>
            <div className="detail-grid">
              <label>Voice Pulse Wait 1</label>
              <div>{data.voice_pulse_wait_1 ?? ''}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'voice_pulse_wait_1', label: 'Voice Pulse Wait 1', value: data.voice_pulse_wait_1 != null ? String(data.voice_pulse_wait_1) : '' })}>✎</button>)}
              </div>

              <label>Voice Pulse Wait 2</label>
              <div>{data.voice_pulse_wait_2 ?? ''}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'voice_pulse_wait_2', label: 'Voice Pulse Wait 2', value: data.voice_pulse_wait_2 != null ? String(data.voice_pulse_wait_2) : '' })}>✎</button>)}
              </div>

              <label>Voice Pulse Wait 3</label>
              <div>{data.voice_pulse_wait_3 ?? ''}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => setModal({ field: 'voice_pulse_wait_3', label: 'Voice Pulse Wait 3', value: data.voice_pulse_wait_3 != null ? String(data.voice_pulse_wait_3) : '' })}>✎</button>)}
              </div>
            </div>
          </div>
        </>
      )}

      {modal && (
        modal.label?.startsWith('Edit Narration CC') ? (
          <CcEditor open={true} url={modal.value} label={modal.label} onClose={() => setModal(null)} />
        ) : (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
              <input style={{ width: '100%' }} value={modal.value} onChange={(e) => setModal({ ...modal, value: e.target.value })} />
              <div className="modal-actions">
                <button className="btn" onClick={() => setModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveField}>Save</button>
              </div>
            </div>
          </div>
        )
      )}
    </main>
  );
}

