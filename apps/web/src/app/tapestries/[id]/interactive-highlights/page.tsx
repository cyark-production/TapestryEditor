"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ensureSignedIn, resolveLanguageName } from "../../../../lib/api";
import { AddIcon, EditIcon, TrashIcon, ToggleIcon } from "../../../../components/icons";
import { FileLink } from "../../../../components/FileLink";
import { AudioPreview } from "../../../../components/AudioPreview";
import { VideoPreview } from "../../../../components/VideoPreview";
import { ConfirmDialog } from "../../../../components/ConfirmDialog";
import { CcEditor } from "../../../../components/CcEditor";

type HighlightForm = {
  interactiveId: string;
  highlightThumbnail: string;
  sketchfabMaterialId: string;
  sketchfabModelId: string;
  iconType: string;
  interactiveType: string;
  popupTitle: string;
  popupTitleAltLang: string;
  popupText: string;
  popupTextAltLang: string;
  popupMediaLink: string;
  popupMediaType: string;
  popupMediaAltDesc: string;
  popupVideoCc1: string;
  popupVideoCc2: string;
  popupAudioLink: string;
  cameraPosition: string;
  cameraTarget: string;
  cameraFov: string;
  depthOfField: string;
  instantMove: boolean;
};

const VIDEO_EXTENSIONS = ["mp4", "mov", "m4v", "webm", "ogg", "ogv"];

function isVideoLink(mediaType?: string | null, url?: string | null): boolean {
  if (mediaType && mediaType.toLowerCase().includes("video")) return true;
  if (!url) return false;
  const candidate = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url.split("?")[0];
    }
  })();
  const ext = candidate.split(".").pop()?.toLowerCase();
  return !!ext && VIDEO_EXTENSIONS.includes(ext);
}

const defaultForm: HighlightForm = {
  interactiveId: "",
  highlightThumbnail: "",
  sketchfabMaterialId: "",
  sketchfabModelId: "",
  iconType: "",
  interactiveType: "",
  popupTitle: "",
  popupTitleAltLang: "",
  popupText: "",
  popupTextAltLang: "",
  popupMediaLink: "",
  popupMediaType: "",
  popupMediaAltDesc: "",
  popupVideoCc1: "",
  popupVideoCc2: "",
  popupAudioLink: "",
  cameraPosition: "",
  cameraTarget: "",
  cameraFov: "",
  depthOfField: "",
  instantMove: false,
};

const numericFields = new Set(["iconType", "interactiveType", "cameraFov", "depthOfField"]);
const multilineFields = new Set(["popupText", "popupTextAltLang"]);

