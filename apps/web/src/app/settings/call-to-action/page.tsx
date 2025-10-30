"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ensureSignedIn, api } from "../../../lib/api";
import { AddIcon, EditIcon, TrashIcon } from "../../../components/icons";
import { ConfirmDialog } from "../../../components/ConfirmDialog";

type CallToAction = {
  id: number;
  title: string | null;
  titleAlt: string | null;
  mainText: string | null;
  mainTextAlt: string | null;
  buttonLabel: string | null;
  buttonLabelAlt: string | null;
  link: string | null;
};

type FormState = {
  title: string;
  titleAlt: string;
  mainText: string;
  mainTextAlt: string;
  buttonLabel: string;
  buttonLabelAlt: string;
  link: string;
};

const emptyForm: FormState = {
  title: "",
  titleAlt: "",
  mainText: "",
  mainTextAlt: "",
  buttonLabel: "",
  buttonLabelAlt: "",
  link: "",
};

export default function SettingsCallToActionPage() {
  const [items, setItems] = useState<CallToAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [me, setMe] = useState<any | null>(null);
  const [modal, setModal] = useState<{
    mode: "add" | "edit";
    id?: number;
    form: FormState;
  } | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; title: string | null } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canEdit = useMemo(() => (me?.roles || []).some((r: string) => r === "Admin" || r === "Editor"), [me]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      const [meRes, ctaRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/settings/call-to-action"),
      ]);
      setMe(meRes.data || null);
      setItems(Array.isArray(ctaRes.data) ? ctaRes.data : []);
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unable to load call-to-action settings.";
      setError(`Failed to load (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setModalError(null);
    setModal({ mode: "add", form: { ...emptyForm } });
  }

  function openEdit(item: CallToAction) {
    setModalError(null);
    setModal({
      mode: "edit",
      id: item.id,
      form: {
        title: item.title ?? "",
        titleAlt: item.titleAlt ?? "",
        mainText: item.mainText ?? "",
        mainTextAlt: item.mainTextAlt ?? "",
        buttonLabel: item.buttonLabel ?? "",
        buttonLabelAlt: item.buttonLabelAlt ?? "",
        link: item.link ?? "",
      },
    });
  }

  function normalizeForm(form: FormState) {
    const entries: Record<string, string | null> = {};
    (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
      const value = form[key];
      const trimmed = value.trim();
      entries[key] = trimmed.length ? trimmed : null;
    });
    return entries;
  }

  async function saveModal() {
    if (!modal) return;
    const { mode, id, form } = modal;
    const payload = normalizeForm(form);

    if (!payload.title) {
      setModalError("Title is required");
      return;
    }

    setSaving(true);
    setModalError(null);
    try {
      if (mode === "add") {
        await api.post("/settings/call-to-action", payload);
      } else if (mode === "edit" && id != null) {
        await api.put(`/settings/call-to-action/${id}`, payload);
      }
      setModal(null);
      load();
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unable to save.";
      setModalError(`Failed to save (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: number) {
    setError(null);
    try {
      await api.delete(`/settings/call-to-action/${id}`);
      setConfirmOpen(false);
      setConfirm(null);
      load();
    } catch (e: any) {
      const status = e?.response?.status;
      const message = e?.response?.data || e?.message || "Unable to delete.";
      setError(`Failed to delete CTA (${status ?? ""}) ${typeof message === "string" ? message : ""}`);
      setConfirmOpen(false);
      setConfirm(null);
    }
  }

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>📣 Call to Action Library</h2>
            <p style={{ maxWidth: 760, color: "var(--text-secondary)", margin: "8px 0 0" }}>
              Manage reusable prompts displayed across tapestries. Each entry defines messaging, localized text, and target links.
            </p>
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AddIcon size={18} /> New Call to Action
            </button>
          )}
        </div>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Tip: Assign CTAs per tapestry from the Publishing tab. Need a new CTA? Create it here first.
        </span>
      </header>

      {error && (
        <div style={{
          border: "1px solid #FCA5A5",
          background: "#FEF2F2",
          color: "#B91C1C",
          padding: "14px 18px",
          borderRadius: 10,
          fontSize: 14,
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--text-secondary)" }}>Loading call-to-action entries…</div>
      ) : items.length === 0 ? (
        <div style={{
          padding: 48,
          borderRadius: 12,
          border: "1px dashed var(--border)",
          background: "white",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}>
          <p style={{ marginBottom: 12 }}>No call-to-action entries yet.</p>
          {canEdit && (
            <button className="btn btn-primary" onClick={openAdd}>
              Create your first CTA
            </button>
          )}
        </div>
      ) : (
        <section style={{ display: "grid", gap: 16 }}>
          {items.map((item) => (
            <article
              key={item.id}
              className="section-card"
              style={{ padding: 24, borderRadius: 12, background: "white", boxShadow: "var(--shadow-sm)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    CTA #{item.id}
                  </div>
                  <h3 style={{ margin: "4px 0", fontSize: 22, fontWeight: 700 }}>{item.title || "Untitled"}</h3>
                  {item.titleAlt && (
                    <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>{item.titleAlt}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {canEdit && (
                    <>
                      <button
                        className="legacy-icon-btn"
                        title="Edit call to action"
                        onClick={() => openEdit(item)}
                      >
                        <EditIcon />
                      </button>
                      <button
                        className="legacy-icon-btn delete-btn"
                        title="Delete call to action"
                        onClick={() => {
                          setConfirm({ id: item.id, title: item.title });
                          setConfirmOpen(true);
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="detail-grid" style={{ marginTop: 20, gridTemplateColumns: "180px 1fr" }}>
                <label style={{ fontWeight: 600 }}>Main Text</label>
                <div>{item.mainText || <span className="legacy-muted">—</span>}</div>

                <label style={{ fontWeight: 600 }}>Alt Language Text</label>
                <div>{item.mainTextAlt || <span className="legacy-muted">—</span>}</div>

                <label style={{ fontWeight: 600 }}>Button Label</label>
                <div>{item.buttonLabel || <span className="legacy-muted">—</span>}</div>

                <label style={{ fontWeight: 600 }}>Button Label (Alt)</label>
                <div>{item.buttonLabelAlt || <span className="legacy-muted">—</span>}</div>

                <label style={{ fontWeight: 600 }}>Destination Link</label>
                <div>
                  {item.link ? (
                    <a className="legacy-link-like" href={item.link} target="_blank" rel="noreferrer">
                      {item.link}
                    </a>
                  ) : (
                    <span className="legacy-muted">—</span>
                  )}
                </div>
              </div>

              <footer style={{ marginTop: 20, fontSize: 13, color: "var(--text-muted)" }}>
                Assign this CTA via the <Link href="/settings">Global Settings</Link> or directly in a tapestry's Publishing tab.
              </footer>
            </article>
          ))}
        </section>
      )}

      {modal && (
        <div className="modal-backdrop" onClick={() => (!saving ? setModal(null) : undefined)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{modal.mode === "add" ? "Create Call to Action" : "Edit Call to Action"}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
              <label>Title *</label>
              <input
                value={modal.form.title}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, title: e.target.value } })}
                placeholder="Primary CTA title"
              />

              <label>Title (Alt)</label>
              <input
                value={modal.form.titleAlt}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, titleAlt: e.target.value } })}
                placeholder="Secondary language title"
              />

              <label>Main Text</label>
              <textarea
                rows={3}
                value={modal.form.mainText}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, mainText: e.target.value } })}
                placeholder="Supporting description or appeal"
              />

              <label>Main Text (Alt)</label>
              <textarea
                rows={3}
                value={modal.form.mainTextAlt}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, mainTextAlt: e.target.value } })}
                placeholder="Translated description"
              />

              <label>Button Label</label>
              <input
                value={modal.form.buttonLabel}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, buttonLabel: e.target.value } })}
                placeholder="Donate"
              />

              <label>Button Label (Alt)</label>
              <input
                value={modal.form.buttonLabelAlt}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, buttonLabelAlt: e.target.value } })}
                placeholder="Translated button text"
              />

              <label>Link</label>
              <input
                value={modal.form.link}
                onChange={(e) => setModal({ ...modal, form: { ...modal.form, link: e.target.value } })}
                placeholder="https://example.org/donate"
              />
            </div>
            {modalError && <div style={{ color: "crimson", marginTop: 12 }}>{modalError}</div>}
            <div className="modal-actions">
              <button className="btn" disabled={saving} onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" disabled={saving} onClick={saveModal}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete call to action?"
        message={`This will remove "${confirm?.title || (confirm ? `CTA #${confirm.id}` : "CTA")}" from the library.`}
        confirmText="Delete"
        onCancel={() => {
          setConfirmOpen(false);
          setConfirm(null);
        }}
        onConfirm={() => {
          if (confirm) confirmDelete(confirm.id);
        }}
      />
    </main>
  );
}

