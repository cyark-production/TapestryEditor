"use client";
import { useEffect, useState } from "react";
import { api, ensureSignedIn } from "../lib/api";
import { toOriginBlobUrl } from "../lib/blob";

export function CcEditor({ open, url, label, onClose, onSaved }: {
  open: boolean;
  url: string;
  label?: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [sasUrl, setSasUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true); setError(null); setValue(""); setSasUrl(null);
      try {
        await ensureSignedIn();
        const origin = toOriginBlobUrl(url);
        const { data } = await api.get("/blobs/sas", { params: { url: origin } });
        const sas = String(data?.sasUrl || "");
        if (!sas) throw new Error("Failed to get SAS URL");
        setSasUrl(sas);
        const text = await fetch(sas, { cache: "no-store" }).then(r => r.text());
        setValue(text);
      } catch (e: any) {
        setError(e?.message || "Failed to load CC text");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, url]);

  async function save() {
    if (!sasUrl) return;
    setSaving(true); setError(null);
    try {
      const contentType = url.toLowerCase().endsWith(".vtt") ? "text/vtt" : "text/plain";
      const resp = await fetch(sasUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": contentType,
          "Cache-Control": "no-cache"
        },
        body: new Blob([value], { type: contentType })
      });
      if (!resp.ok) throw new Error(`Save failed (${resp.status})`);
      onClose();
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || "Failed to save CC text");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: 820, width: "96%" }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{label || "Closed Captions"}</h3>
        {loading ? (
          <p className="loading">Loading…</p>
        ) : (
          <>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              style={{
                width: "100%",
                minHeight: 320,
                fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace',
                fontSize: 13,
                lineHeight: 1.5,
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 8,
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                resize: "vertical"
              }}
            />
            {error && <div className="error" style={{ marginTop: 8 }}>{error}</div>}
            <div className="modal-actions">
              <button className="btn" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}