export default function InteractiveHighlightsPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [items, setItems] = useState<any[]>([]);
  const [interactives, setInteractives] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang2, setLang2] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<HighlightForm>(defaultForm);
  const [modal, setModal] = useState<{ id: number; field: string; label: string; value: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ open: boolean; id?: number }>({ open: false });

  const canEdit = (me?.roles || []).some((r: string) => r === "Admin" || r === "Editor");

  function isExpandedRow(highlightId: number) {
    return !!expanded[highlightId];
  }

  function toggleExpand(highlightId: number) {
    setExpanded((prev) => ({ ...prev, [highlightId]: !prev[highlightId] }));
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, highlightsRes, interactivesRes, tapestryRes] = await Promise.all([
        api.get("/auth/me"),
        api.get(`/tapestries/${id}/interactive-highlights`),
        api.get(`/tapestries/${id}/interactives`),
        api.get(`/tapestries/${id}`),
      ]);
      setMe(meRes.data || null);
      setItems(Array.isArray(highlightsRes.data) ? highlightsRes.data : []);
      setInteractives(Array.isArray(interactivesRes.data) ? interactivesRes.data : []);
      const langCode = (tapestryRes.data?.audioLanguage2 as string | undefined) || "";
      const resolved = await resolveLanguageName(langCode);
      setLang2(resolved && resolved.trim() !== "" ? resolved : null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <main style={{ padding: 24 }}>
      <h2>Interactive Highlights</h2>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {canEdit && (
        <div style={{ marginTop: 12 }}>
          <button
            className="legacy-icon-btn add-btn"
            onClick={() => {
              setForm(defaultForm);
              setAddOpen(true);
            }}
          >
            <AddIcon /> Add Interactive Highlight
          </button>
        </div>
      )}

      {items.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <table className="legacy-table">
            <thead>
              <tr>
                <th className="legacy-th" style={{ width: "40px" }}></th>
                <th className="legacy-th" style={{ width: "70px" }}>ID</th>
                <th className="legacy-th" style={{ width: "20%" }}>Interactive</th>
                <th className="legacy-th" style={{ width: "18%" }}>Popup Title</th>
                <th className="legacy-th" style={{ width: "24%" }}>Popup Text</th>
                <th className="legacy-th" style={{ width: "18%" }}>Media</th>
                <th className="legacy-th" style={{ width: "120px" }}>Thumbnail</th>
                <th className="legacy-th" style={{ width: "80px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <Fragment key={h.id}>
                  <tr>
                    <td className="legacy-td" style={{ textAlign: "center" }}>
                      <button
                        className="legacy-icon-btn"
                        title={isExpandedRow(h.id) ? "Collapse" : "Expand"}
                        onClick={() => toggleExpand(h.id)}
                      >
                        {isExpandedRow(h.id) ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="legacy-td col-id">{h.id}</td>
                    <td className="legacy-td">
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={{ fontWeight: 600 }}>Scene {h.sceneSequence || ""}</span>
                        {h.sceneTitle && <span className="legacy-muted" style={{ fontSize: 12 }}>{h.sceneTitle}</span>}
                        <span className="legacy-muted" style={{ fontSize: 12 }}>Interactive #{h.interactiveId}</span>
                      </div>
                      {canEdit && (
                        <button
                          className="legacy-icon-btn edit-btn"
                          title="Change interactive"
                          onClick={() => setModal({ id: h.id, field: "interactiveId", label: "Interactive", value: h.interactiveId != null ? String(h.interactiveId) : "" })}
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                    <td className="legacy-td" style={{ maxWidth: 220 }}>
                      <span className="legacy-clamp">{h.popupTitle || ""}</span>
                      {canEdit && (
                        <button
                          className="legacy-icon-btn edit-btn"
                          title="Edit popup title"
                          onClick={() => setModal({ id: h.id, field: "popupTitle", label: "Popup Title", value: h.popupTitle || "" })}
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                    <td className="legacy-td" style={{ maxWidth: 260 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span className="legacy-clamp">{h.popupText || <span className="legacy-muted">—</span>}</span>
                      </div>
                      {canEdit && (
                        <button
                          className="legacy-icon-btn edit-btn"
                          title="Edit popup text"
                          onClick={() => setModal({ id: h.id, field: "popupText", label: "Popup Text", value: h.popupText || "" })}
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                    <td className="legacy-td">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <FileLink url={h.popupMediaLink} />
                        {isVideoLink(h.popupMediaType, h.popupMediaLink) && (
                          <VideoPreview url={h.popupMediaLink} width={560} />
                        )}
                      </div>
                      {canEdit && (
                        <button
                          className="legacy-icon-btn edit-btn"
                          title="Edit media link"
                          onClick={() => setModal({ id: h.id, field: "popupMediaLink", label: "Popup Media URL", value: h.popupMediaLink || "" })}
                        >
                          <EditIcon />
                        </button>
                      )}
                    </td>
                    <td className="legacy-td">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {h.highlightThumbnail ? (
                          <img
                            src={h.highlightThumbnail}
                            alt={h.popupTitle || `Highlight ${h.id}`}
                            style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                          />
                        ) : (
                          <span className="legacy-muted">No thumbnail</span>
                        )}
                        {canEdit && (
                          <button
                            className="legacy-icon-btn edit-btn"
                            title="Edit highlight thumbnail"
                            onClick={() => setModal({ id: h.id, field: "highlightThumbnail", label: "Highlight Thumbnail", value: h.highlightThumbnail || "" })}
                          >
                            <EditIcon />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="legacy-td col-actions legacy-row-actions">
                      {canEdit && (
                        <button className="legacy-icon-btn delete-btn" title="Delete highlight" onClick={() => setConfirm({ open: true, id: h.id })}><TrashIcon /></button>
                      )}
                    </td>
                  </tr>
                  {lang2 && (
                    <tr>
                      <td className="legacy-td" style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>{lang2}</td>
                      <td className="legacy-td col-id legacy-muted"></td>
                      <td className="legacy-td legacy-muted" style={{ fontStyle: "italic" }}>—</td>
                      <td className="legacy-td" style={{ maxWidth: 220 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className="legacy-muted" style={{ fontSize: 12 }}>{`Popup Title (${lang2})`}</span>
                          <span className="legacy-clamp">{h.popupTitleAltLang || <span className="legacy-muted">—</span>}</span>
                        </div>
                        {canEdit && (
                          <button className="legacy-icon-btn edit-btn" title={`Edit popup title (${lang2})`} onClick={() => setModal({ id: h.id, field: "popupTitleAltLang", label: `Popup Title (${lang2})`, value: h.popupTitleAltLang || "" })}><EditIcon /></button>
                        )}
                      </td>
                      <td className="legacy-td" style={{ maxWidth: 260 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span className="legacy-muted" style={{ fontSize: 12 }}>{`Popup Text (${lang2})`}</span>
                          <span className="legacy-clamp">{h.popupTextAltLang || <span className="legacy-muted">—</span>}</span>
                        </div>
                        {canEdit && (
                          <button className="legacy-icon-btn edit-btn" title={`Edit popup text (${lang2})`} onClick={() => setModal({ id: h.id, field: "popupTextAltLang", label: `Popup Text (${lang2})`, value: h.popupTextAltLang || "" })}><EditIcon /></button>
                        )}
                      </td>
                      <td className="legacy-td"></td>
                      <td className="legacy-td"></td>
                      <td className="legacy-td"></td>
                    </tr>
                  )}
                  {isExpandedRow(h.id) && (
                    <tr>
                      <td className="legacy-td" colSpan={8}>
                        <div className="card" style={{ padding: 16, background: "#fafafa" }}>
                          <div className="legacy-section-header" style={{ marginTop: 0 }}>Details</div>
                          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr auto", columnGap: 12, rowGap: 8 }}>
                            <label>Highlight Thumbnail</label>
                            <div><FileLink url={h.highlightThumbnail} /></div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit highlight thumbnail" onClick={() => setModal({ id: h.id, field: "highlightThumbnail", label: "Highlight Thumbnail", value: h.highlightThumbnail || "" })}><EditIcon /></button>)}

                            <label>Sketchfab Material</label>
                            <div>{h.sketchfabMaterialId || <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit material" onClick={() => setModal({ id: h.id, field: "sketchfabMaterialId", label: "Sketchfab Material ID", value: h.sketchfabMaterialId || "" })}><EditIcon /></button>)}

                            <label>Sketchfab Model</label>
                            <div>{h.sketchfabModelId || <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit model" onClick={() => setModal({ id: h.id, field: "sketchfabModelId", label: "Sketchfab Model ID", value: h.sketchfabModelId || "" })}><EditIcon /></button>)}

                            <label>Icon Type</label>
                            <div>{h.iconType ?? <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit icon type" onClick={() => setModal({ id: h.id, field: "iconType", label: "Icon Type", value: h.iconType != null ? String(h.iconType) : "" })}><EditIcon /></button>)}

                            <label>Interactive Type</label>
                            <div>{h.interactiveType ?? <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit interactive type" onClick={() => setModal({ id: h.id, field: "interactiveType", label: "Interactive Type", value: h.interactiveType != null ? String(h.interactiveType) : "" })}><EditIcon /></button>)}

                            <label>Popup Text</label>
                            <div style={{ whiteSpace: "pre-wrap" }}>{h.popupText || <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit popup text" onClick={() => setModal({ id: h.id, field: "popupText", label: "Popup Text", value: h.popupText || "" })}><EditIcon /></button>)}

                            {lang2 && (
                              <>
                                <label>{`Popup Text (${lang2})`}</label>
                                <div style={{ whiteSpace: "pre-wrap" }}>{h.popupTextAltLang || <span className="legacy-muted">—</span>}</div>
                                {canEdit && (<button className="legacy-icon-btn edit-btn" title={`Edit popup text (${lang2})`} onClick={() => setModal({ id: h.id, field: "popupTextAltLang", label: `Popup Text (${lang2})`, value: h.popupTextAltLang || "" })}><EditIcon /></button>)}
                              </>
                            )}

                            <label>Popup Media Type</label>
                            <div>{h.popupMediaType || <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit media type" onClick={() => setModal({ id: h.id, field: "popupMediaType", label: "Popup Media Type", value: h.popupMediaType || "" })}><EditIcon /></button>)}

                            <label>Popup Media URL</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <FileLink url={h.popupMediaLink} />
                              {isVideoLink(h.popupMediaType, h.popupMediaLink) && (
                                <VideoPreview url={h.popupMediaLink} width={560} />
                              )}
                            </div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit media link" onClick={() => setModal({ id: h.id, field: "popupMediaLink", label: "Popup Media URL", value: h.popupMediaLink || "" })}><EditIcon /></button>)}

                            <label>Popup Media Alt Desc</label>
                            <div>{h.popupMediaAltDesc || <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit media alt description" onClick={() => setModal({ id: h.id, field: "popupMediaAltDesc", label: "Popup Media Alt Description", value: h.popupMediaAltDesc || "" })}><EditIcon /></button>)}

                            <label>Popup Audio Link</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <FileLink url={h.popupAudioLink} />
                              <AudioPreview url={h.popupAudioLink} width={180} />
                            </div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit audio link" onClick={() => setModal({ id: h.id, field: "popupAudioLink", label: "Popup Audio URL", value: h.popupAudioLink || "" })}><EditIcon /></button>)}

                            <label>Camera Position</label>
                            <div>{h.cameraPosition || <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit camera position" onClick={() => setModal({ id: h.id, field: "cameraPosition", label: "Camera Position", value: h.cameraPosition || "" })}><EditIcon /></button>)}

                            <label>Camera Target</label>
                            <div>{h.cameraTarget || <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit camera target" onClick={() => setModal({ id: h.id, field: "cameraTarget", label: "Camera Target", value: h.cameraTarget || "" })}><EditIcon /></button>)}

                            <label>Camera FOV</label>
                            <div>{h.cameraFov ?? <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit camera FOV" onClick={() => setModal({ id: h.id, field: "cameraFov", label: "Camera FOV", value: h.cameraFov != null ? String(h.cameraFov) : "" })}><EditIcon /></button>)}

                            <label>Depth of Field</label>
                            <div>{h.depthOfField ?? <span className="legacy-muted">—</span>}</div>
                            {canEdit && (<button className="legacy-icon-btn edit-btn" title="Edit depth of field" onClick={() => setModal({ id: h.id, field: "depthOfField", label: "Depth of Field", value: h.depthOfField != null ? String(h.depthOfField) : "" })}><EditIcon /></button>)}

                            <label>Instant Move</label>
                            <div>{h.instantMove ? "On" : "Off"}</div>
                            {canEdit && (
                              <button
                                className="legacy-icon-btn edit-btn"
                                title="Toggle instant move"
                                onClick={async () => {
                                  try {
                                    await ensureSignedIn();
                                    await api.put(`/interactive-highlights/${h.id}`, { instantMove: !h.instantMove });
                                    load();
                                  } catch {}
                                }}
                              >
                                <ToggleIcon on={!!h.instantMove} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ marginTop: 16 }}>No interactive highlights found.</p>
      )}

      {addOpen && (
        <div className="modal-backdrop" onClick={() => setAddOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add Interactive Highlight</h3>
            <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Interactive</label>
                  <select value={form.interactiveId} onChange={(e) => setForm({ ...form, interactiveId: e.target.value })}>
                    <option value="">Select an interactive…</option>
                    {interactives.map((i) => (
                      <option key={i.id} value={String(i.id)}>
                        Scene {i.sceneSequence || i.id} – Interactive #{i.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Highlight Thumbnail</label>
                  <input value={form.highlightThumbnail} onChange={(e) => setForm({ ...form, highlightThumbnail: e.target.value })} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Popup Title</label>
                  <input value={form.popupTitle} onChange={(e) => setForm({ ...form, popupTitle: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Popup Media URL</label>
                  <input value={form.popupMediaLink} onChange={(e) => setForm({ ...form, popupMediaLink: e.target.value })} />
                </div>

                {lang2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label>{`Popup Title (${lang2})`}</label>
                    <input value={form.popupTitleAltLang} onChange={(e) => setForm({ ...form, popupTitleAltLang: e.target.value })} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Popup Media Type</label>
                  <input value={form.popupMediaType} onChange={(e) => setForm({ ...form, popupMediaType: e.target.value })} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Popup Video CC 1</label>
                  <input value={form.popupVideoCc1} onChange={(e) => setForm({ ...form, popupVideoCc1: e.target.value })} />
                </div>
                {lang2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label>{`Popup Video CC 2 (${lang2})`}</label>
                    <input value={form.popupVideoCc2} onChange={(e) => setForm({ ...form, popupVideoCc2: e.target.value })} />
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Sketchfab Material ID</label>
                  <input value={form.sketchfabMaterialId} onChange={(e) => setForm({ ...form, sketchfabMaterialId: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Sketchfab Model ID</label>
                  <input value={form.sketchfabModelId} onChange={(e) => setForm({ ...form, sketchfabModelId: e.target.value })} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Icon Type</label>
                  <input value={form.iconType} onChange={(e) => setForm({ ...form, iconType: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Interactive Type</label>
                  <input value={form.interactiveType} onChange={(e) => setForm({ ...form, interactiveType: e.target.value })} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                  <label>Popup Text</label>
                  <textarea rows={4} value={form.popupText} onChange={(e) => setForm({ ...form, popupText: e.target.value })} />
                </div>
                {lang2 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, gridColumn: "1 / -1" }}>
                    <label>{`Popup Text (${lang2})`}</label>
                    <textarea rows={4} value={form.popupTextAltLang} onChange={(e) => setForm({ ...form, popupTextAltLang: e.target.value })} />
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Popup Media Alt Desc</label>
                  <input value={form.popupMediaAltDesc} onChange={(e) => setForm({ ...form, popupMediaAltDesc: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Popup Audio URL</label>
                  <input value={form.popupAudioLink} onChange={(e) => setForm({ ...form, popupAudioLink: e.target.value })} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Camera Position</label>
                  <input value={form.cameraPosition} onChange={(e) => setForm({ ...form, cameraPosition: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Camera Target</label>
                  <input value={form.cameraTarget} onChange={(e) => setForm({ ...form, cameraTarget: e.target.value })} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Camera FOV</label>
                  <input value={form.cameraFov} onChange={(e) => setForm({ ...form, cameraFov: e.target.value })} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label>Depth of Field</label>
                  <input value={form.depthOfField} onChange={(e) => setForm({ ...form, depthOfField: e.target.value })} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label style={{ margin: 0 }}>Instant Move</label>
                  <input type="checkbox" checked={form.instantMove} onChange={(e) => setForm({ ...form, instantMove: e.target.checked })} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setAddOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                disabled={!id || !form.interactiveId}
                onClick={async () => {
                  if (!id) return;
                  try {
                    await ensureSignedIn();
                    const payload: Record<string, any> = {
                      interactiveId: Number(form.interactiveId),
                      highlightThumbnail: form.highlightThumbnail || null,
                      sketchfabMaterialId: form.sketchfabMaterialId || null,
                      sketchfabModelId: form.sketchfabModelId || null,
                      popupTitle: form.popupTitle || null,
                      popupTitleAltLang: form.popupTitleAltLang || null,
                      popupText: form.popupText || null,
                      popupTextAltLang: form.popupTextAltLang || null,
                      popupMediaLink: form.popupMediaLink || null,
                      popupMediaType: form.popupMediaType || null,
                      popupMediaAltDesc: form.popupMediaAltDesc || null,
                      popupVideoCc1: form.popupVideoCc1 || null,
                      popupVideoCc2: form.popupVideoCc2 || null,
                      popupAudioLink: form.popupAudioLink || null,
                      cameraPosition: form.cameraPosition || null,
                      cameraTarget: form.cameraTarget || null,
                      cameraFov: form.cameraFov ? Number(form.cameraFov) : null,
                      depthOfField: form.depthOfField ? Number(form.depthOfField) : null,
                      instantMove: form.instantMove,
                      iconType: form.iconType ? Number(form.iconType) : null,
                      interactiveType: form.interactiveType ? Number(form.interactiveType) : null,
                    };
                    await api.post(`/tapestries/${id}/interactive-highlights`, payload);
                    setAddOpen(false);
                    setForm(defaultForm);
                    load();
                  } catch (e: any) {
                    const status = e?.response?.status;
                    const message = e?.response?.data || e?.message || "Unknown error";
                    setError(`Failed to add highlight (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
                  }
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && modal.label?.startsWith("Edit Popup CC") ? (
        <CcEditor open={true} url={modal.value} label={modal.label} onClose={() => setModal(null)} />
      ) : null}

      {modal && !modal.label?.startsWith("Edit Popup CC") && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal.label}</h3>
            {modal.field === "interactiveId" ? (
              <select value={modal.value} onChange={(e) => { setModal({ ...modal, value: e.target.value }); setModalError(null); }}>
                <option value="">Select an interactive…</option>
                {interactives.map((i) => (
                  <option key={i.id} value={String(i.id)}>
                    Scene {i.sceneSequence || i.id} – Interactive #{i.id}
                  </option>
                ))}
              </select>
            ) : multilineFields.has(modal.field) ? (
              <textarea
                rows={6}
                value={modal.value}
                onChange={(e) => {
                  setModal({ ...modal, value: e.target.value });
                  setModalError(null);
                }}
                style={{ width: "100%" }}
              />
            ) : (
              <input
                style={{ width: "100%" }}
                value={modal.value}
                onChange={(e) => {
                  setModal({ ...modal, value: e.target.value });
                  setModalError(null);
                }}
              />
            )}
            {modalError && <div style={{ color: "crimson", marginTop: 8 }}>{modalError}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  if (!modal) return;
                  try {
                    await ensureSignedIn();
                    const payload: Record<string, any> = {};
                    if (modal.field === "interactiveId") {
                      payload.interactiveId = modal.value.trim() === "" ? null : Number(modal.value);
                    } else if (numericFields.has(modal.field)) {
                      payload[modal.field] = modal.value.trim() === "" ? null : Number(modal.value);
                    } else {
                      payload[modal.field] = modal.value.trim() === "" ? null : modal.value;
                    }
                    await api.put(`/interactive-highlights/${modal.id}`, payload);
                    setModal(null);
                    load();
                  } catch (e: any) {
                    const status = e?.response?.status;
                    const message = e?.response?.data || e?.message || "Unknown error";
                    setModalError(`Failed to save (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
                  }
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Delete Interactive Highlight"
        message="Are you sure you want to delete this interactive highlight? This action cannot be undone."
        confirmText="Delete"
        onCancel={() => setConfirm({ open: false })}
        onConfirm={async () => {
          const idToDelete = confirm.id;
          setConfirm({ open: false });
          if (!idToDelete) return;
          try {
            await ensureSignedIn();
            await api.delete(`/interactive-highlights/${idToDelete}`);
            load();
          } catch (e: any) {
            const status = e?.response?.status;
            if (status === 403) {
              setError("You do not have permission to delete interactive highlights.");
            } else {
              const message = e?.response?.data || e?.message || "Unknown error";
              setError(`Failed to delete interactive highlight (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
            }
          }
        }}
      />
    </main>
  );
}


