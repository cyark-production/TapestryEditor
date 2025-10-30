"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn } from "../../../../lib/api";
import { EditIcon, TrashIcon, AddIcon } from "../../../../components/icons";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";

type Marker = {
  id: number;
  sceneId?: number | null;
  sceneSequence?: string | null;
  overviewId?: number | null;
  markerLabel?: string | null;
  lat?: number | null;
  lon?: number | null;
  markerColor?: string | null;
  fontColor?: string | null;
  fontSize?: string | null;
  startTime?: number | null;
  endTime?: number | null;
  interactiveId?: number | null;
  interactiveHighlightId?: number | null;
};

type MarkerModalState = {
  id?: number;
  field: keyof Marker;
  label: string;
  value?: string;
  fields?: Record<string, string>;
};

export default function MarkersPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<Marker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isThreeJS, setIsThreeJS] = useState<boolean>(false);
  const [me, setMe] = useState<any | null>(null);
  const [modal, setModal] = useState<MarkerModalState | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<any>({ sceneId: "", overviewId: "", markerLabel: "", lat: "", lon: "", markerColor: "", fontColor: "", fontSize: "", startTime: "", endTime: "", interactiveId: "", interactiveHighlightId: "" });
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });
  const [scenes, setScenes] = useState<any[]>([]);
  const [interactives, setInteractives] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [linkedOverviewId, setLinkedOverviewId] = useState<number | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true); setError(null);
    try {
      await ensureSignedIn();
      const [meRes, t] = await Promise.all([api.get('/auth/me'), api.get(`/tapestries/${id}`)]);
      setMe(meRes.data || null);
      const three = !!t.data?.isThreeJS;
      setIsThreeJS(three);
      setScenes(Array.isArray(t.data?.scenes) ? t.data.scenes : []);
      setLinkedOverviewId(typeof t.data?.overviewId === 'number' ? Number(t.data.overviewId) : null);
      if (!three) {
        setItems([]);
        setInteractives([]);
        setHighlights([]);
      } else {
        const [markersRes, interactivesRes, highlightsRes] = await Promise.all([
          api.get(`/tapestries/${id}/markers`),
          api.get(`/tapestries/${id}/interactives`),
          api.get(`/tapestries/${id}/interactive-highlights`)
        ]);
        setItems(Array.isArray(markersRes.data) ? markersRes.data : []);
        setInteractives(Array.isArray(interactivesRes.data) ? interactivesRes.data : []);
        setHighlights(Array.isArray(highlightsRes.data) ? highlightsRes.data : []);
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

  const updateModalField = (key: string, nextValue: string) => {
    setModal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: { ...(prev.fields || {}), [key]: nextValue },
      };
    });
  };

  const grouped = useMemo(() => {
    const byScene = new Map<string, Marker[]>();
    for (const m of items) {
      const key = m.sceneSequence ? `Scene ${m.sceneSequence}` : (m.overviewId ? `Overview ${m.overviewId}` : 'Unassigned');
      if (!byScene.has(key)) byScene.set(key, []);
      byScene.get(key)!.push(m);
    }
    return Array.from(byScene.entries());
  }, [items]);

  const interactiveLookup = useMemo(() => {
    const map = new Map<number, any>();
    for (const i of interactives) {
      if (i?.id != null) map.set(i.id, i);
    }
    return map;
  }, [interactives]);

  const highlightLookup = useMemo(() => {
    const map = new Map<number, any>();
    for (const h of highlights) {
      if (h?.id != null) map.set(h.id, h);
    }
    return map;
  }, [highlights]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Markers</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {!isThreeJS && !loading && (
        <div className="card" style={{ padding: 16 }}>
          <div className="legacy-badge legacy-badge-warn">This tapestry uses Sketchfab</div>
          <p style={{ marginTop: 8 }}>Markers are available only for ThreeJS tapestries.</p>
        </div>
      )}
      {isThreeJS && (
        <div style={{ marginTop: 16 }}>
          {canEdit && (
            <div style={{ marginBottom: 12 }}>
              <button className="legacy-icon-btn add-btn" onClick={() => { setForm({ sceneId: "", overviewId: "", markerLabel: "", lat: "", lon: "", markerColor: "", fontColor: "", fontSize: "", startTime: "", endTime: "", interactiveId: "", interactiveHighlightId: "" }); setAddOpen(true); }}><AddIcon /> Add Marker</button>
            </div>
          )}
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: '160px' }}>Group</th>
                <th className="legacy-th" style={{ width: '70px' }}>ID</th>
                <th className="legacy-th" style={{ width: '20%' }}>Label</th>
                <th className="legacy-th" style={{ width: '15%' }}>Lat / Lon</th>
                <th className="legacy-th" style={{ width: '15%' }}>Colors</th>
                <th className="legacy-th" style={{ width: '12%' }}>Font Size</th>
                <th className="legacy-th" style={{ width: '12%' }}>Start / End</th>
                <th className="legacy-th" style={{ width: '12%' }}>Interactive</th>
                {canEdit && (<th className="legacy-th" style={{ width: '80px' }}>Actions</th>)}
              </tr>
            </thead>
            <tbody>
              {grouped.map(([group, list]) => (
                <>
                  {list.map((m, idx) => (
                    <tr key={m.id}>
                      <td className="legacy-td">{idx === 0 ? group : ''}</td>
                      <td className="legacy-td">{m.id}</td>
                      <td className="legacy-td">
                        <span>{m.markerLabel || '—'}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit label" onClick={() => setModal({ id: m.id, field: 'markerLabel', label: 'Label', value: m.markerLabel || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{m.lat ?? '—'}, {m.lon ?? '—'}</span>
                        {canEdit && (
                          <button
                            className="legacy-icon-btn edit-btn"
                            title="Edit lat/lon"
                            onClick={() => setModal({
                              id: m.id,
                              field: 'lat',
                              label: 'Edit Latitude & Longitude',
                              fields: {
                                lat: m.lat != null ? String(m.lat) : '',
                                lon: m.lon != null ? String(m.lon) : '',
                              },
                            })}
                          >
                            <EditIcon />
                          </button>
                        )}
                      </td>
                      <td className="legacy-td">
                        <span>{m.markerColor || '—'} / {m.fontColor || '—'}</span>
                        {canEdit && (
                          <button
                            className="legacy-icon-btn edit-btn"
                            title="Edit colors"
                            onClick={() => setModal({
                              id: m.id,
                              field: 'markerColor',
                              label: 'Edit Marker & Font Colors',
                              fields: {
                                markerColor: m.markerColor || '',
                                fontColor: m.fontColor || '',
                              },
                            })}
                          >
                            <EditIcon />
                          </button>
                        )}
                      </td>
                      <td className="legacy-td">
                        <span>{m.fontSize || '—'}</span>
                        {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit font size" onClick={() => setModal({ id: m.id, field: 'fontSize', label: 'Font Size', value: m.fontSize || '' })}><EditIcon /></button>)}
                      </td>
                      <td className="legacy-td">
                        <span>{m.startTime ?? '—'} / {m.endTime ?? '—'}</span>
                        {canEdit && (
                          <button
                            className="legacy-icon-btn edit-btn"
                            title="Edit times"
                            onClick={() => setModal({
                              id: m.id,
                              field: 'startTime',
                              label: 'Edit Start & End Times',
                              fields: {
                                startTime: m.startTime != null ? String(m.startTime) : '',
                                endTime: m.endTime != null ? String(m.endTime) : '',
                              },
                            })}
                          >
                            <EditIcon />
                          </button>
                        )}
                      </td>
                      <td className="legacy-td">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {(() => {
                            if (m.interactiveId == null) {
                              return <span>Interactive: <span className="legacy-muted">—</span></span>;
                            }
                            const info = interactiveLookup.get(m.interactiveId);
                            const parts = [`Interactive #${m.interactiveId}`];
                            if (info?.sceneSequence) parts.push(`Scene ${info.sceneSequence}`);
                            const interactiveLabel = (info as any)?.title || (info as any)?.name || (info as any)?.label;
                            if (interactiveLabel) parts.push(interactiveLabel);
                            return <span>{parts.join(' – ')}</span>;
                          })()}
                          {(() => {
                            if (m.interactiveHighlightId == null) {
                              return <span className="legacy-muted" style={{ fontSize: 12 }}>Highlight: —</span>;
                            }
                            const highlight = highlightLookup.get(m.interactiveHighlightId);
                            const parts = [`Highlight #${m.interactiveHighlightId}`];
                            if (highlight?.sceneSequence) parts.push(`Scene ${highlight.sceneSequence}`);
                            if (highlight?.popupTitle) parts.push(highlight.popupTitle);
                            return <span className="legacy-muted" style={{ fontSize: 12 }}>{parts.join(' – ')}</span>;
                          })()}
                        </div>
                        {canEdit && (
                          <button
                            className="legacy-icon-btn edit-btn"
                            title="Edit interactive"
                            onClick={() => setModal({
                              id: m.id,
                              field: 'interactiveId',
                              label: 'Edit Interactive & Highlight',
                              fields: {
                                interactiveId: m.interactiveId != null ? String(m.interactiveId) : '',
                                interactiveHighlightId: m.interactiveHighlightId != null ? String(m.interactiveHighlightId) : '',
                              },
                            })}
                          >
                            <EditIcon />
                          </button>
                        )}
                      </td>
                      {canEdit && (
                        <td className="legacy-td col-actions legacy-row-actions">
                          <button className="legacy-icon-btn delete-btn" title="Delete" onClick={() => setConfirm({ open: true, id: m.id })}><TrashIcon /></button>
                        </td>
                      )}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isThreeJS && !loading && items.length === 0 && (
        <p>No markers found.</p>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Marker</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
              <label>Scene ID</label>
              <select value={form.sceneId} onChange={(e) => setForm({ ...form, sceneId: e.target.value })}>
                <option value="">None</option>
                {scenes.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.sequence || s.id}{s.title ? ` - ${s.title}` : ''}
                  </option>
                ))}
              </select>
              <label>Overview ID</label>
              <select value={form.overviewId} onChange={(e) => setForm({ ...form, overviewId: e.target.value })}>
                <option value="">None</option>
                {linkedOverviewId != null && (
                  <option value={String(linkedOverviewId)}>Overview #{linkedOverviewId}</option>
                )}
              </select>
              <label>Label</label>
              <input value={form.markerLabel} onChange={(e) => setForm({ ...form, markerLabel: e.target.value })} />
              <label>Lat</label>
              <input value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
              <label>Lon</label>
              <input value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} />
              <label>Marker Color</label>
              <input value={form.markerColor} onChange={(e) => setForm({ ...form, markerColor: e.target.value })} />
              <label>Font Color</label>
              <input value={form.fontColor} onChange={(e) => setForm({ ...form, fontColor: e.target.value })} />
              <label>Font Size</label>
              <input value={form.fontSize} onChange={(e) => setForm({ ...form, fontSize: e.target.value })} />
              <label>Start Time</label>
              <input value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
              <label>End Time</label>
              <input value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
              <label>Interactive ID</label>
              <select value={form.interactiveId} onChange={(e) => setForm({ ...form, interactiveId: e.target.value })}>
                <option value="">None</option>
                {interactives.map((i) => (
                  <option key={i.id} value={String(i.id)}>
                    Interactive #{i.id}{i.sceneSequence ? ` - Scene ${i.sceneSequence}` : ''}
                  </option>
                ))}
              </select>
              <label>Interactive Highlight ID</label>
              <select value={form.interactiveHighlightId} onChange={(e) => setForm({ ...form, interactiveHighlightId: e.target.value })}>
                <option value="">None</option>
                {highlights.map((h) => (
                  <option key={h.id} value={String(h.id)}>
                    {`Highlight #${h.id}`}
                    {h.sceneSequence ? ` – Scene ${h.sceneSequence}` : ''}
                    {h.popupTitle ? ` – ${h.popupTitle}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={!id || (!form.sceneId && !form.overviewId)} onClick={async () => {
                try {
                  await ensureSignedIn();
                  await api.post(`/tapestries/${id}/markers`, {
                    sceneId: form.sceneId ? Number(form.sceneId) : null,
                    overviewId: form.overviewId ? Number(form.overviewId) : null,
                    markerLabel: form.markerLabel || null,
                    lat: form.lat ? Number(form.lat) : null,
                    lon: form.lon ? Number(form.lon) : null,
                    markerColor: form.markerColor || null,
                    fontColor: form.fontColor || null,
                    fontSize: form.fontSize || null,
                    startTime: form.startTime ? Number(form.startTime) : null,
                    endTime: form.endTime ? Number(form.endTime) : null,
                    interactiveId: form.interactiveId ? Number(form.interactiveId) : null,
                    interactiveHighlightId: form.interactiveHighlightId ? Number(form.interactiveHighlightId) : null,
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
            {(() => {
              if (modal.field === 'lat') {
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
                    <label>Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={modal.fields?.lat ?? ''}
                      onChange={(e) => updateModalField('lat', e.target.value)}
                    />
                    <label>Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={modal.fields?.lon ?? ''}
                      onChange={(e) => updateModalField('lon', e.target.value)}
                    />
                  </div>
                );
              }

              if (modal.field === 'markerColor') {
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
                    <label>Marker Color</label>
                    <input
                      value={modal.fields?.markerColor ?? ''}
                      onChange={(e) => updateModalField('markerColor', e.target.value)}
                    />
                    <label>Font Color</label>
                    <input
                      value={modal.fields?.fontColor ?? ''}
                      onChange={(e) => updateModalField('fontColor', e.target.value)}
                    />
                  </div>
                );
              }

              if (modal.field === 'startTime') {
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
                    <label>Start Time</label>
                    <input
                      type="number"
                      step="any"
                      value={modal.fields?.startTime ?? ''}
                      onChange={(e) => updateModalField('startTime', e.target.value)}
                    />
                    <label>End Time</label>
                    <input
                      type="number"
                      step="any"
                      value={modal.fields?.endTime ?? ''}
                      onChange={(e) => updateModalField('endTime', e.target.value)}
                    />
                  </div>
                );
              }

              if (modal.field === 'interactiveId') {
                const interactiveValue = modal.fields?.interactiveId ?? '';
                const highlightValue = modal.fields?.interactiveHighlightId ?? '';
                const availableHighlights = interactiveValue
                  ? highlights.filter((h) => String(h.interactiveId ?? '') === interactiveValue)
                  : highlights;
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
                    <label>Interactive</label>
                    <select
                      value={interactiveValue}
                      onChange={(e) => {
                        const nextInteractive = e.target.value;
                        setModal((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            fields: {
                              ...(prev.fields || {}),
                              interactiveId: nextInteractive,
                              interactiveHighlightId: '',
                            },
                          };
                        });
                      }}
                    >
                      <option value="">None</option>
                      {interactives.map((i) => (
                        <option key={i.id} value={String(i.id)}>
                          {`Interactive #${i.id}`}{i.sceneSequence ? ` – Scene ${i.sceneSequence}` : ''}
                        </option>
                      ))}
                    </select>
                    <label>Highlight</label>
                    <select
                      value={highlightValue}
                      onChange={(e) => updateModalField('interactiveHighlightId', e.target.value)}
                    >
                      <option value="">None</option>
                      {availableHighlights.map((h) => (
                        <option key={h.id} value={String(h.id)}>
                          {`Highlight #${h.id}`}
                          {h.sceneSequence ? ` – Scene ${h.sceneSequence}` : ''}
                          {h.popupTitle ? ` – ${h.popupTitle}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <input
                  style={{ width: '100%' }}
                  value={modal.value ?? ''}
                  onChange={(e) => setModal((prev) => (prev ? { ...prev, value: e.target.value } : prev))}
                />
              );
            })()}
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={async () => {
                if (!modal?.id) return;
                try {
                  await ensureSignedIn();
                  if (modal.field === 'lat') {
                    const latValue = modal.fields?.lat ?? '';
                    const lonValue = modal.fields?.lon ?? '';
                    await api.put(`/markers/${modal.id}`, {
                      lat: latValue.trim() === '' ? null : Number(latValue),
                      lon: lonValue.trim() === '' ? null : Number(lonValue),
                    });
                  } else if (modal.field === 'markerColor') {
                    const markerColor = (modal.fields?.markerColor ?? '').trim();
                    const fontColor = (modal.fields?.fontColor ?? '').trim();
                    await api.put(`/markers/${modal.id}`, {
                      markerColor: markerColor || null,
                      fontColor: fontColor || null,
                    });
                  } else if (modal.field === 'startTime') {
                    const startValue = modal.fields?.startTime ?? '';
                    const endValue = modal.fields?.endTime ?? '';
                    await api.put(`/markers/${modal.id}`, {
                      startTime: startValue.trim() === '' ? null : Number(startValue),
                      endTime: endValue.trim() === '' ? null : Number(endValue),
                    });
                  } else if (modal.field === 'interactiveId') {
                    const interactiveValue = (modal.fields?.interactiveId ?? '').trim();
                    const highlightValue = (modal.fields?.interactiveHighlightId ?? '').trim();
                    await api.put(`/markers/${modal.id}`, {
                      interactiveId: interactiveValue === '' ? null : Number(interactiveValue),
                      interactiveHighlightId: highlightValue === '' ? null : Number(highlightValue),
                    });
                  } else {
                    const val = (modal.value ?? '').trim();
                    await api.put(`/markers/${modal.id}`, { [modal.field]: val === '' ? null : val });
                  }
                  setModal(null); load();
                } catch {}
              }}>Save</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Delete Marker"
        message="Are you sure you want to delete this marker? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => { const idToDelete = confirm.id; setConfirm({ open: false }); if (!idToDelete) return; try { await ensureSignedIn(); await api.delete(`/markers/${idToDelete}`); load(); } catch {} }}
      />
    </main>
  );
}




