"use client";
import { useEffect, useState } from "react";
import { api, ensureSignedIn, getSelectedTapestryId } from "../../lib/api";

export default function ScenesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedId = getSelectedTapestryId();

  async function load() {
    if (!selectedId) {
      setError("No tapestry selected. Visit a Tapestry detail page first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ensureSignedIn();
      // The API returns scenes only when fetching a single tapestry with include: { scenes: true }
      const res = await api.get(`/tapestries/${selectedId}`);
      const tapestry = res.data as any;
      setItems(Array.isArray(tapestry.scenes) ? tapestry.scenes : []);
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
  }, [selectedId]);

  return (
    <main style={{ padding: 24 }}>
      <h1>Scenes {selectedId ? `(Tapestry #${selectedId})` : ``}</h1>
      {loading && <p>Loading…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      {items.length > 0 && (
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 12px' }}>ID</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 12px' }}>Sequence</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 12px' }}>Title</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 12px' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id}>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 12px' }}>{s.id}</td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 12px' }}>{s.sequence || ''}</td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 12px' }}>{s.title || ''}</td>
                  <td style={{ borderBottom: '1px solid #f3f4f6', padding: '8px 12px', maxWidth: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.description || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}







