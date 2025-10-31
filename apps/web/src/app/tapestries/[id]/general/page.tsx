"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageMeta, getLanguageNames } from "../../../../lib/api";
import { FileLink } from "../../../../components/FileLink";
import { AudioPreview } from "../../../../components/AudioPreview";
import { CcEditor } from "../../../../components/CcEditor";


type Tapestry = {
  id: number;
  isThreeJS?: boolean;
  prettyId?: string | null;
  title?: string | null;
  titleAltLang?: string | null;
  location?: string | null;
  locationAltLang?: string | null;
  tagline?: string | null;
  taglineAltLang?: string | null;
  publicationYear?: string | null;
  duration?: number | null;
  latitude?: string | null;
  longitude?: string | null;
  audioLanguage1?: string | null;
  audioLanguage2?: string | null;
  ambientAudio?: string | null;
  ambientAudioCc1?: string | null;
  ambientAudioCc1Alt?: string | null;
  ambientAudioAlt?: string | null;
  ambientAudioCc2?: string | null;
  ambientAudioCc2Alt?: string | null;
  launchDate?: string | null;
  azurePath?: string | null;
  sketchfabModelId?: string | null;
  surveymonkey?: string | null;
  published?: number | null;
};

export default function GeneralInfoPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [item, setItem] = useState<Tapestry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ field: keyof Tapestry | null; label: string; value: string; forceRtl?: boolean } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [langMap, setLangMap] = useState<Record<string,string>>({});

  const [form, setForm] = useState({
    prettyId: "",
    title: "",
    titleAltLang: "",
    location: "",
    locationAltLang: "",
    tagline: "",
    taglineAltLang: "",
    publicationYear: "",
    duration: "",
    latitude: "",
    longitude: "",
    launchDate: "",
    azurePath: "",
    sketchfabModelId: "",
    surveymonkey: "",
    audioLanguage1: "",
    audioLanguage2: "",
    ambientAudio: "",
    ambientAudioCc1: "",
    ambientAudioCc1Alt: "",
    ambientAudioAlt: "",
    ambientAudioCc2: "",
    ambientAudioCc2Alt: "",
    published: false,
  });

  function validateYear(y: string): string | null {
    if (!y) return null;
    if (!/^\d{4}$/.test(y)) return "Year must be 4 digits";
    return null;
  }
  function validateInt(n: string): string | null {
    if (!n) return null;
    if (!/^\d+$/.test(n)) return "Must be a non-negative integer";
    return null;
  }
  function validateDecimal(s: string): string | null {
    if (!s) return null;
    if (!/^[-+]?\d+(\.\d+)?$/.test(s)) return "Invalid number";
    return null;
  }

  function syncFormFromItem(next: Tapestry) {
    setForm({
      prettyId: next.prettyId || "",
      title: next.title || "",
      titleAltLang: next.titleAltLang || "",
      location: next.location || "",
      locationAltLang: next.locationAltLang || "",
      tagline: next.tagline || "",
      taglineAltLang: next.taglineAltLang || "",
      publicationYear: next.publicationYear || "",
      duration: next.duration != null ? String(next.duration) : "",
      latitude: next.latitude != null ? String(next.latitude) : "",
      longitude: next.longitude != null ? String(next.longitude) : "",
      launchDate: next.launchDate || "",
      azurePath: next.azurePath || "",
      sketchfabModelId: next.sketchfabModelId || "",
      surveymonkey: next.surveymonkey || "",
      audioLanguage1: next.audioLanguage1 || "",
      audioLanguage2: next.audioLanguage2 || "",
      ambientAudio: next.ambientAudio || "",
      ambientAudioCc1: next.ambientAudioCc1 || "",
      ambientAudioCc1Alt: next.ambientAudioCc1Alt || "",
      ambientAudioAlt: next.ambientAudioAlt || "",
      ambientAudioCc2: next.ambientAudioCc2 || "",
      ambientAudioCc2Alt: next.ambientAudioCc2Alt || "",
      published: !!next.published,
    });
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
      const data = res.data as Tapestry;
      setItem(data);
      syncFormFromItem(data);
      // Preload language names for dropdowns
      try { const m = await getLanguageNames(); setLangMap(m); } catch {}
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to load (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    } finally {
      setLoading(false);
    }
  }

  async function savePayload(payload: Partial<Tapestry>) {
    if (!item) return;
    setError(null);
    try {
      const res = await api.put(`/tapestries/${item.id}`, payload);
      const updated = res.data as Tapestry;
      setItem(updated);
      syncFormFromItem(updated);
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unknown error";
      setError(`Failed to save (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    }
  }

  function buildPayloadFromForm(): Partial<Tapestry> {
    return {
      prettyId: blankToNull(form.prettyId),
      title: blankToNull(form.title),
      titleAltLang: blankToNull(form.titleAltLang),
      location: blankToNull(form.location),
      locationAltLang: blankToNull(form.locationAltLang),
      tagline: blankToNull(form.tagline),
      taglineAltLang: blankToNull(form.taglineAltLang),
      publicationYear: blankToNull(form.publicationYear),
      duration: form.duration ? Number(form.duration) : null,
      // moved to Splash Page
      launchDate: blankToNull(form.launchDate),
      azurePath: blankToNull(form.azurePath),
      sketchfabModelId: blankToNull(form.sketchfabModelId),
      surveymonkey: blankToNull(form.surveymonkey),
      audioLanguage1: blankToNull(form.audioLanguage1),
      audioLanguage2: blankToNull(form.audioLanguage2),
      ambientAudio: blankToNull(form.ambientAudio),
      ambientAudioCc1: blankToNull(form.ambientAudioCc1),
      ambientAudioCc1Alt: blankToNull(form.ambientAudioCc1Alt),
      ambientAudioAlt: blankToNull(form.ambientAudioAlt),
      ambientAudioCc2: blankToNull(form.ambientAudioCc2),
      ambientAudioCc2Alt: blankToNull(form.ambientAudioCc2Alt),
      published: form.published ? 1 : 0,
    } as any;
  }

  const secondaryLanguageFields = new Set<keyof Tapestry>([
    "titleAltLang",
    "locationAltLang",
    "taglineAltLang",
    "ambientAudioAlt",
    "ambientAudioCc1Alt",
    "ambientAudioCc2Alt",
  ]);

  function openFieldEditor(field: keyof Tapestry, label: string, current?: string | null) {
    setModalError(null);
    const forceRtl = secondaryLanguageFields.has(field) && lang2IsRtl;
    setModal({ field, label, value: current || "", forceRtl });
  }
  async function saveField() {
    if (!modal?.field) return;
    const k = modal.field;
    // validate certain fields
    if (k === 'publicationYear') {
      const err = validateYear(modal.value);
      if (err) { setModalError(err); return; }
    }
    if (k === 'launchDate') {
      // yyyy-mm-dd basic check
      if (modal.value && !/^\d{4}-\d{2}-\d{2}$/.test(modal.value)) { setModalError('Use YYYY-MM-DD'); return; }
    }
    if (k === 'duration') {
      const err = validateInt(modal.value);
      if (err) { setModalError(err); return; }
    }
    if (k === 'latitude') {
      const err = validateDecimal(modal.value);
      if (err) { setModalError(err); return; }
    }
    if (k === 'longitude') {
      const err = validateDecimal(modal.value);
      if (err) { setModalError(err); return; }
    }
    const payload: any = { [k]: modal.value?.trim() === "" ? null : (k === 'duration' ? Number(modal.value) : modal.value) };
    await savePayload(payload);
    setModal(null);
  }

  function blankToNull(s: string): string | null {
    return s.trim() === "" ? null : s;
  }

  useEffect(() => { load(); }, [id]);

  const hasSecondLang = !!(form.audioLanguage2 && form.audioLanguage2.trim() !== "");
  const [lang2, setLang2] = useState<string>("Alt");
  const [lang2IsRtl, setLang2IsRtl] = useState<boolean>(false);
  useEffect(() => {
    (async () => {
      const meta = await resolveLanguageMeta(form.audioLanguage2);
      setLang2(meta?.label || "Alt");
      setLang2IsRtl(!!meta?.rtl);
    })();
  }, [form.audioLanguage2]);
  const canEdit = (me?.roles || []).some((r: string) => r === 'Admin' || r === 'Editor');
  const viewerUrl = form.prettyId ? `https://tapestry.cyark.org/content/${form.prettyId}` : null;

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>General Info</h2>
        <button
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, paddingInline: 16, whiteSpace: 'nowrap' }}
          disabled={!viewerUrl}
          onClick={() => {
            if (viewerUrl) window.open(viewerUrl, '_blank', 'noopener,noreferrer');
          }}
        >
          <span style={{ fontSize: 16 }}>↗</span>
          <span>Open in Tapestry</span>
        </button>
      </div>
      {loading && <p className="loading">Loading…</p>}
      {error && <div className="error">{error}</div>}
      {item && (
        <>
          {/* Meta Info Section */}
          <div className="section-card">
            <div className="detail-grid">
              <label>Pretty ID</label>
              <div>{form.prettyId || <span className="legacy-badge legacy-badge-warn">Missing Info</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('prettyId','Pretty ID', form.prettyId)} title="Edit">✎</button>)}
              </div>

              <label>Published</label>
              <div className="legacy-muted">{form.published ? 'Yes' : 'No'}</div>
              <span />

              <label>Publication Year</label>
              <div>{form.publicationYear || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('publicationYear','Publication Year', form.publicationYear)} title="Edit">✎</button>)}
              </div>

              <label>Duration (min)</label>
              <div>{form.duration || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('duration','Duration (min)', form.duration)} title="Edit">✎</button>)}
              </div>

              <label>Launch Date</label>
              <div>{form.launchDate || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('launchDate','Launch Date', form.launchDate)} title="Edit">✎</button>)}
              </div>

              <label>Azure Path</label>
              <div>{form.azurePath || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('azurePath','Azure Path', form.azurePath)} title="Edit">✎</button>)}
              </div>

              {!item?.isThreeJS && (
                <>
                  <label>Sketchfab Model ID</label>
                  <div>{form.sketchfabModelId || <span className="legacy-muted">—</span>}</div>
                  <div className="action-group">
                    {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('sketchfabModelId','Sketchfab Model ID', form.sketchfabModelId)} title="Edit">✎</button>)}
                  </div>
                </>
              )}

              <label>SurveyMonkey</label>
              <div>{form.surveymonkey || <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('surveymonkey','SurveyMonkey', form.surveymonkey)} title="Edit">✎</button>)}
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>CONTENT</div>
            <div className="detail-grid">
              <label>Title</label>
              <div>{form.title ? form.title : <span className="legacy-badge legacy-badge-warn">Missing Info</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('title','Title', form.title)} title="Edit">✎</button>)}
              </div>
              {hasSecondLang && (
                <>
                  <label>{`Title (${lang2})`}</label>
                  <div>{form.titleAltLang || <span className="legacy-muted">—</span>}</div>
                  <div className="action-group">
                    {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('titleAltLang',`Title (${lang2})`, form.titleAltLang)} title="Edit">✎</button>)}
                  </div>
                </>
              )}

              <label>Location</label>
              <div>{form.location ? form.location : <span className="legacy-badge legacy-badge-warn">Missing Info</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('location','Location', form.location)} title="Edit">✎</button>)}
              </div>
              {hasSecondLang && (
                <>
                  <label>{`Location (${lang2})`}</label>
                  <div>{form.locationAltLang || <span className="legacy-muted">—</span>}</div>
                  <div className="action-group">
                    {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('locationAltLang',`Location (${lang2})`, form.locationAltLang)} title="Edit">✎</button>)}
                  </div>
                </>
              )}

              <label>Tagline</label>
              <div>{form.tagline ? form.tagline : <span className="legacy-badge legacy-badge-warn">Missing Info</span>}</div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('tagline','Tagline', form.tagline)} title="Edit">✎</button>)}
              </div>
              {hasSecondLang && (
                <>
                  <label>{`Tagline (${lang2})`}</label>
                  <div>{form.taglineAltLang || <span className="legacy-muted">—</span>}</div>
                  <div className="action-group">
                    {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('taglineAltLang',`Tagline (${lang2})`, form.taglineAltLang)} title="Edit">✎</button>)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Language Section */}
          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>LANGUAGES</div>
            <div className="language-group">
              <label>Primary Language</label>
              <div>
                {canEdit ? (
                  <select value={form.audioLanguage1 || ''} onChange={async (e) => {
                    const code = e.target.value || '';
                    try { await api.put(`/tapestries/${item!.id}`, { audioLanguage1: code ? code : null }); setForm({ ...form, audioLanguage1: code }); } catch {}
                  }}>
                    <option value="">Select language…</option>
                    {Object.entries(langMap).sort((a,b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <span>{langMap[form.audioLanguage1] || form.audioLanguage1 || <span className="legacy-muted">—</span>}</span>
                )}
              </div>
              <span />

              <label>Secondary Language</label>
              <div>
                {canEdit ? (
                  <select value={form.audioLanguage2 || ''} onChange={async (e) => {
                    const code = e.target.value || '';
                    try { await api.put(`/tapestries/${item!.id}`, { audioLanguage2: code ? code : null }); setForm({ ...form, audioLanguage2: code }); } catch {}
                  }}>
                    <option value="">None</option>
                    {Object.entries(langMap).sort((a,b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <span>{langMap[form.audioLanguage2] || form.audioLanguage2 || <span className="legacy-muted">—</span>}</span>
                )}
              </div>
              <span />
            </div>
          </div>

          {/* Audio Section */}
          <div className="section-card">
            <div className="legacy-section-header" style={{ marginTop: 0 }}>AMBIENT AUDIO</div>
            <div className="detail-grid">
              <label>Ambient Audio</label>
              <div>
                {form.ambientAudio ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FileLink url={form.ambientAudio} />
                    <AudioPreview url={form.ambientAudio} />
                  </div>
                ) : (
                  <span className="legacy-badge legacy-badge-warn">Missing Info</span>
                )}
              </div>
              <div className="action-group">
                {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('ambientAudio','Ambient Audio URL', form.ambientAudio)} title="Edit">✎</button>)}
              </div>
              {hasSecondLang && (
                <>
                  <label>{`Ambient Audio (${lang2})`}</label>
                  <div>
                    {form.ambientAudioAlt ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileLink url={form.ambientAudioAlt} />
                        <AudioPreview url={form.ambientAudioAlt} />
                      </div>
                    ) : (
                      <span className="legacy-muted">—</span>
                    )}
                  </div>
                  <div className="action-group">
                    {canEdit && (<button className="legacy-icon-btn" onClick={() => openFieldEditor('ambientAudioAlt',`Ambient Audio (${lang2})`, form.ambientAudioAlt)} title="Edit">✎</button>)}
                  </div>
                </>
              )}

              <label>Ambient Audio CC 1</label>
              <div>{form.ambientAudioCc1 ? <FileLink url={form.ambientAudioCc1} /> : <span className="legacy-badge legacy-badge-warn">Missing Info</span>}</div>
              <div className="action-group">
                {canEdit && (
                  <span className="legacy-icon-group">
                    <button className="legacy-icon-btn" onClick={() => openFieldEditor('ambientAudioCc1','Ambient Audio CC 1 URL', form.ambientAudioCc1)} title="Edit">✎</button>
                    {form.ambientAudioCc1 && (<button className="legacy-icon-btn" title="Edit CC text" onClick={() => setModal({ field: 'ambientAudioCc1', label: 'Edit Ambient Audio CC 1', value: form.ambientAudioCc1 })}>📝</button>)}
                  </span>
                )}
              </div>
              {hasSecondLang && (
                <>
                  <label>{`Ambient Audio CC 1 (${lang2})`}</label>
                  <div>{form.ambientAudioCc1Alt ? <FileLink url={form.ambientAudioCc1Alt} /> : <span className="legacy-muted">—</span>}</div>
                  <div className="action-group">
                    {canEdit && (
                      <span className="legacy-icon-group">
                        <button className="legacy-icon-btn" onClick={() => openFieldEditor('ambientAudioCc1Alt',`Ambient Audio CC 1 (${lang2})`, form.ambientAudioCc1Alt)} title="Edit">✎</button>
                        {form.ambientAudioCc1Alt && (
                          <button
                            className="legacy-icon-btn"
                            title="Edit CC text"
                            onClick={() => setModal({ field: 'ambientAudioCc1Alt', label: `Edit Ambient Audio CC 1 (${lang2})`, value: form.ambientAudioCc1Alt!, forceRtl: lang2IsRtl })}
                          >
                            📝
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}

              <label>Ambient Audio CC 2</label>
              <div>{form.ambientAudioCc2 ? <FileLink url={form.ambientAudioCc2} /> : <span className="legacy-muted">—</span>}</div>
              <div className="action-group">
                {canEdit && (
                  <span className="legacy-icon-group">
                    <button className="legacy-icon-btn" onClick={() => openFieldEditor('ambientAudioCc2','Ambient Audio CC 2 URL', form.ambientAudioCc2)} title="Edit">✎</button>
                    {form.ambientAudioCc2 && (<button className="legacy-icon-btn" title="Edit CC text" onClick={() => setModal({ field: 'ambientAudioCc2', label: 'Edit Ambient Audio CC 2', value: form.ambientAudioCc2 })}>📝</button>)}
                  </span>
                )}
              </div>
              {hasSecondLang && (
                <>
                  <label>{`Ambient Audio CC 2 (${lang2})`}</label>
                  <div>{form.ambientAudioCc2Alt ? <FileLink url={form.ambientAudioCc2Alt} /> : <span className="legacy-muted">—</span>}</div>
                  <div className="action-group">
                    {canEdit && (
                      <span className="legacy-icon-group">
                        <button className="legacy-icon-btn" onClick={() => openFieldEditor('ambientAudioCc2Alt',`Ambient Audio CC 2 (${lang2})`, form.ambientAudioCc2Alt)} title="Edit">✎</button>
                        {form.ambientAudioCc2Alt && (
                          <button
                            className="legacy-icon-btn"
                            title="Edit CC text"
                            onClick={() => setModal({ field: 'ambientAudioCc2Alt', label: `Edit Ambient Audio CC 2 (${lang2})`, value: form.ambientAudioCc2Alt!, forceRtl: lang2IsRtl })}
                          >
                            📝
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
      {modal && (
        modal.label?.startsWith('Edit Ambient Audio CC') ? (
          <CcEditor
            open={true}
            url={modal.value}
            label={modal.label}
            direction={modal.forceRtl ? 'rtl' : undefined}
            onClose={() => setModal(null)}
          />
        ) : (
          <div className="modal-backdrop" onClick={() => setModal(null)}>
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
              {modal.field === 'launchDate' ? (
                <input
                  type="date"
                  dir={modal.forceRtl ? 'rtl' : undefined}
                  style={{ width: '100%', ...(modal.forceRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={modal.value}
                  onChange={(e) => { setModal({ ...modal, value: e.target.value }); setModalError(null); }}
                />
              ) : (
                <input
                  dir={modal.forceRtl ? 'rtl' : undefined}
                  style={{ width: '100%', ...(modal.forceRtl ? { direction: 'rtl', textAlign: 'right' } : {}) }}
                  value={modal.value}
                  onChange={(e) => { setModal({ ...modal, value: e.target.value }); setModalError(null); }}
                />
              )}
              {modalError && <div style={{ color: 'crimson', marginTop: 8 }}>{modalError}</div>}
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

